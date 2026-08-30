import { useEffect, useMemo, useRef } from "react";

type DebouncedFunction<T extends (...args: any[]) => any> = (...args: Parameters<T>) => ReturnType<T> | void;

export function useDebounce<T extends (...args: any[]) => any>(callback: T, delayMilliseconds: number): [DebouncedFunction<T>, () => void] {
    const callbackRef = useRef(callback);
    const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        callbackRef.current = callback;
    });

    const cancel = () => {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = undefined;
    };

    // Adapted from https://decipher.dev/30-seconds-of-typescript/docs/debounce/
    const debounceFunction = useMemo(() => {
        const debounced: DebouncedFunction<T> = function(this: unknown, ...args: Parameters<T>) {
            const forceImmediate = args[0] === true;
            clearTimeout(timeoutIdRef.current);
            if (forceImmediate) {
                return callbackRef.current.apply(this, args);
            }
            timeoutIdRef.current = setTimeout(
                () => callbackRef.current.apply(this, args),
                delayMilliseconds
            );
        };
        return debounced;
    }, [delayMilliseconds]);

    return [debounceFunction, cancel];
}
