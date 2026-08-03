import { useEffect, useRef } from "react";

export default function useClickOutside(callbackFunction: () => void) {

    let domNodeRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let handler = (event: MouseEvent) => {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            if (!domNodeRef.current?.contains(target)) {
                callbackFunction();
            }
        }

        document.addEventListener("mousedown", handler);

        return () => {
            document.removeEventListener("mousedown", handler);
        }
    }, []);

    return domNodeRef;
}
