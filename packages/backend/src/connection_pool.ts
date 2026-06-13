/**
 * @brief Singleton pools that reuse authenticated email connections across requests.
 *
 * Establishing an IMAP or SMTP connection is expensive and many servers
 * rate-limit fresh logins. Each pool keys entries by server type and email so
 * that any route can ask for the user's already-warm connection. A periodic
 * keepalive pings each entry to detect dead sockets early; idle entries are
 * evicted after a fixed window to avoid leaking authenticated sessions.
 *
 * Responsibilities are split: EmailClientConnectionFactory owns credential
 * prep and raw login, PendingConnections deduplicates concurrent opens,
 * KeepaliveScheduler runs the per-entry heartbeat, IdleEvictor sweeps stale
 * entries, and ConnectionPool wires them together. Routes import only the
 * imapPool and smtpPool singletons.
 */

import { ImapInstance } from "./imap/client.js";
import { SmtpInstance } from "./smtp/client.js";
import type { ServerLoginBody, GoogleLoginBody } from "@KiwiClient/shared";
import { refreshGoogleAccessToken } from "./utils/google_token.js";
import { ClientStatus, ConnectionLoginError } from "./utils/status.js";

type LoginBody = ServerLoginBody | GoogleLoginBody;

/**
 * @brief The lifecycle surface a client must expose for the pool to manage it.
 */
interface PoolableClient {
    loginToEmailServer(loginBody: LoginBody): Promise<ClientStatus>;
    logoutFromEmailServer(): Promise<boolean>;
    isAlive(): Promise<boolean>;
    getStatus(): ClientStatus;
}

interface PoolEntry<TClient extends PoolableClient> {
    clientInstance: TClient;
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
 * @brief Refreshes the OAuth access code before login when a refresh token is on hand.
 *
 * Returns the original login untouched for any path where no refresh is
 * possible — keeps the factory's create() free of branching.
 */
async function prepareCredentials(loginBody: LoginBody): Promise<LoginBody> {
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

/**
 * @brief Creates a logged-in client for a given login.
 *
 * Exists as an interface so the pool can be unit-tested against a fake email
 * server without touching the network, and so future auth backends can be
 * plugged in without editing the pool.
 */
interface ConnectionFactory<TClient extends PoolableClient> {
    create(loginBody: LoginBody): Promise<TClient>;
}

class EmailClientConnectionFactory<TClient extends PoolableClient> implements ConnectionFactory<TClient> {

    constructor(
        private readonly newClientInstance: () => TClient,
        private readonly protocolName: string
    ) { }

    async create(loginBody: LoginBody): Promise<TClient> {
        const preparedLogin = await prepareCredentials(loginBody);
        const clientInstance = this.newClientInstance();
        await clientInstance.loginToEmailServer(preparedLogin);

        const status = clientInstance.getStatus();
        if (status === ClientStatus.LOGGED_IN) {
            return clientInstance;
        }

        throw new ConnectionLoginError(status, this.protocolName, preparedLogin.serverType);
    }
}

/**
 * @brief Tracks in-flight connect promises so concurrent acquires share one login.
 */
class PendingConnections<TClient extends PoolableClient> {
    private pending: Map<string, Promise<TClient>> = new Map();

    get(key: string): Promise<TClient> | undefined {
        return this.pending.get(key);
    }

    track(key: string, connectionPromise: Promise<TClient>): Promise<TClient> {
        const trackedPromise = connectionPromise.finally(() => this.pending.delete(key));
        this.pending.set(key, trackedPromise);
        return trackedPromise;
    }
}

/**
 * @brief Runs a liveness heartbeat per entry; reports dead entries via the eviction callback.
 */
class KeepaliveScheduler {
    private timers: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        private readonly intervalMs: number,
        private readonly poolName: string,
        private readonly onDead: (key: string) => Promise<void>
    ) { }

    start(key: string, clientInstance: PoolableClient): void {
        const timer = setInterval(async () => {
            const isAlive = await clientInstance.isAlive().catch(() => false);
            if (isAlive) {
                return;
            }
            await this.onDead(key);
            console.warn(`[${this.poolName}] Keepalive failed, evicted ${key}`);
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

    constructor(idleTimeoutMs: number, sweepIntervalMs: number, getEntries: () => IterableIterator<[string, { lastUsed: number }]>, evictKey: (key: string) => Promise<void>) {
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

class ConnectionPool<TClient extends PoolableClient> {
    private readonly pool: Map<string, PoolEntry<TClient>> = new Map();
    private readonly pending = new PendingConnections<TClient>();
    private readonly factory: ConnectionFactory<TClient>;
    private readonly keepalive: KeepaliveScheduler;
    private readonly idleEvictor: IdleEvictor;

    constructor(factory: ConnectionFactory<TClient>, poolName: string) {
        this.factory = factory;
        this.keepalive = new KeepaliveScheduler(KEEPALIVE_INTERVAL_MS, poolName, (key) => this.evictByKey(key));
        this.idleEvictor = new IdleEvictor(IDLE_TIMEOUT_MS, STALE_CHECK_INTERVAL_MS, () => this.pool.entries(), (key) => this.evictByKey(key));
    }

    /**
     * @brief Returns a live connection for the given login, opening one if needed.
     *
     * Deduplicates concurrent connect attempts so the email server is not hit
     * with two parallel logins for the same identity.
     */
    async acquire(loginBody: LoginBody): Promise<TClient> {
        const key = makePoolKey(loginBody);
        const existingEntry = this.pool.get(key);
        const existingIsAlive = existingEntry ? await existingEntry.clientInstance.isAlive() : false;

        if (existingEntry && existingIsAlive) {
            existingEntry.lastUsed = Date.now();
            return existingEntry.clientInstance;
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

    private async openAndStore(key: string, loginBody: LoginBody): Promise<TClient> {
        const clientInstance = await this.factory.create(loginBody);
        this.pool.set(key, { clientInstance, lastUsed: Date.now(), loginBody });
        this.keepalive.start(key, clientInstance);
        return clientInstance;
    }

    private async evictByKey(key: string): Promise<void> {
        const entry = this.pool.get(key);
        if (!entry) {
            return;
        }
        this.keepalive.stop(key);
        this.pool.delete(key);
        await entry.clientInstance.logoutFromEmailServer().catch(() => { });
    }
}

export const imapPool = new ConnectionPool<ImapInstance>(new EmailClientConnectionFactory(() => new ImapInstance(), "IMAP"), "ImapPool");
export const smtpPool = new ConnectionPool<SmtpInstance>(new EmailClientConnectionFactory(() => new SmtpInstance(), "SMTP"), "SmtpPool");
