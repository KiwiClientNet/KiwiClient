/**
 * @brief Shared button primitives used across the app.
 *
 * Exports two variants because the borderless variant is visually distinct
 * enough that consumers need to choose explicitly rather than passing a
 * boolean prop. Optionally renders a small inline icon to the right of
 * the text for branded buttons such as the Google login entry point.
 */

import type { MouseEventHandler, ReactNode } from "react";

type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    text: string;
    reverseColours?: boolean;
    disabled?: boolean;
    isLoading?: boolean;
    onClickFunction?: MouseEventHandler<HTMLButtonElement>;
    inlineImageSource?: string;
    inlineImageAltText?: string;
    title?: string;
    buttonSize?: ButtonSize;
    icon?: ReactNode;
}

/**
 * Size variants only change padding, radius, font size, and (for `lg`) the
 * `w-full` block layout. Colors and hover states stay identical across
 * sizes so the brand language is consistent.
 *
 * `lg` is the default to preserve existing callers (login form, signup,
 * sidebar "New Message") that expect a full-width pill.
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: 'px-2 py-1 rounded-md text-xs gap-1',
    md: 'px-3 py-1.5 rounded-md text-sm gap-2',
    lg: 'p-3 rounded-lg text-base gap-2 w-full',
};

export function Button({
    text,
    reverseColours = false,
    disabled = false,
    isLoading = false,
    onClickFunction,
    inlineImageSource = "",
    inlineImageAltText = "",
    title,
    buttonSize: size = 'lg',
    icon,
    className,
    ...rest
}: ButtonProps) {
    const iconOnly = text.length === 0;
    return (
        <button
            onClick={onClickFunction}
            disabled={disabled}
            title={title}
            aria-label={iconOnly ? title : undefined}
            className={[
                "whitespace-nowrap cursor-pointer font-bold border border-solid disabled:cursor-default transition-colors duration-200 flex flex-row justify-center items-center",
                SIZE_CLASSES[size],
                iconOnly ? "aspect-square" : "",
                reverseColours
                    ? "bg-kiwi-green border-kiwi-green text-kiwi-black hover:bg-kiwi-white hover:border-kiwi-green disabled:bg-kiwi-light-black disabled:border-kiwi-light-black disabled:text-kiwi-middle-grey"
                    : "bg-kiwi-middle-black border-kiwi-light-black text-kiwi-white hover:border-kiwi-green hover:text-kiwi-green disabled:bg-kiwi-light-black disabled:text-kiwi-middle-grey",
                className ?? "",
            ].filter(Boolean).join(" ")}
            {...rest}
        >
            {isLoading && (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {icon}
            {inlineImageSource.length > 0 && <img src={inlineImageSource} alt={inlineImageAltText} width={24} height={24} loading="lazy" decoding="async" />}
            {text}
        </button>
    );
}

export function BorderlessButton({ text, disabled = false, onClickFunction, inlineImageSource = "", inlineImageAltText = "" }: ButtonProps) {
    return (
        <button
            onClick={onClickFunction}
            disabled={disabled}
            className="cursor-pointer w-full p-3 rounded-xl opacity-70 hover:opacity-100 hover:bg-kiwi-light-black disabled:opacity-40 disabled:cursor-default transition-all duration-200 flex flex-row gap-2 justify-center"
        >
            {text}
            {inlineImageSource.length > 0 && (
                <img src={inlineImageSource} alt={inlineImageAltText} width={24} height={24} loading="lazy" decoding="async" />
            )}
        </button>
    );
}
