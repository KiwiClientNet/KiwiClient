/**
 * @brief Login page hosting the multi-step wizard and Google login.
 *
 * Both login paths navigate straight to the mailbox view on success so there
 * is no intermediate continue step. Users who reach this page while already
 * authenticated are redirected so the form is never shown to a logged-in user.
 */

import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";
import Logo from "../../components/Logo";
import { LoginWizard } from "./LoginWizard";

export function LoginPage() {
    const { accessToken, loading } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && accessToken) {
            navigate("/mail", { replace: true });
        }
    }, [accessToken, loading, navigate]);

    return (
        <div className="min-h-dvh flex flex-col lg:flex-row">
            <div className="w-full lg:w-1/2 px-6 pt-8 pb-4 sm:px-12 sm:pt-12 lg:p-16 flex flex-col justify-center items-center lg:items-start text-center lg:text-left">
                <nav className="mb-4 sm:mb-8 lg:mb-12">
                    <Logo className="w-24 h-24 sm:w-40 sm:h-40 lg:w-72 lg:h-72" reverseLogo={true} />
                </nav>

                <div className="max-w-xl">
                    <p className="kiwi-eyebrow mb-2">Welcome back</p>
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold">KiwiClient<span className="text-kiwi-green">.</span></h1>
                    <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mt-1">Your New Email Client</h2>
                    <div className="w-12 h-1.5 bg-kiwi-green rounded-full my-4 sm:my-6 mx-auto lg:mx-0" />
                    <p className="text-base sm:text-lg lg:text-xl opacity-80">Your server, your client, your email — built for self-hosted mail.</p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 px-6 pb-10 sm:px-12 sm:pb-16 lg:p-16 flex flex-col justify-center items-center">
                <div className="w-full max-w-md lg:max-w-lg kiwi-panel shadow-xl p-6 sm:p-8">
                    <LoginWizard />
                </div>
            </div>
        </div>
    );
}
