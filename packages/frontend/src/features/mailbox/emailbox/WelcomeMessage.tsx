/**
 * @brief Default content of the email pane when no message is selected.
 *
 * Sits on the dark app shell (the light reading surface only appears once
 * an email is open) and echoes the landing page's manifesto styling.
 */

import Logo from "../../../components/Logo";
import ViewOnGitHub from "../../../components/ViewOnGitHub";

export function WelcomeMessage() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center-safe p-6 text-center gap-4">
            <Logo link={false} reverseLogo={true} />
            <h1 className="text-4xl lg:text-5xl font-bold">An inbox that's truly yours<span className="text-kiwi-green">.</span></h1>
            <h2 className="text-xl lg:text-2xl opacity-80">Thank you for choosing KiwiClient: the free and open source email client</h2>
            <div className="kiwi-panel max-w-xl p-4">
                <p className="text-base opacity-80">
                    Our mission is to deliver ad-free, tracking-free, and AI-free
                    software which makes your life easier. We are still in
                    development. Have feedback? Email <a href="mailto:admin@kiwiclient.net">admin@kiwiclient.net</a>
                    {" "}or open an issue on GitHub!
                </p>
            </div>
            <p className="kiwi-eyebrow">Click an email to get started</p>
            <ViewOnGitHub />
        </div>
    );
}
