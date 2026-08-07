/**
 * @brief Public landing page: single-viewport manifesto hero.
 *
 */

import { Link } from "react-router-dom";
import Logo from "../../components/Logo";

const MANIFESTO_LINES = ["Webmail made yours"];

const FEATURE_POINTS = [
    { title: "Open Source", detail: "Every line of code is public and auditable" },
    { title: "No Tracking", detail: "Your mail is read by you and nobody else" },
    { title: "Lightweight & Fast", detail: "Built for speed and not for tracking" }
];

export default function Landing() {
    return (
        <div className="relative flex h-dvh flex-col overflow-y-scroll overflow-x-hidden kiwi-scrollbar">
            <header className="flex items-center justify-between px-6 sm:px-12 py-3 sm:py-4">
                <Link to="/" className="flex items-center gap-2 no-underline hover:text-kiwi-white">
                    <Logo className="w-11 h-11" link={false} reverseLogo={true} />
                    <span className="font-bold text-lg hidden sm:block">KiwiClient</span>
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

            <main className="flex-1 min-h-0 grid place-items-start sm:place-items-center px-6 sm:px-12 py-4 sm:py-10">
                <section className="max-w-3xl w-full">
                    <span className="font-bold text-lg sm:hidden">KiwiClient</span>
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
                        A simple, private, and open source email client built for your self-hosted mail server. Sign in to your email server, Gmail, or Outlook.
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

                    <ul className="flex flex-col sm:flex-row items-center mt-6 sm:mt-12 gap-3 sm:gap-6 border-t border-kiwi-light-black pt-4 sm:pt-6 animate-kiwi-rise [animation-delay:650ms]">
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
                </section>

                <section className="flex flex-wrap items-center justify-center mt-4 gap-x-6 gap-y-2 pb-4 sm:pb-6 text-sm opacity-40">
                    <Link to="/privacy-policy" className="hover:opacity-60 transition-opacity duration-300">Privacy Policy</Link>
                    <Link to="/terms-of-service" className="hover:opacity-60 transition-opacity duration-300">Terms of Service</Link>
                    <a href="https://github.com/KiwiClientNet/KiwiClient" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity duration-300">GitHub</a>
                </section>
            </main>

        </div>
    );
}
