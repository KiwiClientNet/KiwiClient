/**
 * @brief Private email server login form.
 *
 * Submits credentials to the backend /api/login endpoint and, on success,
 * stores the access token in AuthContext and navigates to the mailbox view.
 * Validation runs client-side via the shared zod schema before any request
 * is sent so obviously invalid input never reaches the server.
 */

import { useContext, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { type AuthResponse, LoginServerRequestSchema } from "@KiwiClient/shared";
import { apiFetch } from "../../api/client";
import { AuthContext } from "../../auth/AuthContext";
import { Button } from "../../components/Button";

interface LoginFormProps {
    isDisabled: boolean;
    setIsDisabled: (disabled: boolean) => void;
}

export function LoginForm({ isDisabled, setIsDisabled }: LoginFormProps) {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsDisabled(true);

        try {
            const formData = new FormData(event.currentTarget);
            const rawData = Object.fromEntries(formData) as Record<string, FormDataEntryValue | boolean>;
            rawData.rememberMe = rawData.rememberMe === "on";

            const parseResult = LoginServerRequestSchema.safeParse(rawData);
            if (!parseResult.success) {
                console.error(parseResult.error);
                return;
            }

            const response = await apiFetch("/api/login", { method: "POST", body: parseResult.data });
            const responseBody = (await response.json()) as AuthResponse;

            if (!response.ok || !responseBody.success || !responseBody.accessToken) {
                console.error(responseBody.message);
                return;
            }

            login(responseBody.accessToken, responseBody.email ?? "");
            navigate("/mail");

        } catch (thrownError: unknown) {
            console.error(thrownError);
        } finally {
            setIsDisabled(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold mb-2">Login</h2>
            <div className="flex flex-col space-y-4">
                <div>
                    <label htmlFor="email" className="font-bold">Email </label>
                    <input
                        className="w-full border rounded-lg p-3"
                        type="email"
                        id="email"
                        name="email"
                        placeholder="email"
                        required
                        disabled={isDisabled}
                        autoFocus={true}
                    />
                </div>
                <div>
                    <label htmlFor="password" className="font-bold">Password </label>
                    <input
                        className="w-full border rounded-lg p-3"
                        type="password"
                        id="password"
                        name="password"
                        placeholder="password"
                        disabled={isDisabled}
                        required
                    />
                </div>
                <div className="flex justify-left">
                    <input
                        className="mr-4 accent-kiwi-success"
                        type="checkbox"
                        id="rememberMe"
                        name="rememberMe"
                        disabled={isDisabled}
                    />
                    <label htmlFor="rememberMe">Keep me logged in</label>
                </div>
                <Button text="Login" disabled={isDisabled} />
            </div>
        </form>
    );
}
