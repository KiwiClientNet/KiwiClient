import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Logo from "../../components/Logo";
import { useSeo } from "../../hooks/useSeo";

export default function UnsubscribeFailed() {

    const navigate = useNavigate();
    const [seconds, setSeconds] = useState(10);

    useSeo({ title: "Unsubscribe failed — KiwiClient", noindex: true });

    useEffect(() => {
        if (seconds === 0) {
            navigate("/");
            return;
        }
        const timer = setInterval(() => {
            setSeconds(previous => previous - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [seconds, navigate]);

    return (

        <div className="flex flex-col items-center justify-center min-h-screen antialiased px-4 py-12 pb-64">
            <div className="flex flex-col sm:flex-row items-center">
                <Logo className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64" reverseLogo={true} />
                <h1 className="sm:text-5xl lg:text-7xl text-center sm:text-left font-bold"> KiwiClient </h1>
            </div>
            <h2 className="text-xl sm:text-xl lg:text-2xl mt-3 text-center font-bold">Something went wrong while trying to unsubscribe you</h2>
            <h2 className="text-xl sm:text-sm lg:text-xl md:text-md mt-3 text-center">You can try again or email&nbsp;
                <a href="mailto:admin@kiwiclient.net" className="underline hover:text-kiwi-info">admin@kiwiclient.net</a> to request removal from the waiting list.
            </h2>
            <p className="text-sm mt-3 text-center">Redirecting in {seconds} to the homepage.</p>

        </div>

    );
}
