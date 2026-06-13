/**
 * @brief Owns the user's authentication state and the auth-aware fetch helper.
 *
 * The access token lives only in memory; the long-lived refresh token is in
 * an httpOnly cookie that the backend reads through credentials: include.
 * This module is the single owner of the silent-refresh flow: apiFetch stays
 * a dumb HTTP client, and authFetch is the only place that attaches the Bearer
 * header, retries a 401, and reconciles the refreshed token into React state.
 */

import { createContext, useCallback, useEffect, useState, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthResponse } from "@KiwiClient/shared";
import { apiFetch, type ApiFetchOptions } from "../api/client";
import { useSelectedEmailStore } from "../store/selectedEmailStore";

interface AuthContextValue {
    name: string;
    email: string;
    accessToken: string | null;
    loading: boolean;
    login: (token: string, email: string, name: string) => void;
    logout: () => Promise<void>;
    authFetch: (endpoint: string, options?: ApiFetchOptions) => Promise<Response>;
}

export const AuthContext = createContext<AuthContextValue>(null!);

/**
 * @brief Exchanges the refresh cookie for a fresh access token.
 *
 * Returns null on every failure path so callers can treat "no session" and
 * "new token" uniformly without catching exceptions inside an effect.
 */
async function requestRefresh(): Promise<AuthResponse | null> {
    const response = await apiFetch("/api/refresh", { method: "POST" });
    const location = window.location;

    if (response.ok) {
        try {
            return (await response.json()) as AuthResponse;
        } catch {
            return null;
        }

    }

    const pathNamesToAlert = ["/mail"]

    if (location.pathname in pathNamesToAlert) {
        alert("Time to login again!");
    }

    return null;

}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const queryClient = useQueryClient();

    const accessTokenReference = useRef<string | null>(null);
    accessTokenReference.current = accessToken;

    // Holds the in-flight refresh so concurrent 401s share one request rather
    // than each firing their own and racing to overwrite the token.
    const refreshInFlightReference = useRef<Promise<AuthResponse | null> | null>(null);

    const applyIdentity = useCallback((auth: AuthResponse) => {
        if (auth.accessToken) {
            setAccessToken(auth.accessToken);
            accessTokenReference.current = auth.accessToken;
        }

        if (auth.email) {
            setEmail(auth.email);
        }

        if (auth.name) {
            setName(auth.name);
        }
    }, []);

    const refresh = useCallback((): Promise<AuthResponse | null> => {
        if (refreshInFlightReference.current) {
            return refreshInFlightReference.current;
        }

        const inFlight = requestRefresh()
            .then(auth => {
                if (auth) {
                    applyIdentity(auth);
                }
                return auth;
            })
            .finally(() => {
                refreshInFlightReference.current = null;
            });

        refreshInFlightReference.current = inFlight;
        return inFlight;
    }, [applyIdentity]);

    useEffect(() => {
        let cancelled = false;

        refresh().finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    }, [refresh]);

    const login = useCallback((token: string, userEmail: string, userName: string) => {
        applyIdentity({ success: true, accessToken: token, email: userEmail, name: userName });
    }, [applyIdentity]);

    /**
     * @brief Clears every trace of the session: token, identity, and cached data.
     *
     * Shared by the explicit logout and the failed-refresh path so a dead
     * session never leaves another account's emails in the query cache.
     */
    const clearSession = useCallback(() => {
        setAccessToken(null);
        accessTokenReference.current = null;
        setEmail("");
        useSelectedEmailStore.getState().clear();
        queryClient.clear();
    }, [queryClient]);

    const logout = useCallback(async () => {
        await apiFetch("/api/logout", { method: "POST" }).catch(() => undefined);
        clearSession();
    }, [clearSession]);

    /**
     * @brief Performs an API call with the current access token, retrying once on 401.
     *
     * Reads the token through a ref so each call sees the latest value even if
     * the token rotates between renders, and retries with the refreshed token
     * rather than the stale one that triggered the 401.
     */
    const authFetch = useCallback(async (endpoint: string, options: ApiFetchOptions = {}): Promise<Response> => {
        const initialResponse = await apiFetch(endpoint, { ...options, accessToken: accessTokenReference.current });

        if (initialResponse.status !== 401) {
            return initialResponse;
        }

        const refreshed = await refresh();
        if (!refreshed || !refreshed.accessToken) {
            clearSession();
            return initialResponse;
        }

        return apiFetch(endpoint, { ...options, accessToken: refreshed.accessToken });
    }, [refresh, clearSession]);

    return (
        <AuthContext value={{ name, email, accessToken, loading, login, logout, authFetch }}>
            {children}
        </AuthContext>
    );
}
