/**
 * @brief Brand logo components used in the login page and welcome screen.
 *
 * The two variants point at different image assets rather than recolouring a
 * single source so the assets can be tuned independently for light and
 * dark backgrounds.
 */

import { Link } from "react-router-dom";
import reverseLogoImage from "../assets/logos/kiwi-logo-white.svg";
import logoImage from "../assets/logos/kiwi-logo.svg";

interface LogoProps {
    width?: number;
    height?: number;
    className?: string;
}

export function ReverseLogo({ width, height, className }: LogoProps) {
    return (
        <Link to="/">
            <img
                src={reverseLogoImage}
                alt="A reverse KiwiClient logo - a white kiwi bird"
                width={width}
                height={height}
                className={className}
                loading="lazy"
                decoding="async"
            />
        </Link>
    );
}

export function Logo({ width, height, className }: LogoProps) {
    return (
        <Link to="/">
            <img
                src={logoImage}
                alt="The KiwiClient logo - a black kiwi bird"
                width={width}
                height={height}
                className={className}
                loading="lazy"
                decoding="async"
            />
        </Link>
    );
}
