/**
 * @brief Default content of the email pane when no message is selected.
 */

import Logo from "../../../components/Logo";
import ViewOnGitHub from "../../../components/ViewOnGitHub";

export function WelcomeMessage() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center-safe p-3 text-center gap-3">
            <h1 className="text-6xl font-bold">Welcome To Real Freedom</h1>
            <h2 className="text-4xl">Thank you for choosing KiwiClient: The free and open source email client</h2>
            <Logo link={false} />
            <div className="block w-1/2 border-kiwi-black p-2 rounded bg-kiwi-dark-black shadow-kiwi-black shadow-md">
                <p className="text-lg text-kiwi-light-grey">
                    Our mission is to deliver ad-free, tracking-free, and AI-free
                    software which makes your life easier. We are still in
                    development. Have feedback? Email <a href="mailto:admin@kiwiclient.net">admin@kiwiclient.net </a>
                    or open an issue on GitHub!
                </p>
            </div>
            <h3 className="text-2xl">Click an email to get started</h3>
            <ViewOnGitHub />
        </div>
    );
}
