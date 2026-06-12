import { GoogleLoginBody, ServerLoginBody } from "@KiwiClient/shared";
import { TokenPayload } from "../auth_sessions.js";

export function getLoginRequestBodyFromResponseCookie(tokenPayload: TokenPayload, decryptFunction: (encryptedValue: string) => string): ServerLoginBody | GoogleLoginBody {
    const serverLoginType = tokenPayload.serverType;

    switch (serverLoginType) {
        case "GMAIL":
            return {
                email: tokenPayload.email,
                accessCode: decryptFunction(tokenPayload.encryptedPassword),
                googleRefreshToken: tokenPayload.oAuth2RefreshToken
                    ? decryptFunction(tokenPayload.oAuth2RefreshToken)
                    : undefined,
                serverType: "GMAIL"
            } as GoogleLoginBody;
        case "PRIVATE":
            return {
                email: tokenPayload.email,
                password: decryptFunction(tokenPayload.encryptedPassword),
                serverType: "PRIVATE",
                advancedConfig: tokenPayload.advancedConfig
            } as ServerLoginBody;
    }
}
