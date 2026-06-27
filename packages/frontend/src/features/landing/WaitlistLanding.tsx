import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import Logo from "../../components/Logo";
import LandingSignup, { type WaitlistOutcome } from "./LandingSignup";
import { Slideshow } from "./Slideshow";
import { useSeo } from "../../hooks/useSeo";
import ViewOnGitHub from "../../components/ViewOnGitHub";

const MANIFESTO_LINES = ["Your server", "Your client", "Your email"];

export default function WaitlistLanding() {
    const [outcome, setOutcome] = useState<WaitlistOutcome>("IDLE");

    useSeo({
        title: "KiwiClient | Free, Open Source Email Client",
        description: "Kiwi Client is a fast, private, free and open source email client for your self-hosted mail server, with Gmail and Outlook support on the way. Join the waitlist.",
        canonicalPath: "/"
    });

    const { data, isPending, isError } = useQuery({
        queryKey: ["waitlistCount"],
        queryFn: () => fetch("/api/waitlist/count").then(response => response.json())
    });

    const count = !isPending && !isError ? String(data.count) : "";

    const waitingLine = count
        ? `Currently in development - join the ${count} people waiting and help shape KiwiClient.`
        : "Currently in development - join the waitlist and help shape KiwiClient.";

    return (
        <div className="min-h-dvh lg:h-dvh flex flex-col lg:overflow-hidden px-6 sm:px-12 py-6 sm:py-8">
            <main className="flex-1 min-h-0 grid lg:grid-cols-[3fr_2fr] gap-8 lg:gap-12 items-center">
                <div className="flex justify-center min-h-0 order-last lg:order-1 animate-kiwi-rise [animation-delay:650ms]">
                    <Slideshow />
                </div>

                <section className="flex flex-col min-w-0 lg:order-2">
                    <Link to="/" className="flex items-center gap-2 no-underline hover:text-kiwi-white self-start">
                        <Logo className="w-10 h-10" link={false} reverseLogo={true} />
                        <span className="font-bold text-lg">KiwiClient</span>
                    </Link>

                    <p className="mt-6 sm:mt-8 kiwi-eyebrow animate-kiwi-rise">Free &amp; open source email client</p>

                    <h1 className="mt-3 font-bold leading-[1.05] text-4xl sm:text-5xl lg:text-6xl">
                        {MANIFESTO_LINES.map((manifestoLine, lineIndex) => (
                            <span
                                key={manifestoLine}
                                className="block animate-kiwi-rise"
                                style={{ animationDelay: `${100 + lineIndex * 100}ms` }}
                            >
                                {manifestoLine}<span className="text-kiwi-green">.</span>
                            </span>
                        ))}
                    </h1>

                    <p className="mt-4 text-base sm:text-lg max-w-md opacity-80 animate-kiwi-rise [animation-delay:450ms]">
                        A fast, private email client built for your self-hosted mail server.
                        Gmail and Outlook support are on the way.
                    </p>

                    <p className="mt-3 text-sm opacity-60 max-w-md animate-kiwi-rise [animation-delay:550ms]">
                        {waitingLine}
                    </p>

                    <div className="mt-6 flex flex-col animate-kiwi-rise [animation-delay:650ms]">
                        <LandingSignup setOutcome={setOutcome} />

                        <div
                            aria-live="polite"
                            className={`flex items-center gap-2 h-6 mt-2 transition-opacity duration-300 ${outcome !== "IDLE" ? "opacity-100" : "opacity-0"}`}
                        >
                            {outcome === "SUCCESS" && (
                                <>
                                    <CheckIcon className="size-5 text-kiwi-success" />
                                    <span className="text-sm">Thanks - you're on the list! We'll keep you updated.</span>
                                </>
                            )}
                            {outcome === "FAILURE" && (
                                <>
                                    <XMarkIcon className="size-5 text-kiwi-failure" />
                                    <span className="text-sm">Something went wrong, please try again later.</span>
                                </>
                            )}
                        </div>

                        <p className="text-xs opacity-40 max-w-md">
                            By submitting your email, you agree to our{" "}
                            <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-60 transition-opacity duration-300">Privacy Policy</Link>
                            {" "}and{" "}
                            <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-60 transition-opacity duration-300">Terms of Service</Link>.
                        </p>
                        <span className="max-w-48">
                            <ViewOnGitHub />
                        </span>
                    </div>
                </section>
            </main>
        </div>
    );
}
