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
import WaitlistLanding from "./features/landing/WaitlistLanding";
import Unsubscribe from "./features/landing/Unsubscribe";
import UnsubscribeFailed from "./features/landing/UnsubscribeFailed";
import ComingSoon from "./features/landing/ComingSoon";
import { AuthProvider } from "./auth/AuthContext";
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
            <Route path="/" element={<WaitlistLanding />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/unsubscribe-failed" element={<UnsubscribeFailed />} />
            <Route path="/about" element={<ComingSoon title="About KiwiClient" description="What KiwiClient is, why it exists, and the mission behind it." />} />
            <Route path="/guide" element={<ComingSoon title="Host your own email" description="A KiwiClient guide to setting up your own email server and connecting it in minutes." />} />
            <Route path="/privacy-policy" element={<FormattedMarkdown rawMarkdown={privacyPolicyMarkdown} title="Privacy Policy — KiwiClient" description="How KiwiClient collects, uses, and protects your personal data." />} />
            <Route path="/terms-of-service" element={<FormattedMarkdown rawMarkdown={termsOfServiceMarkdown} title="Terms of Service — KiwiClient" description="The terms governing your use of KiwiClient and the waitlist." />} />
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
