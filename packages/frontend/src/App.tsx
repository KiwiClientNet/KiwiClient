/**
 * @brief Top-level route definitions for the KiwiClient SPA.
 *
 * The React Query provider is mounted at the root in main.tsx so the auth
 * layer can read the query client and clear its cache on logout, which
 * prevents the previous user's mailbox data from briefly rendering when
 * a different account signs in.
 */

import { Route, Routes, Outlet } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./features/login/LoginPage";
import { MailboxPage } from "./features/mailbox/MailboxPage";
import Landing from "./features/landing/Landing";
import { AuthProvider } from "./auth/AuthContext";
import Unsubscribe from "./features/landing/Unsubscribe";
import UnsubscribeFailed from "./features/landing/UnsubscribeFailed";
import { FormattedMarkdown } from "./features/policies/FormattedMarkdown";
import termsOfServiceMarkdown from "./assets/policies/terms-of-service20260519.md?raw";
import privacyPolicyMarkdown from "./assets/policies/privacy-policy20260517.md?raw";

function AuthLayout() {
    return (
        <AuthProvider>
            <Outlet />
        </AuthProvider>
    );
}

export function App() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/privacy-policy" element={<FormattedMarkdown rawMarkdown={privacyPolicyMarkdown} />} />
            <Route path="/terms-of-service" element={<FormattedMarkdown rawMarkdown={termsOfServiceMarkdown} />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/unsubscribe-failed" element={<UnsubscribeFailed />} />
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/mail"
                    element={
                        <ProtectedRoute>
                            <MailboxPage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}
