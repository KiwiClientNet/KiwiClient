/**
 * @brief Combined login page with private-server form and Google login button.
 *
 * Both login paths navigate straight to the mailbox view on success so there
 * is no intermediate continue step. Users who reach this page while already
 * authenticated are redirected so the form is never shown to a logged-in user.
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";
import { ReverseLogo } from "../../components/Logo";
import { GoogleLogin } from "./GoogleLogin";
import { LoginForm } from "./LoginForm";

export function LoginPage() {
    const { accessToken, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isLoginFormDisabled, setIsLoginFormDisabled] = useState(false);

    useEffect(() => {
        if (!loading && accessToken) {
            navigate("/mail", { replace: true });
        }
    }, [accessToken, loading, navigate]);

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            <div className="w-full lg:w-6/12 p-16 flex flex-col justify-center">
                <nav className="mb-16">
                    <ReverseLogo width={400} height={400} />
                </nav>

                <div>
                    <h1 className="text-4xl lg:text-6xl font-bold">KiwiClient</h1>
                    <h1 className="text-3xl lg:text-5xl font-bold">Your New Email Client</h1>
                    <div className="w-16 h-2 bg-kiwi-white my-6" />
                    <p className="text-xl max-w-xl">An email client to receive, organise, and send emails.</p>
                </div>
            </div>

            <div className="w-full lg:w-6/12 p-16 flex flex-col justify-center mx-auto md:max-w-xl lg:max-w-2xl">
                <div className="rounded-2xl shadow-xl border-solid p-4 border-2">
                    <LoginForm isDisabled={isLoginFormDisabled} setIsDisabled={setIsLoginFormDisabled} />
                    <hr className="border-t-2 mt-6 mb-6" />
                    <GoogleLogin isDisabled={isLoginFormDisabled} setIsDisabled={setIsLoginFormDisabled} />
                </div>
            </div>
        </div>
    );
}
