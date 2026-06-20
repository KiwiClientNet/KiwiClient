import { Button } from "../../components/Button";
import { useState, type FormEvent } from "react";
import { LandingSignupRequestSchema } from "@KiwiClient/shared";
import type { LandingSignupRequest } from "@KiwiClient/shared";

export type WaitlistOutcome = "IDLE" | "SUCCESS" | "FAILURE";

interface LandingSignupProps {
    setOutcome: React.Dispatch<React.SetStateAction<WaitlistOutcome>>;
}

export default function LandingSignup({ setOutcome }: LandingSignupProps) {
    const [isDisabled, setIsDisabled] = useState(false);

    const postEmail = async (data: LandingSignupRequest): Promise<WaitlistOutcome> => {
        const response = await fetch("/api/waitlist/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            return "FAILURE";
        }
        return "SUCCESS";
    };

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setOutcome("IDLE");
        setIsDisabled(true);

        try {
            const formData = new FormData(event.currentTarget);
            const rawData = Object.fromEntries(formData) as Record<string, FormDataEntryValue | boolean>;

            const parseResult = LandingSignupRequestSchema.safeParse(rawData);
            if (!parseResult.success) {
                console.error(parseResult.error);
                setOutcome("FAILURE");
                return;
            }

            const result = await postEmail(parseResult.data);
            setOutcome(result);
        } catch (thrownError: unknown) {
            console.error(thrownError);
            setOutcome("FAILURE");
        } finally {
            setIsDisabled(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col sm:flex-row items-stretch gap-3">
            <input
                className="kiwi-input border-kiwi-light-black bg-kiwi-middle-black flex-1"
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                aria-label="Email address"
                required
                disabled={isDisabled}
            />
            <div className="sm:w-64">
                <Button text="Add me to the waitlist" disabled={isDisabled} isLoading={isDisabled} reverseColours={true} title="Submits your email to the waitlist" />
            </div>
        </form>
    );
}
