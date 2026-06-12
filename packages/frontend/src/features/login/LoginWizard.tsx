/**
 * @brief Three-step login wizard: account credentials, IMAP, then SMTP.
 *
 * The input dock slides horizontally between steps; every step stays mounted
 * so values persist and the transition is a pure GPU transform. IMAP and
 * SMTP hosts are guessed from the email domain when the user advances past
 * the first step, so most users only confirm prefilled defaults.
 *
 * On a failed login the backend reports which protocol rejected the attempt;
 * the wizard jumps back to the step that owns the offending fields and
 * highlights them, so the user is never left guessing what to fix.
 */

import { useContext, useEffect, useRef, useState, type ComponentPropsWithoutRef, type FormEvent, type ReactNode } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import {
    type AuthResponse,
    DEFAULT_IMAP_PORT,
    DEFAULT_SMTP_PORT,
    LoginServerRequestSchema
} from "@KiwiClient/shared";
import { apiFetch } from "../../api/client";
import { AuthContext } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Checkbox } from "../../components/Checkbox";
import { GoogleLogin } from "./GoogleLogin";

const STEP_LABELS = ["Account", "Receiving", "Sending"] as const;
const FINAL_STEP_INDEX = STEP_LABELS.length - 1;
const SUCCESS_REDIRECT_DELAY_MS = 700;
const LOGIN_TIMEOUT_MS = 30 * 1000;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

interface LoginFormValues {
    email: string;
    password: string;
    rememberMe: boolean;
    imapHost: string;
    imapPort: string;
    smtpHost: string;
    smtpPort: string;
}

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

interface Banner {
    kind: "success" | "failure";
    message: string;
}

const INITIAL_VALUES: LoginFormValues = {
    email: "",
    password: "",
    rememberMe: false,
    imapHost: "",
    imapPort: String(DEFAULT_IMAP_PORT),
    smtpHost: "",
    smtpPort: String(DEFAULT_SMTP_PORT)
};

function isValidPort(portText: string): boolean {
    const port = Number(portText);
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * @brief Validates the fields owned by one wizard step.
 *
 * Kept as a pure function so the final submit can re-run every step and
 * jump back to the first one that fails.
 */
function validateStep(stepIndex: number, values: LoginFormValues): FieldErrors {
    const errors: FieldErrors = {};

    if (stepIndex === 0) {
        if (!EMAIL_PATTERN.test(values.email)) {
            errors.email = "Enter a valid email address";
        }
        if (values.password.length === 0) {
            errors.password = "Enter your password";
        }
    }

    if (stepIndex === 1) {
        if (values.imapHost.trim().length === 0) {
            errors.imapHost = "Enter your IMAP server host";
        }
        if (!isValidPort(values.imapPort)) {
            errors.imapPort = "Port must be between 1 and 65535";
        }
    }

    if (stepIndex === 2) {
        if (values.smtpHost.trim().length === 0) {
            errors.smtpHost = "Enter your SMTP server host";
        }
        if (!isValidPort(values.smtpPort)) {
            errors.smtpPort = "Port must be between 1 and 65535";
        }
    }

    return errors;
}

interface WizardFieldProps extends ComponentPropsWithoutRef<"input"> {
    label: string;
    error?: string;
    trailing?: ReactNode;
}

/**
 * @brief Labelled input with error highlighting.
 *
 * An empty-string error highlights the border without printing a message,
 * which lets a shared message (e.g. "check your email and password") sit
 * under one field while both offending fields turn red.
 */
function WizardField({ label, error, id, trailing, ...inputProps }: WizardFieldProps) {
    const hasError = error !== undefined;
    return (
        <div>
            <label htmlFor={id} className="font-bold">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    aria-invalid={hasError ? true : undefined}
                    className={`kiwi-input ${trailing ? "pr-11" : ""} ${hasError ? "border-kiwi-failure" : "border-kiwi-light-black"}`}
                    {...inputProps}
                />
                {trailing && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {trailing}
                    </div>
                )}
            </div>
            {error && <p role="alert" className="text-sm mt-1 text-kiwi-failure">{error}</p>}
        </div>
    );
}

export function LoginWizard() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [stepIndex, setStepIndex] = useState(0);
    const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [banner, setBanner] = useState<Banner | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const redirectTimerReference = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(redirectTimerReference.current), []);

    function setField(field: keyof LoginFormValues, value: string | boolean): void {
        setValues(currentValues => ({ ...currentValues, [field]: value }));
        setFieldErrors(currentErrors => ({ ...currentErrors, [field]: undefined }));
    }

    /**
     * @brief Prefills both server hosts from the email domain if still empty.
     *
     * Runs when leaving the account step so the user sees sensible defaults
     * rather than blank fields; anything they have already typed is kept.
     */
    function prefillHostsFromEmail(): void {
        const domain = values.email.split("@")[1];
        if (!domain) {
            return;
        }
        setValues(currentValues => ({
            ...currentValues,
            imapHost: currentValues.imapHost || `mail.${domain}`,
            smtpHost: currentValues.smtpHost || `mail.${domain}`
        }));
    }

    function goToStep(nextStepIndex: number): void {
        setBanner(null);
        setStepIndex(nextStepIndex);
    }

    function advanceStep(): void {
        const errors = validateStep(stepIndex, values);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        if (stepIndex === 0) {
            prefillHostsFromEmail();
        }
        goToStep(stepIndex + 1);
    }

    /**
     * @brief Maps a failed login response onto the step and fields that caused it.
     *
     * A 401 means the server rejected the credentials; IMAP does not report
     * whether the username or the password was wrong, so both fields are
     * highlighted. Otherwise the protocol and field hints reported by the
     * backend pick the step and the exact input to mark.
     */
    function showLoginFailure(statusCode: number, responseBody: AuthResponse): void {
        const message = responseBody.message ?? "Login failed - please try again";
        setBanner({ kind: "failure", message });

        if (statusCode === 401) {
            setStepIndex(0);
            setFieldErrors({ email: "", password: "The server rejected this email and password combination" });
            return;
        }
        if (responseBody.protocol === "IMAP") {
            setStepIndex(1);
            setFieldErrors(responseBody.field === "port"
                ? { imapPort: "Check the port number" }
                : { imapHost: "Check the server address" });
            return;
        }
        if (responseBody.protocol === "SMTP") {
            setStepIndex(2);
            setFieldErrors(responseBody.field === "port"
                ? { smtpPort: "Check the port number" }
                : { smtpHost: "Check the server address" });
        }
    }

    async function submitLogin(): Promise<void> {
        for (const checkedStepIndex of [0, 1, 2]) {
            const errors = validateStep(checkedStepIndex, values);
            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                goToStep(checkedStepIndex);
                return;
            }
        }

        const parseResult = LoginServerRequestSchema.safeParse({
            email: values.email,
            password: values.password,
            rememberMe: values.rememberMe,
            advancedConfig: {
                imapHost: values.imapHost.trim(),
                imapPort: values.imapPort,
                smtpHost: values.smtpHost.trim(),
                smtpPort: values.smtpPort
            }
        });

        if (!parseResult.success) {
            setBanner({ kind: "failure", message: parseResult.error.issues[0]?.message ?? "Invalid login details" });
            return;
        }

        setIsSubmitting(true);
        setBanner(null);

        try {
            const response = await apiFetch("/api/login", {
                method: "POST",
                body: parseResult.data,
                signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS)
            });
            const responseBody = (await response.json()) as AuthResponse;

            if (!response.ok || !responseBody.success || !responseBody.accessToken) {
                showLoginFailure(response.status, responseBody);
                return;
            }

            setBanner({ kind: "success", message: "Welcome back - opening your mailbox" });
            redirectTimerReference.current = window.setTimeout(() => {
                login(responseBody.accessToken!, responseBody.email ?? "");
                navigate("/mail");
            }, SUCCESS_REDIRECT_DELAY_MS);

        } catch (thrownError) {
            const timedOut = thrownError instanceof DOMException && thrownError.name === "TimeoutError";
            setBanner({
                kind: "failure",
                message: timedOut
                    ? "The server took too long to respond - please try again"
                    : "Could not reach the server - please try again"
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (stepIndex < FINAL_STEP_INDEX) {
            advanceStep();
            return;
        }
        void submitLogin();
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-2xl font-bold">{STEP_LABELS[stepIndex]}</h2>
                <span className="text-sm opacity-60">Step {stepIndex + 1} of {STEP_LABELS.length}</span>
            </div>

            <ol aria-hidden="true" className="flex gap-2 mb-6">
                {STEP_LABELS.map((stepLabel, indicatorIndex) => (
                    <li
                        key={stepLabel}
                        className={`h-1.5 rounded-full transition-all duration-300 ${indicatorIndex === stepIndex ? "w-8 bg-kiwi-green" : "w-4 bg-kiwi-light-black"}`}
                    />
                ))}
            </ol>

            <div className="overflow-hidden">
                <div
                    className="flex transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(-${stepIndex * 100}%)` }}
                >
                    <fieldset className="w-full shrink-0 space-y-4 px-1" inert={stepIndex !== 0}>
                        <WizardField
                            label="Email"
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@yourdomain.com"
                            value={values.email}
                            error={fieldErrors.email}
                            onChange={(event) => setField("email", event.target.value)}
                            autoFocus={true}
                        />
                        <WizardField
                            label="Password"
                            id="password"
                            type={isPasswordVisible ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="password"
                            value={values.password}
                            error={fieldErrors.password}
                            onChange={(event) => setField("password", event.target.value)}
                            trailing={
                                <button
                                    type="button"
                                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                                    onClick={() => setIsPasswordVisible(visible => !visible)}
                                    className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-200"
                                >
                                    {isPasswordVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            }
                        />
                        <div className="flex items-center gap-3">
                            <Checkbox checked={values.rememberMe} onChange={(event) => setField("rememberMe", event.target.checked)} />
                            <span>Keep me logged in</span>
                        </div>
                    </fieldset>

                    <fieldset className="w-full shrink-0 space-y-4 px-1" inert={stepIndex !== 1}>
                        <p className="text-sm opacity-70">Where your mail arrives. We have guessed these from your email address - most servers use these defaults.</p>
                        <WizardField
                            label="IMAP server"
                            id="imapHost"
                            type="text"
                            autoComplete="off"
                            placeholder="mail.yourdomain.com"
                            value={values.imapHost}
                            error={fieldErrors.imapHost}
                            onChange={(event) => setField("imapHost", event.target.value)}
                        />
                        <WizardField
                            label="IMAP port"
                            id="imapPort"
                            type="text"
                            inputMode="numeric"
                            value={values.imapPort}
                            error={fieldErrors.imapPort}
                            onChange={(event) => setField("imapPort", event.target.value)}
                        />
                    </fieldset>

                    <fieldset className="w-full shrink-0 space-y-4 px-1" inert={stepIndex !== 2}>
                        <p className="text-sm opacity-70">Where your mail is sent from. Almost always the same server as IMAP.</p>
                        <WizardField
                            label="SMTP server"
                            id="smtpHost"
                            type="text"
                            autoComplete="off"
                            placeholder="mail.yourdomain.com"
                            value={values.smtpHost}
                            error={fieldErrors.smtpHost}
                            onChange={(event) => setField("smtpHost", event.target.value)}
                        />
                        <WizardField
                            label="SMTP port"
                            id="smtpPort"
                            type="text"
                            inputMode="numeric"
                            value={values.smtpPort}
                            error={fieldErrors.smtpPort}
                            onChange={(event) => setField("smtpPort", event.target.value)}
                        />
                    </fieldset>
                </div>
            </div>

            <div className="flex gap-3 mt-6">
                {stepIndex > 0 && (
                    <Button text="Back" type="button" disabled={isSubmitting} onClickFunction={() => goToStep(stepIndex - 1)} />
                )}
                <Button
                    text={stepIndex < FINAL_STEP_INDEX ? "Next" : "Login"}
                    type="submit"
                    reverseColours={true}
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                />
            </div>

            {stepIndex === 0 && (
                <div className="mt-6 space-y-4">
                    <hr className="border-t border-kiwi-light-black" />
                    <GoogleLogin
                        isDisabled={isSubmitting}
                        setIsDisabled={setIsSubmitting}
                        onLoginFailed={(message) => setBanner({ kind: "failure", message })}
                    />
                </div>
            )}

            <div aria-live="polite" className="min-h-12 mt-4">
                {banner && (
                    <p className={`rounded-lg p-3 text-sm text-center text-kiwi-white ${banner.kind === "failure" ? "bg-kiwi-failure" : "bg-kiwi-success"}`}>
                        {banner.message}
                    </p>
                )}
            </div>
        </form>
    );
}
