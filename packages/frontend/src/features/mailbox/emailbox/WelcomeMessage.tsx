/**
 * @brief Default content of the email pane when no message is selected.
 */

import { Logo } from "../../../components/Logo";

export function WelcomeMessage() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-around p-3 text-center">
            <h1 className="text-4xl font-bold">Welcome to KiwiClient</h1>
            <p className="text-2xl">Lorem ipsum dolor sit amet, qui minim labore adipisicing minim sint cillum sint consectetur cupidatat.</p>
            <p>Click an email to get started</p>
            <Logo width={200} height={200} />
        </div>
    );
}
