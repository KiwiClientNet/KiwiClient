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

interface LogoProps extends React.HTMLAttributes<HTMLImageElement> {
    width?: number;
    height?: number;
    link?: boolean;
    reverseLogo?: boolean;
}

export default function Logo({ width = 200, height = 200, link = true, reverseLogo = false }: LogoProps) {
    const baseImage = (
        <img
            src={reverseLogo ? reverseLogoImage : logoImage}
            alt="The KiwiClient logo - a black kiwi bird"
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
        />
    );
    const elementToReturn = link ? (<Link to="/"> {baseImage} </Link>) : baseImage;
    return elementToReturn;
}
