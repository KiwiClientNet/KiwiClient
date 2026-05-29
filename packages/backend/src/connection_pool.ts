/**
 * @brief Singleton pool that reuses authenticated IMAP connections across requests.
 *
 * Establishing an IMAP connection is expensive and many servers rate-limit
 * fresh logins. The pool keys entries by server type and email so that any
 * route can ask for the user's already-warm connection. A periodic keepalive
 * pings each entry to detect dead sockets early; idle entries are evicted
 * after a fixed window to avoid leaking authenticated sessions.
 *
 * Responsibilities are split: ImapConnectionFactory owns credential prep and
 * raw login, PendingConnections deduplicates concurrent opens, KeepaliveScheduler
 * runs the per-entry heartbeat, IdleEvictor sweeps stale entries, and
 * ImapConnectionPool wires them together and is the only thing routes import.
 */

import { ImapInstance } from "./imap/client.js";
import type { ServerLoginBody, GoogleLoginBody } from "@KiwiClient/shared";
import { refreshGoogleAccessToken } from "./utils/google_token.js";

type LoginBody = ServerLoginBody | GoogleLoginBody;

interface PoolEntry {
    imapInstance: ImapInstance;
    lastUsed: number;
    loginBody: LoginBody;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * @brief Pure key derivation: same (serverType, email) must hit the same entry.
 */
function makePoolKey(loginBody: LoginBody): string {
    return `${loginBody.serverType}:${loginBody.email}`;
}

/**
 * @brief Creates a logged-in ImapInstance for a given login.
 *
 * Exists as an interface so the pool can be unit-tested against a fake IMAP
 * server (Liskov-substitutable) without touching the network, and so future
 * auth backends (e.g. Microsoft OAuth) can be plugged in without editing the
 * pool (open/closed).
 */
interface ImapConnectionFactory {
    create(loginBody: LoginBody): Promise<ImapInstance>;
}

class DefaultImapConnectionFactory implements ImapConnectionFactory {
    async create(loginBody: LoginBody): Promise<ImapInstance> {
        const preparedLogin = await this.prepareCredentials(loginBody);
        const imapInstance = new ImapInstance();
        await imapInstance.loginToEmailServer(preparedLogin);

        const status = imapInstance.getStatus();
        if (status === ImapInstance.Status.LOGGED_IN) {
            return imapInstance;
        }

        throw new Error(`IMAP login failed: serverType=${preparedLogin.serverType} status=${ImapInstance.Status[status]}`);
    }

    /**
     * @brief Refreshes the Oauth access code before login when a refresh token is on hand.
     *
     * Returns the original login untouched for any path where no refresh is
     * possible — keeps the call site in create() free of branching.
     */
    private async prepareCredentials(loginBody: LoginBody): Promise<LoginBody> {
        if (loginBody.serverType !== "GMAIL") {
            return loginBody;
        }

        if (!loginBody.googleRefreshToken) {
            return loginBody;
        }

        try {
            const accessCode = await refreshGoogleAccessToken(loginBody.googleRefreshToken);
            return { ...loginBody, accessCode };
        } catch {
            throw new Error("Gmail session expired - user must re-authenticate");
        }
    }
}

/**
 * @brief Tracks in-flight connect promises so concurrent acquires share one login.
 */
class PendingConnections {
    private pending: Map<string, Promise<ImapInstance>> = new Map();

    get(key: string): Promise<ImapInstance> | undefined {
        return this.pending.get(key);
    }

    track(key: string, connectionPromise: Promise<ImapInstance>): Promise<ImapInstance> {
        const trackedPromise = connectionPromise.finally(() => this.pending.delete(key));
        this.pending.set(key, trackedPromise);
        return trackedPromise;
    }
}

/**
 * @brief Runs a NOOP heartbeat per entry; reports dead entries via the eviction callback.
 */
class KeepaliveScheduler {
    private timers: Map<string, NodeJS.Timeout> = new Map();

    constructor(private readonly intervalMs: number, private readonly onDead: (key: string) => Promise<void>) { }

    start(key: string, imapInstance: ImapInstance): void {
        const timer = setInterval(async () => {
            const isAlive = await imapInstance.isAlive().catch(() => false);
            if (isAlive) {
                return;
            }
            await this.onDead(key);
            console.warn(`[ImapPool] Keepalive failed, evicted ${key}`);
        }, this.intervalMs);
        this.timers.set(key, timer);
    }

    stop(key: string): void {
        const timer = this.timers.get(key);
        if (!timer) {
            return;
        }
        clearInterval(timer);
        this.timers.delete(key);
    }
}

/**
 * @brief Periodically sweeps entries that have not been touched within the idle window.
 */
class IdleEvictor {
    private readonly sweepTimer: NodeJS.Timeout;

    constructor(idleTimeoutMs: number, sweepIntervalMs: number, getEntries: () => IterableIterator<[string, PoolEntry]>, evictKey: (key: string) => Promise<void>) {
        this.sweepTimer = setInterval(async () => {
            const nowMs = Date.now();
            for (const [key, entry] of getEntries()) {
                if (nowMs - entry.lastUsed > idleTimeoutMs) {
                    await evictKey(key);
                }
            }
        }, sweepIntervalMs);
    }

    stop(): void {
        clearInterval(this.sweepTimer);
    }
}

class ImapConnectionPool {
    private readonly pool: Map<string, PoolEntry> = new Map();
    private readonly pending = new PendingConnections();
    private readonly factory: ImapConnectionFactory;
    private readonly keepalive: KeepaliveScheduler;
    private readonly idleEvictor: IdleEvictor;

    constructor(factory: ImapConnectionFactory = new DefaultImapConnectionFactory()) {
        this.factory = factory;
        this.keepalive = new KeepaliveScheduler(KEEPALIVE_INTERVAL_MS, (key) => this.evictByKey(key));
        this.idleEvictor = new IdleEvictor(IDLE_TIMEOUT_MS, STALE_CHECK_INTERVAL_MS, () => this.pool.entries(), (key) => this.evictByKey(key));
    }

    /**
     * @brief Returns a live IMAP connection for the given login, opening one if needed.
     *
     * Deduplicates concurrent connect attempts so the IMAP server is not hit
     * with two parallel logins for the same identity.
     */
    async acquire(loginBody: LoginBody): Promise<ImapInstance> {
        const key = makePoolKey(loginBody);
        const existingEntry = this.pool.get(key);
        const existingIsAlive = existingEntry ? await existingEntry.imapInstance.isAlive() : false;

        if (existingEntry && existingIsAlive) {
            existingEntry.lastUsed = Date.now();
            return existingEntry.imapInstance;
        }

        if (existingEntry) {
            await this.evictByKey(key);
        }

        const inFlightConnection = this.pending.get(key);
        if (inFlightConnection) {
            return inFlightConnection;
        }

        return this.pending.track(key, this.openAndStore(key, loginBody));
    }

    /**
     * @brief Marks an entry as recently used so the idle timer restarts.
     */
    release(loginBody: LoginBody): void {
        const entry = this.pool.get(makePoolKey(loginBody));
        if (!entry) {
            return;
        }
        entry.lastUsed = Date.now();
    }

    /**
     * @brief Immediately disconnects and removes the entry for the given login.
     */
    async evict(loginBody: LoginBody): Promise<void> {
        await this.evictByKey(makePoolKey(loginBody));
    }

    private async openAndStore(key: string, loginBody: LoginBody): Promise<ImapInstance> {
        const imapInstance = await this.factory.create(loginBody);
        this.pool.set(key, { imapInstance, lastUsed: Date.now(), loginBody });
        this.keepalive.start(key, imapInstance);
        return imapInstance;
    }

    private async evictByKey(key: string): Promise<void> {
        const entry = this.pool.get(key);
        if (!entry) {
            return;
        }
        this.keepalive.stop(key);
        this.pool.delete(key);
        await entry.imapInstance.logoutFromEmailServer().catch(() => { });
    }
}

export const imapPool = new ImapConnectionPool();
