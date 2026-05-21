import { Button } from "../../components/Button";
import { useState, type FormEvent } from "react";
import { LandingSignupRequestSchema } from "@KiwiClient/shared";
import type { LandingSignupRequest } from "@KiwiClient/shared";

export type WaitlistOutcome = 'IDLE' | 'SUCCESS' | 'FAILURE';

interface LandingSignupProps {
    setOutcome: React.Dispatch<React.SetStateAction<WaitlistOutcome>>;
}

export default function LandingSignup({ setOutcome }: LandingSignupProps) {

    const [isDisabled, setIsDisabled] = useState(false);

    const postEmail = async (data: LandingSignupRequest): Promise<WaitlistOutcome> => {

        const response = await fetch('/api/waitlist/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            return 'FAILURE';
        }
        return 'SUCCESS';
    }

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
            setIsDisabled(false);
            setOutcome("FAILURE");
        } finally {
            setIsDisabled(false)
        }
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-row items-center gap-3">
                    <input
                        className="w-40 md:w-80 border rounded-lg p-3"
                        type="email"
                        id="email"
                        name="email"
                        placeholder="email address"
                        required
                        disabled={isDisabled}
                        autoFocus={true}
                    />
                    <div className="md:w-64 w-48">
                        <Button text="Add me to the waitlist" disabled={isDisabled} isLoading={isDisabled} title="Submits your email to the waitlist" />
                    </div>
                </div>
            </form>
        </div>
    );
}

