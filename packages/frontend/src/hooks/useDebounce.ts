import { useEffect, useMemo, useRef } from "react";

export function useDebounce(callback: Function, delayMilliseconds: number) {
    const callbackRef = useRef(callback);
    const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        callbackRef.current = callback;
    });

    // Adapted from https://decipher.dev/30-seconds-of-typescript/docs/debounce/
    const debounceFunction = useMemo(() => {
        return function(this: any, ...args: any[]) {
            const forceImmediate = args[0] === true;
            clearTimeout(timeoutIdRef.current);
            if (forceImmediate) {
                // Sync call: reads form/editor before any following clear runs
                return callbackRef.current.apply(this, args);
            }
            timeoutIdRef.current = setTimeout(
                () => callbackRef.current.apply(this, args),
                delayMilliseconds
            );
        };
    }, [delayMilliseconds]);
    return debounceFunction;
}
