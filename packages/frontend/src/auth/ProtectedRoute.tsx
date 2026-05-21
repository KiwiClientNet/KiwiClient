/**
 * @brief Route wrapper that redirects unauthenticated users back to the login page.
 *
 * Renders the loading screen until the silent refresh has resolved so the
 * user is not redirected to the login page during the brief window in
 * which the access token is being recovered from the refresh cookie.
 */

import { useContext, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { MailboxPageLoading, StatusComponent } from "../components/Loading";

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { accessToken, loading } = useContext(AuthContext);

    if (loading) {
        return <MailboxPageLoading Status={<StatusComponent message="loading..." status="loading" />} />;
    }

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
