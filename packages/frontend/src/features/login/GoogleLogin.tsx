/**
 * @brief Google sign-in button using the popup auth-code flow.
 *
 * Opens a popup window for the consent screen so the user never leaves the
 * SPA shell. On success the authorisation code is posted to the backend
 * which exchanges it for an access token, after which the user is sent
 * straight to the mailbox view without an intermediate continue button.
 */

import { useContext } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import type { AuthResponse, GoogleLoginRequestBody } from "@KiwiClient/shared";
import { apiFetch } from "../../api/client";
import { AuthContext } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import gmailLogo from "../../assets/logos/gmail-48.png";

const GMAIL_SCOPE = "email https://mail.google.com/";

interface GoogleLoginProps {
    isDisabled: boolean;
    setIsDisabled: (disabled: boolean) => void;
    onLoginFailed: (message: string) => void;
}

export function GoogleLogin({ isDisabled, setIsDisabled, onLoginFailed }: GoogleLoginProps) {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const triggerGoogleLogin = useGoogleLogin({
        flow: "auth-code",
        scope: GMAIL_SCOPE,
        ux_mode: "popup",
        onSuccess: async (codeResponse) => {
            try {
                const requestBody: GoogleLoginRequestBody = { accessCode: codeResponse.code };
                const response = await apiFetch("/api/google/callback", { method: "POST", body: requestBody });
                const responseBody = (await response.json()) as AuthResponse;

                if (!responseBody.success || !responseBody.accessToken) {
                    onLoginFailed(responseBody.message ?? "Google login failed - please try again");
                    return;
                }
                login(responseBody.accessToken, responseBody.email ?? "", responseBody.name ?? "");
                navigate("/mail");
            } catch {
                onLoginFailed("Google login failed - please try again");
            } finally {
                setIsDisabled(false);
            }
        },
        onError: (errorResponse) => {
            console.error("Google OAuth error:", errorResponse);
            onLoginFailed("Google sign-in was cancelled or blocked");
            setIsDisabled(false);
        },
        onNonOAuthError: () => {
            setIsDisabled(false);
        }
    });

    const handleClick = () => {
        setIsDisabled(true);
        triggerGoogleLogin();
    };

    return (
        <Button
            text="Sign in with Google"
            disabled={isDisabled}
            onClickFunction={handleClick}
            inlineImageSource={gmailLogo}
            inlineImageAltText="Gmail logo"
        />
    );
}
