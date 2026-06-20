import { useEffect, useState } from "react";
import emailScreenImage from "../../assets/example_screenshots/email_screen.png";
import unreadImage from "../../assets/example_screenshots/unread.png";
import loginImage from "../../assets/example_screenshots/login.png";
import sendingImage from "../../assets/example_screenshots/sending.png";

const SLIDES = [
    { source: loginImage, alt: "Signing in to KiwiClient" },
    { source: emailScreenImage, alt: "The KiwiClient inbox" },
    { source: sendingImage, alt: "Composing and sending an email in KiwiClient" },
    { source: unreadImage, alt: "Unread messages in the KiwiClient inbox" },
];

const SLIDE_INTERVAL_MS = 4000;

export function Slideshow() {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const timer = setInterval(() => {
            setActiveIndex(previous => (previous + 1) % SLIDES.length);
        }, SLIDE_INTERVAL_MS);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="kiwi-panel w-full max-w-5xl overflow-hidden shadow-kiwi-black shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-kiwi-light-black">
                <span aria-hidden="true" className="size-3 rounded-full bg-kiwi-light-black" />
                <span aria-hidden="true" className="size-3 rounded-full bg-kiwi-light-black" />
                <span aria-hidden="true" className="size-3 rounded-full bg-kiwi-light-black" />
            </div>
            <div className="relative">
                <img src={SLIDES[0].source} alt="" aria-hidden="true" className="block w-full opacity-0" />
                {SLIDES.map((slide, index) => (
                    <img
                        key={slide.source}
                        src={slide.source}
                        alt={slide.alt}
                        loading="lazy"
                        decoding="async"
                        aria-hidden={index !== activeIndex}
                        className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
                    />
                ))}
            </div>
        </div>
    );
}
