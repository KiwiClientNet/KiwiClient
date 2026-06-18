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
    className?: string;
    link?: boolean;
    linkTo?: string;
    reverseLogo?: boolean;
}

export default function Logo({ className = "w-50 h-50", link = true, linkTo = "/", reverseLogo = false }: LogoProps) {
    const baseImage = (
        <img
            src={reverseLogo ? reverseLogoImage : logoImage}
            alt="The KiwiClient logo - a black kiwi bird"
            className={className}
            loading="lazy"
            decoding="async"
        />
    );
    const elementToReturn = link ? (<Link to={linkTo}> {baseImage} </Link>) : baseImage;
    return elementToReturn;
}
