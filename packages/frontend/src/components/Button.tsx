/**
 * @brief Shared button primitives used across the app.
 *
 * Exports two variants because the borderless variant is visually distinct
 * enough that consumers need to choose explicitly rather than passing a
 * boolean prop. Optionally renders a small inline icon to the right of
 * the text for branded buttons such as the Google login entry point.
 */

import type { MouseEventHandler } from "react";

interface ButtonProps {
    text: string;
    reverseColours?: boolean;
    disabled?: boolean;
    isLoading?: boolean;
    onClickFunction?: MouseEventHandler<HTMLButtonElement>;
    inlineImageSource?: string;
    inlineImageAltText?: string;
    title?: string;
}

export function Button({ text, reverseColours = false, disabled = false, isLoading = false, onClickFunction, inlineImageSource = "", inlineImageAltText = "", title }: ButtonProps) {
    return (
        <button
            onClick={onClickFunction}
            disabled={disabled}
            title={title}
            className={["whitespace-nowrap cursor-pointer w-full p-3 rounded-lg border border-solid disabled:cursor-default transition-colors duration-200 flex flex-row gap2 justify-center items-center",
                reverseColours ? "bg-kiwi-light-grey text-kiwi-black hover:bg-kiwi-white disabled:bg-kiwi-light-black disabled:text-kiwi-black" :
                    "bg-kiwi-middle-black text-kiwi-white hover:bg-kiwi-light-grey hover:text-kiwi-black disabled:bg-kiwi-light-black disabled:text-kiwi-black"].join()}
        >
            {isLoading && (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {text}
            {inlineImageSource.length > 0 && <img src={inlineImageSource} alt={inlineImageAltText} width={24} height={24} loading="lazy" decoding="async" />}
        </button>
    );
}

export function BorderlessButton({ text, disabled = false, onClickFunction, inlineImageSource = "", inlineImageAltText = "" }: ButtonProps) {
    return (
        <button
            onClick={onClickFunction}
            disabled={disabled}
            className="cursor-pointer w-full p-3 bg-kiwi-middle-black rounded-3xl text-kiwi-white hover:bg-kiwi-light-grey hover:text-kiwi-black disabled:bg-kiwi-light-black disabled:text-kiwi-black disabled:cursor-default transition-colors duration-200 flex flex-row gap-2 justify-center"
        >
            {text}
            {inlineImageSource.length > 0 && (
                <img src={inlineImageSource} alt={inlineImageAltText} width={24} height={24} loading="lazy" decoding="async" />
            )}
        </button>
    );
}
