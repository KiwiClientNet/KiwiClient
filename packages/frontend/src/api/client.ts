/**
 * @brief Low-level HTTP client for talking to the backend API.
 *
 * Owns nothing about authentication or retries; callers that need a Bearer
 * token or a retry-on-401 flow compose this function inside the auth layer.
 * Keeping it standalone lets unauthenticated endpoints such as login use the
 * same construction code as authenticated endpoints.
 */

import { refreshAccessToken } from "../auth/refresh";

type HttpMethod = "GET" | "POST" | "PATCH";

export interface ApiFetchOptions {
    method?: HttpMethod;
    queryParameters?: Record<string, string | number | boolean>;
    body?: unknown;
    accessToken?: string | null;
    signal?: AbortSignal;
}

/**
 * @brief Builds a query string from a record, coercing primitive values to strings.
 *
 * Returns an empty string when no parameters are supplied so callers can
 * concatenate the result unconditionally.
 */
function buildQueryString(queryParameters: Record<string, string | number | boolean> | undefined): string {
    if (!queryParameters) {
        return "";
    }

    const stringPairs = Object.entries(queryParameters).map(([key, value]) => [key, String(value)] as [string, string]);
    return `?${new URLSearchParams(stringPairs).toString()}`;
}

/**
 * @brief Sends a single HTTP request to the backend with optional auth and body.
 *
 * The endpoint is expected to start with a slash; the API base URL is
 * prepended unconditionally. JSON content-type is set on every request so
 * the backend can rely on Express body parsing.
 *
 * @param endpoint - The path segment of the request, beginning with a slash.
 * @param options - Method, query parameters, body, and optional bearer token.
 * @returns The Fetch Response with no implicit error handling.
 */
export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}): Promise<Response> {
    const queryString = buildQueryString(options.queryParameters);
    const method = options.method ?? "GET";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.accessToken) {
        headers.Authorization = `Bearer ${options.accessToken}`;
    }

    const requestInit: RequestInit = {
        method,
        credentials: "include",
        headers
    };

    if (options.body !== undefined && method !== "GET") {
        requestInit.body = JSON.stringify(options.body);
    }

    if (options.signal) {
        requestInit.signal = options.signal;
    }

    const path = `${endpoint}${queryString}`
    const firstAttempt = await fetch(path, requestInit);

    if (firstAttempt.status !== 401) {
        return firstAttempt;
    }

    try {
        await refreshAccessToken();
    } catch (error: any) {
        console.error(error);
        console.error("Session expired");
        return fetch("/api/logout", { method: "POST", credentials: "include" });
    }

    return fetch(path, requestInit);
}
