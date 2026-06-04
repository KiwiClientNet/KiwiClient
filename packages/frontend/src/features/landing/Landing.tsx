import { useCallback, useState, type ComponentType, type SVGProps } from "react";
import LandingSignup, { type WaitlistOutcome } from "./LandingSignup";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Logo from "../../components/Logo";
import ViewOnGitHub from "../../components/ViewOnGitHub";

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

export default function Landing() {
    const [outcome, setOutcome] = useState<WaitlistOutcome>('IDLE');
    let count: string;

    const { data, isPending, isError } = useQuery({
        queryKey: ['count'],
        queryFn: () => fetch('/api/waitlist/count').then(response => response.json()),
    })

    if (isPending || isError) {
        count = '';
    } else {
        count = String(data.count);
    }

    const returnOutcomeMessage = useCallback(() => {
        let Icon: HeroIcon;
        let colour = "";
        let message = "";

        switch (outcome) {
            case "FAILURE":
                Icon = XMarkIcon;
                colour = "text-kiwi-failure";
                message = "Something went wrong, please try again later.";
                break;
            case "SUCCESS":
                Icon = CheckIcon;
                colour = "text-kiwi-success";
                message = "Thanks — you're on the list! We'll keep you updated. ";
                break;
            default:
                return <></>;
        }

        return (
            <>
                <Icon className={`block size-10 ${colour}`} />
                <h4 className="text-md sm:text-xl lg:text-2xl m-3 text-center">{message}</h4>
            </>
        );

    }, [outcome]);

    return (
        <div className={`min-h-dvh sm:h-dvh sm:overflow-hidden transition-opacity duration-300 ${(!isPending && !isError) ? "opacity-100" : "opacity-0"}`}>
            <div className="w-full min-h-dvh sm:h-full grid place-items-center px-4 py-8 sm:pt-12 sm:pb-24">
                <div className="w-full max-w-6xl flex flex-col items-center font-bold antialiased">
                    <div className="flex flex-col sm:flex-row items-center">
                        <Logo className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64" reverseLogo={true} />
                        <h1 className="text-5xl sm:text-7xl lg:text-9xl text-center sm:text-left"> KiwiClient </h1>
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-5xl mt-3 text-center">Your server. Your client. Your email.</h2>
                    <h3 className="text-lg sm:text-2xl lg:text-3xl mt-4 text-center max-w-4xl"> An open source email client for self-hosted mail servers — built for speed, simplicity, and privacy </h3>
                    <div className="flex flex-col sm:flex-row md:gap-6 sm:gap-1 mt-6 items-center opacity-80 text-center text-sm sm:text-base">
                        <span>Open Source</span>
                        <span>No Tracking</span>
                        <span>Lightweight & Fast</span>
                    </div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl my-6  text-center opacity-80 max-w-6xl"> Currently in development — join the {`${count}`} people waiting and be the first to help shape KiwiClient</h3>
                    <LandingSignup setOutcome={setOutcome} />
                    <span className="text-sm text-gray-300 opacity-30 mt-3 text-center">
                        <span className="whitespace-nowrap">
                            By submitting your email, you agree to our{" "}
                        </span>
                        <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity duration-300 underline">Privacy Policy</Link>
                        <span className="whitespace-nowrap">
                            &nbsp;and {" "}
                        </span>
                        <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity duration-300 underline">Terms of Service</Link>
                    </span>
                    <ViewOnGitHub/>
                    <div
                        aria-live="polite"
                        className={`flex flex-row items-center min-h-16 transition-opacity duration-300 ${outcome !== "IDLE" ? "opacity-100" : "opacity-0"}`}
                    >
                        {returnOutcomeMessage()}
                    </div>
                </div>
            </div>
        </div>
    );
}
