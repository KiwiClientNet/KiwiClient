/**
 * @brief Default content of the email pane when no message is selected.
 */

import Logo from "../../../components/Logo";
import ViewOnGitHub from "../../../components/ViewOnGitHub";

export function WelcomeMessage() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center-safe p-3 text-center gap-3">
            <h1 className="text-4xl font-bold">Welcome to KiwiClient</h1>
            <h2 className="text-2xl font-bold">The free and open source email client</h2>
            <h3 className="text-xl">Click an email to get started</h3>
            <p className="text-lg">Have feedback? Email <a href="mailto:admin@kiwiclient.net">admin@kiwiclient.net</a> or open an issue on GitHub!</p>
            <ViewOnGitHub />
            <Logo link={false} />
        </div>
    );
}
