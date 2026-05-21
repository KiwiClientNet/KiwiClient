/**
 * @brief Hook that reports whether a referenced element is currently visible in the viewport.
 *
 * Used by the glance list to trigger pagination when the user scrolls within
 * a few rows of the bottom. Built on IntersectionObserver so it does not
 * fire on every scroll event.
 */

import { useEffect, useMemo, useState, type RefObject } from "react";

/**
 * @brief Observes a DOM element and returns whether it currently intersects the viewport.
 *
 * @param elementRef - A ref pointing at the element to watch.
 * @returns True when the element is intersecting the viewport.
 */
export function useOnScreen(elementRef: RefObject<HTMLElement | null>): boolean {
    const [isIntersecting, setIsIntersecting] = useState(false);

    const intersectionObserver = useMemo(
        () => new IntersectionObserver(([entry]) => setIsIntersecting(entry.isIntersecting)),
        [elementRef]
    );

    useEffect(() => {
        if (elementRef.current === null) {
            return;
        }

        intersectionObserver.observe(elementRef.current);
        return () => intersectionObserver.disconnect();
    }, [elementRef, intersectionObserver]);

    return isIntersecting;
}
