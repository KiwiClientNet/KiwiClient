import { Link } from "react-router-dom";
import Logo from "../../components/Logo";
import { useSeo } from "../../hooks/useSeo";

export default function Unsubscribe() {
    useSeo({ title: "Unsubscribed — KiwiClient", noindex: true });

    return (

        <div className="flex flex-col items-center justify-center min-h-screen antialiased px-4 py-12 pb-64">
            <div className="flex flex-col sm:flex-row items-center">
                <Logo reverseLogo={true} className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64" />
                <h1 className="sm:text-5xl lg:text-7xl text-center sm:text-left font-bold"> KiwiClient </h1>
            </div>
            <h2 className="text-xl sm:text-xl lg:text-2xl mt-3 text-center font-bold">You have been successfully removed from the waitlist </h2>
            <h2 className="text-xl sm:text-sm lg:text-xl md:text-md mt-3 text-center">If this was a mistake, you can always rejoin by going to&nbsp;
                <Link to="/" className="underline hover:text-kiwi-info">the homepage</Link>.
            </h2>
        </div>

    );
}
