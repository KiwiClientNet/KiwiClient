import { useCallback, useState, type ComponentType, type SVGProps } from "react";
import { ReverseLogo } from "../../components/Logo";
import LandingSignup, { type WaitlistOutcome } from "./LandingSignup";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

export default function Landing() {
    const [outcome, setOutcome] = useState<WaitlistOutcome>('IDLE');
    const apiURL: string = import.meta.env.VITE_API_URL;
    let count: string;

    const { data, isPending, isError } = useQuery({
        queryKey: ['count'],
        queryFn: () => fetch(`${apiURL}/api/waitlist/count`).then(response => response.json()),
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
                <Icon className={`hidden sm:block size-10 ${colour}`} />
                <h4 className="text-md sm:text-xl lg:text-2xl m-3 text-center">{message}</h4>
            </>
        );

    }, [outcome]);

    return (
        <div className={`transition-opacity duration-300 ${(!isPending && !isError) ? "opacity-100" : "opacity-0"}`}>
            <div className="min-h-dvh w-full grid place-items-center px-4 py-10 sm:pt-16 sm:pb-32">
                <div className="w-full max-w-6xl flex flex-col items-center font-bold antialiased">
                    <div className="flex flex-col sm:flex-row items-center">
                    <ReverseLogo className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64" />
                    <h1 className="text-5xl sm:text-7xl lg:text-9xl text-center sm:text-left"> KiwiClient </h1>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-5xl mt-3 text-center">Your server. Your client. Your email.</h2>
                <h3 className="text-lg sm:text-2xl lg:text-3xl mt-4 text-center max-w-4xl"> An open source email client for self-hosted mail servers — built for speed, simplicity, and privacy </h3>
                <div className="flex flex-col sm:flex-row gap-6 mt-6 items-center opacity-80 text-center text-sm sm:text-base">
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
                <a
                    href="https://github.com/KiwiClientNet/KiwiClient"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on GitHub"
                    className="mt-6 inline-flex items-center gap-3 border border-white/20 px-5 py-3 rounded-xl hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 98 96"
                        width="24"
                        height="24"
                        className="fill-current"
                    >
                        <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
                    </svg>

                    <span>View on GitHub</span>
                </a>
                <div className={`flex flex-row items-center transition-opacity duration-300 ${outcome !== "IDLE" ? "opacity-100" : "opacity-0"}`}>
                    {returnOutcomeMessage()}
                </div>
                </div>
            </div>
        </div>
    );
}
