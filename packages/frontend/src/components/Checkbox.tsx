/**
 * @brief Styled checkbox built on a hidden native input.
 *
 * The native input is kept inside the label so the entire shaded area is
 * clickable; the visible square is rendered through Tailwind state classes
 * driven by the peer-checked selector. Click propagation is stopped at the
 * label so containers that listen for clicks (such as the glance row) do
 * not also trigger when the checkbox is toggled.
 */

import { CheckIcon } from "@heroicons/react/24/solid";
import type { ChangeEvent, MouseEvent } from "react";

interface CheckboxProps {
    checked: boolean;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    className?: string;
}

export function Checkbox({ checked, onChange, className = "" }: CheckboxProps) {
    return (
        <label
            className={`relative flex items-center justify-center cursor-pointer ${className}`}
            onClick={(event: MouseEvent<HTMLLabelElement>) => event.stopPropagation()}
        >
            <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
            <div className="w-5 h-5 rounded border-2 border-kiwi-dark-grey bg-transparent peer-checked:bg-kiwi-green peer-checked:border-kiwi-green text-kiwi-black flex items-center justify-center">
                {checked && <CheckIcon />}
            </div>
        </label>
    );
}
