/**
 * @brief Placeholder page for sections that are linked but not yet written.
 *
 * Exists so the About and Guide URLs are real and shareable from day one;
 * each route passes its own title and pitch.
 */

import { Link } from "react-router-dom";
import Logo from "../../components/Logo";
import ViewOnGitHub from "../../components/ViewOnGitHub";

interface ComingSoonProps {
    title: string;
    description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6 gap-4">
            <Logo className="w-24 h-24" reverseLogo={true} />
            <h1 className="text-4xl sm:text-5xl font-bold animate-kiwi-rise">
                {title}<span className="text-kiwi-green">.</span>
            </h1>
            <p className="text-kiwi-green font-bold tracking-[0.25em] uppercase text-xs animate-kiwi-rise [animation-delay:100ms]">Coming soon</p>
            <p className="max-w-md opacity-70 animate-kiwi-rise [animation-delay:200ms]">{description}</p>
            <p className="max-w-md opacity-70 animate-kiwi-rise [animation-delay:200ms]">Can't wait? Let us know! Email <a href="mailto:admin@kiwiclient.net">admin@kiwiclient.net</a> or notify us on GitHub.</p>
            <span className="max-w-md opacity-70 animate-kiwi-rise [animation-delay:300ms]">
                <ViewOnGitHub />
            </span>
            <Link
                to="/"
                className="mt-4 no-underline font-bold border border-kiwi-light-black px-6 py-3 rounded-xl hover:border-kiwi-middle-grey hover:text-kiwi-white transition-colors duration-200 animate-kiwi-rise [animation-delay:400ms]"
            >
                Back to home
            </Link>
        </div>
    );
}
