import { GoogleLoginBody, ServerLoginBody } from "@KiwiClient/shared";
import { TokenPayload_t } from "../auth_sessions.js";

export function getLoginRequestBodyFromResponseCookie(tokenPayload: TokenPayload_t, decryptFunction: (encryptedValue: string) => string): ServerLoginBody | GoogleLoginBody {
    const serverLoginType = tokenPayload.serverType;

    switch (serverLoginType) {
        case "GMAIL":
            return { email: tokenPayload.email, accessCode: decryptFunction(tokenPayload.encryptedPassword), serverType: "GMAIL" } as GoogleLoginBody;
        case "PRIVATE":
            return { email: tokenPayload.email, password: decryptFunction(tokenPayload.encryptedPassword), serverType: "PRIVATE" } as ServerLoginBody;
    }
}
