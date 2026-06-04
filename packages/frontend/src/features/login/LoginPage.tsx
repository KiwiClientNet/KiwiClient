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
import Logo from "../../components/Logo";
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
        <div className="min-h-dvh flex flex-col lg:flex-row">
            <div className="w-full lg:w-1/2 px-6 pt-8 pb-4 sm:px-12 sm:pt-12 lg:p-16 flex flex-col justify-center items-center lg:items-start text-center lg:text-left">
                <nav className="mb-4 sm:mb-8 lg:mb-12">
                    <Logo className="w-24 h-24 sm:w-40 sm:h-40 lg:w-72 lg:h-72" reverseLogo={true} />
                </nav>

                <div className="max-w-xl">
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold">KiwiClient</h1>
                    <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mt-1">Your New Email Client</h2>
                    <div className="w-12 h-1.5 bg-kiwi-white my-4 sm:my-6 mx-auto lg:mx-0" />
                    <p className="text-base sm:text-lg lg:text-xl">An email client to receive, organise, and send emails.</p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 px-6 pb-10 sm:px-12 sm:pb-16 lg:p-16 flex flex-col justify-center items-center">
                <div className="w-full max-w-md lg:max-w-lg rounded-2xl shadow-xl border-2 border-solid p-6 sm:p-8">
                    <LoginForm isDisabled={isLoginFormDisabled} setIsDisabled={setIsLoginFormDisabled} />
                    <hr className="border-t-2 my-6" />
                    <GoogleLogin isDisabled={isLoginFormDisabled} setIsDisabled={setIsLoginFormDisabled} />
                </div>
            </div>
        </div>
    );
}
