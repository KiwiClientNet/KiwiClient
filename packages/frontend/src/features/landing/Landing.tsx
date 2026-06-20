/**
 * @brief Public landing page: single-viewport manifesto hero.
 *
 */

import { Link } from "react-router-dom";
import Logo from "../../components/Logo";
import reverseLogoImage from "../../assets/logos/kiwi-logo-white.svg";
import { useSeo } from "../../hooks/useSeo";

const MANIFESTO_LINES = ["Your server", "Your client", "Your email"];

const FEATURE_POINTS = [
    { title: "Open Source", detail: "Every line of code is public and auditable" },
    { title: "No Tracking", detail: "Your mail is read by you and nobody else" },
    { title: "Lightweight & Fast", detail: "Built to feel instant, even on slow days" }
];

export default function Landing() {
    useSeo({
        title: "KiwiClient | Your server, your client, your email",
        description: "KiwiClient is a fast, private, free, and open source email client built for self-hosted mail servers. Open source, no tracking, lightweight.",
        canonicalPath: "/landing"
    });

    return (
        <div className="relative h-dvh flex flex-col overflow-hidden">
            <img
                src={reverseLogoImage}
                alt=""
                aria-hidden="true"
                className="absolute -right-40 -bottom-40 w-176 opacity-5 -rotate-12 pointer-events-none select-none"
            />

            <header className="flex items-center justify-between px-6 sm:px-12 py-3 sm:py-4">
                <Link to="/" className="flex items-center gap-2 no-underline hover:text-kiwi-white">
                    <Logo className="w-11 h-11" link={false} reverseLogo={true} />
                    <span className="font-bold text-lg">KiwiClient</span>
                </Link>

                <nav className="flex items-center gap-5 sm:gap-8">
                    <Link to="/about" className="kiwi-link">About</Link>
                    <Link to="/guide" className="kiwi-link">Guide</Link>
                    <Link
                        to="/login"
                        className="hidden sm:block no-underline font-bold bg-kiwi-green text-kiwi-black px-4 py-2 rounded-lg hover:bg-kiwi-white hover:text-kiwi-black transition-colors duration-200"
                    >
                        Get started
                    </Link>
                </nav>
            </header>

            <main className="flex-1 min-h-0 grid place-items-center px-6 sm:px-12 py-4 sm:py-10">
                <section className="max-w-3xl w-full">
                    <p className="text-kiwi-green font-bold tracking-[0.25em] uppercase text-xs sm:text-sm animate-kiwi-rise">
                        Free &amp; open source email client
                    </p>

                    <h1 className="mt-3 sm:mt-4 font-bold leading-[1.05] text-4xl sm:text-7xl lg:text-8xl">
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

                    <p className="mt-4 sm:mt-6 text-base sm:text-xl max-w-xl opacity-80 animate-kiwi-rise [animation-delay:450ms]">
                        An open source email client made for your self-hosted mail
                        server — built for speed, simplicity, and privacy.
                    </p>

                    <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 animate-kiwi-rise [animation-delay:550ms]">
                        <Link
                            to="/login"
                            className="no-underline text-center font-bold text-base sm:text-lg bg-kiwi-green text-kiwi-black px-8 sm:px-10 py-3 sm:py-4 rounded-xl hover:bg-kiwi-white hover:text-kiwi-black transition-colors duration-200"
                        >
                            Get started
                        </Link>
                        <Link
                            to="/guide"
                            className="no-underline text-center font-bold text-base sm:text-lg border border-kiwi-light-black px-8 sm:px-10 py-3 sm:py-4 rounded-xl hover:border-kiwi-middle-grey hover:text-kiwi-white transition-colors duration-200"
                        >
                            Host your own server
                        </Link>
                    </div>

                    <ul className="mt-6 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-6 border-t border-kiwi-light-black pt-4 sm:pt-6 animate-kiwi-rise [animation-delay:650ms]">
                        {FEATURE_POINTS.map((featurePoint) => (
                            <li key={featurePoint.title}>
                                <p className="font-bold flex items-center gap-2">
                                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-kiwi-green" />
                                    {featurePoint.title}
                                </p>
                                <p className="text-sm opacity-60 mt-1">{featurePoint.detail}</p>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-4 sm:mt-6 text-sm opacity-40 animate-kiwi-rise [animation-delay:750ms]">
                        Also connects to Gmail accounts.
                    </p>
                </section>
            </main>

            <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pb-4 sm:pb-6 text-sm opacity-40">
                <Link to="/privacy-policy" className="hover:opacity-60 transition-opacity duration-300">Privacy Policy</Link>
                <Link to="/terms-of-service" className="hover:opacity-60 transition-opacity duration-300">Terms of Service</Link>
                <a href="https://github.com/KiwiClientNet/KiwiClient" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity duration-300">GitHub</a>
            </footer>
        </div>
    );
}
