/**
 * @brief Stub "Sign in with Microsoft" button.
 *
 * The mark is the official four-square logo drawn inline (red, green, blue,
 * yellow) rather than shipped as an image, so there is no asset to recolour or
 * go stale.
 */

import { Button } from "../../components/Button";

function MicrosoftMark() {
    return (
        <svg viewBox="0 0 21 21" className="size-6" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
    );
}

interface MicrosoftLoginProps {
    isDisabled: boolean;
}

export function MicrosoftLogin({ isDisabled }: MicrosoftLoginProps) {
    return (
        <Button
            text="Sign in with Microsoft"
            disabled={isDisabled}
            icon={<MicrosoftMark />}
        />
    );
}
