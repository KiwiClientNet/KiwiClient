/**
 * @brief Singleton pool that reuses authenticated IMAP connections across requests.
 *
 * Establishing an IMAP connection is expensive and many servers rate-limit
 * fresh logins. The pool keys entries by server type and email so that any
 * route can ask for the user's already-warm connection. A periodic keepalive
 * pings each entry to detect dead sockets early; idle entries are evicted
 * after a fixed window to avoid leaking authenticated sessions.
 */

import { ImapInstance } from "./imap/client.js";
import type { ServerLoginBody, GoogleLoginBody } from "@KiwiClient/shared";
import { refreshGoogleAccessToken } from "./utils/google_token.js";

type LoginBody = ServerLoginBody | GoogleLoginBody;

interface PoolEntry {
    imapInstance: ImapInstance;
    lastUsed: number;
    loginBody: LoginBody;
    keepaliveTimer: NodeJS.Timeout;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS = 60 * 1000;

class ImapConnectionPool {
    private pool: Map<string, PoolEntry> = new Map();
    private pending: Map<string, Promise<ImapInstance>> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        this.cleanupInterval = setInterval(() => this.evictStale(), STALE_CHECK_INTERVAL_MS);
    }

    /**
     * @brief Builds the pool key from the login identity.
     *
     * The combination of server type and email is unique per user because
     * the same email could in theory be configured against multiple servers.
     */
    private makeKey(loginBody: LoginBody): string {
        return `${loginBody.serverType}:${loginBody.email}`;
    }

    /**
     * @brief Starts a periodic NOOP to keep the connection warm.
     *
     * Evicts the entry if the server stops responding to NOOP so callers do
     * not waste a request attempting to use a dead connection.
     */
    private startKeepalive(key: string, imapInstance: ImapInstance): NodeJS.Timeout {
        return setInterval(async () => {
            const entry = this.pool.get(key);
            if (!entry) {
                return;
            }

            const isAlive = await imapInstance.isAlive().catch(() => false);
            if (isAlive) {
                return;
            }

            clearInterval(entry.keepaliveTimer);
            this.pool.delete(key);
            console.warn(`[ImapPool] Keepalive failed, evicted`);
        }, KEEPALIVE_INTERVAL_MS);
    }

    /**
     * @brief Returns a live IMAP connection for the given login, opening one if needed.
     *
     * Deduplicates concurrent connect attempts by remembering the in-flight
     * promise per key so the IMAP server is not hit with two parallel logins.
     */
    async acquire(loginBody: LoginBody): Promise<ImapInstance> {
        const key = this.makeKey(loginBody);
        const existingEntry = this.pool.get(key);

        if (existingEntry) {
            const isAlive = await existingEntry.imapInstance.isAlive();

            if (isAlive) {
                existingEntry.lastUsed = Date.now();
                return existingEntry.imapInstance;
            }

            clearInterval(existingEntry.keepaliveTimer);
            this.pool.delete(key);
        }

        const inFlightConnection = this.pending.get(key);
        if (inFlightConnection) {
            return inFlightConnection;
        }

        const connectionPromise = this.connect(loginBody).finally(() => {
            this.pending.delete(key);
        });

        this.pending.set(key, connectionPromise);
        return connectionPromise;
    }

    /**
     * @brief Opens a new IMAP connection and stores it in the pool on success.
     *
     * Refreshes the Gmail access code before the IMAP login when a Google
     * refresh token is available, so a stored session that has aged past the
     * 1-hour access token expiry can still be used without re-authenticating.
     */
    private async connect(loginBody: LoginBody): Promise<ImapInstance> {
        const key = this.makeKey(loginBody);

        if (loginBody.serverType === "GMAIL" && loginBody.googleRefreshToken) {
            try {
                loginBody.accessCode = await refreshGoogleAccessToken(loginBody.googleRefreshToken);
            } catch {
                throw new Error("Gmail session expired - user must re-authenticate");
            }
        }

        const imapInstance = new ImapInstance();
        await imapInstance.loginToEmailServer(loginBody);

        const status = imapInstance.getStatus();
        if (status !== ImapInstance.Status.LOGGED_IN) {
            throw new Error(`IMAP login failed with status: ${status}`);
        }

        const keepaliveTimer = this.startKeepalive(key, imapInstance);
        this.pool.set(key, { imapInstance, lastUsed: Date.now(), loginBody, keepaliveTimer });

        return imapInstance;
    }

    /**
     * @brief Marks an entry as recently used so the idle timer restarts.
     */
    release(loginBody: LoginBody): void {
        const entry = this.pool.get(this.makeKey(loginBody));
        if (entry) {
            entry.lastUsed = Date.now();
        }
    }

    /**
     * @brief Immediately disconnects and removes the entry for the given login.
     *
     * Called on logout so the IMAP credentials do not linger in memory until
     * the idle eviction would have run.
     */
    async evict(loginBody: LoginBody): Promise<void> {
        const key = this.makeKey(loginBody);
        const entry = this.pool.get(key);
        if (!entry) {
            return;
        }

        clearInterval(entry.keepaliveTimer);
        await entry.imapInstance.logoutFromEmailServer().catch(() => { });
        this.pool.delete(key);
    }

    /**
     * @brief Disconnects any pool entry that has not been used recently.
     *
     * Runs on a fixed timer that is shorter than the idle threshold so that
     * an entry that becomes stale shortly after the previous cleanup tick
     * does not have to wait a full idle window before being removed.
     */
    private async evictStale(): Promise<void> {
        const nowMs = Date.now();
        for (const [key, entry] of this.pool.entries()) {
            if (nowMs - entry.lastUsed <= IDLE_TIMEOUT_MS) {
                continue;
            }

            clearInterval(entry.keepaliveTimer);
            await entry.imapInstance.logoutFromEmailServer().catch(() => { });
            this.pool.delete(key);
        }
    }
}

export const imapPool = new ImapConnectionPool();
