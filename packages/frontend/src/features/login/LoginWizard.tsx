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
import { ArrowPathIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
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

const SUCCESS_REDIRECT_DELAY_MS = 2000;
const LOGIN_TIMEOUT_MS = 30 * 1000;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

const STEPS = {
    ACCOUNT: {
        LABEL: "Account",
        ENUM: 0,
    },
    IMAP: {
        LABEL: "Receiving",
        ENUM: 1,
    },
    SMTP: {
        LABEL: "Sending",
        ENUM: 2,
    },
    NAME: {
        LABEL: "Name",
        ENUM: 3,
    },
} as const;

type STEPS = (typeof STEPS)[keyof typeof STEPS];
const STEPS_LENGTH = Object.keys(STEPS).length;

interface LoginFormValues {
    email: string;
    password: string;
    rememberMe: boolean;
    imapHost: string;
    imapPort: string;
    smtpHost: string;
    smtpPort: string;
    name: string;
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
    smtpPort: String(DEFAULT_SMTP_PORT),
    name: ""
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

    if (stepIndex === 3) {
        if (values.name.length === 0) {
            errors.name = "Enter your name";
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
    const [stepIndex, setStepIndex] = useState<STEPS>(STEPS.ACCOUNT);
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

    function goToNextStep(currentStep: string): void {
        setBanner(null);
        switch (currentStep) {
            case STEPS.ACCOUNT.LABEL:
                setStepIndex(STEPS.IMAP);
                return;
            case STEPS.IMAP.LABEL:
                setStepIndex(STEPS.SMTP);
                return;
            case STEPS.SMTP.LABEL:
                setStepIndex(STEPS.NAME);
                return;
            case STEPS.NAME.LABEL:
            default:
                return;
        }
    }

    function goToPreviousStep(currentStep: string): void {
        setBanner(null);
        switch (currentStep) {
            case STEPS.ACCOUNT.LABEL:
            default:
                return;
            case STEPS.IMAP.LABEL:
                setStepIndex(STEPS.ACCOUNT);
                return;
            case STEPS.SMTP.LABEL:
                setStepIndex(STEPS.IMAP);
                return;
            case STEPS.NAME.LABEL:
                setStepIndex(STEPS.SMTP);
                return;
        }
    }

    function advanceStep(): void {
        const errors = validateStep(stepIndex.ENUM, values);
        if (Object.entries(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        if (stepIndex.ENUM === 0) {
            prefillHostsFromEmail();
        }

        goToNextStep(stepIndex.LABEL);
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
            setStepIndex(STEPS.ACCOUNT);
            setFieldErrors({ email: "", password: "The server rejected this email and password combination" });
            return;
        }
        if (responseBody.protocol === "IMAP") {
            setStepIndex(STEPS.IMAP);
            setFieldErrors(responseBody.field === "port"
                ? { imapPort: "Check the port number" }
                : { imapHost: "Check the server address" });
            return;
        }
        if (responseBody.protocol === "SMTP") {
            setStepIndex(STEPS.SMTP);
            setFieldErrors(responseBody.field === "port"
                ? { smtpPort: "Check the port number" }
                : { smtpHost: "Check the server address" });
        }
    }

    async function submitLogin(): Promise<void> {
        Object.entries(STEPS).forEach(([step, step_value]) => {
            const errors = validateStep(step_value.ENUM, values);
            if (STEPS_LENGTH > 0) {
                setFieldErrors(errors);
                goToNextStep(step);
                return;
            }
        })

        const parseResult = LoginServerRequestSchema.safeParse({
            name: values.name,
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

            setBanner({ kind: "success", message: `Welcome back, ${values.name.split(' ').at(0)} - opening your mailbox` });
            redirectTimerReference.current = window.setTimeout(() => {
                login(responseBody.accessToken!, responseBody.email ?? "", responseBody.name ?? "");
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
        if (stepIndex.ENUM < STEPS.NAME.ENUM) {
            advanceStep();
            return;
        }
        void submitLogin();
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-2xl font-bold">{stepIndex.LABEL}</h2>
                <span className="text-sm opacity-60">Step {stepIndex.ENUM + 1} of {STEPS_LENGTH}</span>
            </div>

            <ol aria-hidden="true" className="flex gap-2 mb-6">
                {Object.entries(STEPS).map(([_step, stepEnum]) => (
                    <li
                        key={stepEnum.LABEL}
                        className={`h-1.5 rounded-full transition-all duration-300 ${stepEnum.ENUM === stepIndex.ENUM ? "w-8 bg-kiwi-green" : "w-4 bg-kiwi-light-black"}`}
                    />
                ))}
            </ol>

            <div className="overflow-hidden">
                <div
                    className="flex transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(-${stepIndex.ENUM * 100}%)` }}
                >
                    <fieldset className="w-full shrink-0 space-y-4 px-1" inert={stepIndex.ENUM !== STEPS.ACCOUNT.ENUM}>
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

                    <fieldset className="w-full shrink-0 space-y-4 px-1" inert={stepIndex.ENUM !== STEPS.IMAP.ENUM}>
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

                    <fieldset className="w-full shrink-0 space-y-4 px-1" inert={stepIndex.ENUM !== STEPS.SMTP.ENUM}>
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

                    <fieldset className="w-full shrink-0 space-y-4 px-1" inert={stepIndex.ENUM !== STEPS.NAME.ENUM}>
                        <p className="text-sm opacity-70">The name that recipients will see when receiving your emails sent from KiwiClient.</p>
                        <WizardField
                            label="Name"
                            id="Name"
                            type="text"
                            autoComplete="off"
                            placeholder="your name"
                            value={values.name}
                            error={fieldErrors.name}
                            onChange={(event) => setField("name", event.target.value)}
                        />
                    </fieldset>
                </div>
            </div>

            <div className="flex gap-3 mt-6">
                {stepIndex.ENUM > STEPS.ACCOUNT.ENUM && (
                    <Button text="Back" type="button" disabled={isSubmitting} onClickFunction={() => goToPreviousStep(stepIndex.LABEL)} />
                )}
                <Button
                    text={stepIndex.ENUM < STEPS.NAME.ENUM ? "Next" : "Login"}
                    type="submit"
                    reverseColours={true}
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                />
            </div>

            {stepIndex.ENUM === STEPS.ACCOUNT.ENUM && (
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
                    <p className={`rounded-lg p-3 text-sm text-center text-kiwi-white flex flex-row justify-between items-center ${banner.kind === "failure" ? "bg-kiwi-failure" : "bg-kiwi-success"}`}>
                        {banner.message}
                        {banner.kind === "success" && <ArrowPathIcon className="text-kiwi-white size-4 animate-spin" />}
                    </p>
                )}
            </div>
        </form>
    );
}
