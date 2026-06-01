import type { AuthResponse } from "@KiwiClient/shared";

let refreshInFlight: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
    if (refreshInFlight) {
        return refreshInFlight;
    }

    refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
    })

    return refreshInFlight;
}

async function doRefresh(): Promise<string> {
    const response = await fetch("/api/refresh", { method: "POST", credentials: "include" });

    if (!response.ok) {
        throw new Error("Refresh failed");
    }

    const body = (await response.json()) as AuthResponse;

    if (!body.success || !body.accessToken) {
        throw new Error("Refresh failed");
    }

    return body.accessToken;
}
