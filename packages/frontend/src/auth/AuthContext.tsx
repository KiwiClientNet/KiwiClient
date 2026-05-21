/**
 * @brief Holds the user's authentication state and exposes an authFetch helper.
 *
 * The access token lives only in memory; the long-lived refresh token is in
 * an httpOnly cookie that the backend reads through credentials: include.
 * authFetch wraps the raw apiFetch so callers do not need to attach the
 * Bearer header or handle the silent refresh on a 401 response.
 */

import { createContext, useCallback, useEffect, useState, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, type ApiFetchOptions } from "../api/client";
import { useSelectedEmailStore } from "../store/selectedEmailStore";

interface AuthContextValue {
    email: string;
    accessToken: string | null;
    loading: boolean;
    login: (token: string, email: string) => void;
    logout: () => Promise<void>;
    authFetch: (endpoint: string, options?: ApiFetchOptions) => Promise<Response>;
}

export const AuthContext = createContext<AuthContextValue>(null!);

interface RefreshResponse {
    success: boolean;
    accessToken?: string;
    email?: string;
}

/**
 * @brief Silently exchanges the refresh cookie for a fresh access token.
 *
 * Returns null on failure so callers can distinguish "no session" from "we
 * have a new token". Throws nothing because every failure path should
 * lead to a graceful logout, not an exception bubbling out of an effect.
 */
async function refreshAccessToken(): Promise<RefreshResponse | null> {
    const response = await apiFetch("/api/refresh", { method: "POST" });
    if (!response.ok) {
        return null;
    }

    try {
        return await response.json();
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const queryClient = useQueryClient();

    const accessTokenReference = useRef<string | null>(null);
    accessTokenReference.current = accessToken;

    useEffect(() => {
        let cancelled = false;

        refreshAccessToken().then(refreshed => {
            if (cancelled || !refreshed) {
                return;
            }

            if (refreshed.accessToken) {
                setAccessToken(refreshed.accessToken);
            }

            if (refreshed.email) {
                setEmail(refreshed.email);
            }
        }).finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    }, []);

    const login = useCallback((token: string, userEmail: string) => {
        setAccessToken(token);
        setEmail(userEmail);
    }, []);

    const logout = useCallback(async () => {
        await apiFetch("/api/logout", { method: "POST" }).catch(() => undefined);
        setAccessToken(null);
        setEmail("");
        useSelectedEmailStore.getState().clear();
        queryClient.clear();
    }, [queryClient]);

    /**
     * @brief Performs an API call with the current access token, retrying once on 401.
     *
     * Reads the token through a ref so each call sees the latest value even
     * if the token rotates between renders.
     */
    const authFetch = useCallback(async (endpoint: string, options: ApiFetchOptions = {}): Promise<Response> => {
        const initialResponse = await apiFetch(endpoint, { ...options, accessToken: accessTokenReference.current });

        if (initialResponse.status !== 401) {
            return initialResponse;
        }

        const refreshed = await refreshAccessToken();
        if (!refreshed || !refreshed.accessToken) {
            setAccessToken(null);
            setEmail("");
            return initialResponse;
        }

        setAccessToken(refreshed.accessToken);
        accessTokenReference.current = refreshed.accessToken;

        return apiFetch(endpoint, { ...options, accessToken: refreshed.accessToken });
    }, []);

    return (
        <AuthContext value={{ email, accessToken, loading, login, logout, authFetch }}>
            {children}
        </AuthContext>
    );
}
