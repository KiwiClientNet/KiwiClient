import { useMemo } from "react";

export function useDebounce(callback: Function, delayMilliseconds: number) {

    // Adapted from https://decipher.dev/30-seconds-of-typescript/docs/debounce/
    const debounce = (fn: Function, ms = 3000) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return function(this: any, ...args: any[]) {
            const overrideArg = typeof (args[0]) === 'boolean' // Not sure if there's a better way to do this where the array is specified precisely
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), overrideArg ? 0 : ms);
        };
    };

    // Ensures that react doesn't create a new function for us on a re-render
    const debounceFunction = useMemo(() => debounce(callback, delayMilliseconds), []);

    return debounceFunction;
}
