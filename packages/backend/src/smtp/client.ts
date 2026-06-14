/**
 * @brief SMTP client wrapper that mirrors the ImapInstance lifecycle contract.
 *
 * No code outside this folder should import from nodemailer. The wrapper owns
 * transport creation, login dispatch by server type, and the mapping of
 * nodemailer errors onto the shared ClientStatus taxonomy so the connection
 * pool can manage SMTP and IMAP clients through the same interface.
 */

import { DEFAULT_SMTP_PORT, EmailMessage, EmailToSend, type GoogleLoginBody, type ServerLoginBody } from "@KiwiClient/shared";
import nodemailer, { type Transporter } from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { AbstractClient } from "../utils/abstract_client.js";
import { ClientStatus } from "../utils/status.js";
import Mail from "nodemailer/lib/mailer/index.js";
import MimeNode from "nodemailer/lib/mime-node/index.js";

const SMTP_IMPLICIT_TLS_PORT = 465;

// Bounds the TCP connect and server greeting so a wrong host or port fails
// in seconds instead of hanging until the OS socket timeout (~2 minutes).
const CONNECT_TIMEOUT_MS = 10 * 1000;

export class SmtpInstance extends AbstractClient<Transporter> {

    protected _client: undefined | Transporter;

    /**
     * @brief Maps a thrown nodemailer error onto the internal status taxonomy.
     */
    protected _setStatusFromError(thrownError: any): void {
        if (thrownError.code === "EDNS" || thrownError.code === "ENOTFOUND") {
            this._status = ClientStatus.NO_SERVER;
            return;
        }
        if (["ESOCKET", "ECONNECTION", "ETIMEDOUT", "ECONNREFUSED", "ECONNRESET"].includes(thrownError.code)) {
            this._status = ClientStatus.NOT_CONNECTED;
            return;
        }
        if (thrownError.code === "EAUTH") {
            this._status = ClientStatus.AUTH_ERROR;
            return;
        }
        this._status = ClientStatus.UNKNOWN_ERROR;
    }

    /**
     * @brief Builds the nodemailer options for a private SMTP server login.
     *
     * Falls back to the email domain prefixed with "mail.", matching the IMAP
     * convention. Port 465 is implicit TLS; any other port (including the 587
     * default) opens in plaintext and upgrades via STARTTLS, with requireTLS
     * forbidding the plaintext fallback when the upgrade fails.
     */
    private _buildPrivateLoginOptions(loginRequest: ServerLoginBody): SMTPTransport.Options {
        const [user, hostname] = loginRequest.email.split("@");
        const port = loginRequest.advancedConfig?.smtpPort ?? DEFAULT_SMTP_PORT;

        return {
            host: loginRequest.advancedConfig?.smtpHost ?? `mail.${hostname}`,
            port,
            secure: port === SMTP_IMPLICIT_TLS_PORT,
            requireTLS: true,
            auth: {
                user: `${user}`,
                pass: loginRequest.password
            },
            logger: false
        };
    }

    /**
     * @brief Builds the nodemailer options for a Gmail OAuth2 login.
     *
     * Uses port 465 with implicit TLS to mirror the IMAP Gmail setup, and
     * the same OAuth2 access token that authenticated the IMAP session.
     */
    private _buildGmailLoginOptions(loginRequest: GoogleLoginBody): SMTPTransport.Options {
        return {
            host: "smtp.gmail.com",
            port: SMTP_IMPLICIT_TLS_PORT,
            secure: true,
            auth: {
                type: "OAuth2",
                user: loginRequest.email,
                accessToken: loginRequest.accessCode
            },
            logger: false
        };
    }

    /**
     * @brief Converts an `EmailToSend` type to a `Mail.Options` type
     *
     * @param message - The message to convert
     * @returns The flattened Mail.Options type
     */
    private _flattenEmailToSend(message: EmailToSend): Mail.Options {
        return ({
            from: `${message.from.name} <${message.from.address}>`,
            to: message.to.map(person => person.address).join(", "),
            cc: message.cc.map(person => person.address).join(", "),
            bcc: message.bcc.map(person => person.address).join(", "),
            replyTo: message.replyTo.map(person => person.address).join(", "),
            subject: message.subject,
            text: message.text ?? '',
            html: message.html ?? '',
        });
    }

    /**
     * @brief Connects to the SMTP server and verifies the supplied credentials.
     *
     * Creates a pooled transport so subsequent sends reuse the authenticated
     * socket, then issues a verify round trip (connect, EHLO, AUTH) so bad
     * credentials surface here rather than on the first send.
     *
     * @param loginRequest - The validated login body for either Gmail or a private server.
     * @returns The terminal status reached during the login attempt.
     */
    async loginToEmailServer(loginRequest: ServerLoginBody | GoogleLoginBody): Promise<ClientStatus> {
        if (this._isAuthenticated()) {
            return this._status;
        }

        let loginOptions: SMTPTransport.Options;
        switch (loginRequest.serverType) {
            case "PRIVATE":
                loginOptions = this._buildPrivateLoginOptions(loginRequest);
                break;
            case "GMAIL":
                loginOptions = this._buildGmailLoginOptions(loginRequest);
                break;
            default:
                this._status = ClientStatus.UNDEFINED;
                return this._status;
        }

        try {
            this._client = nodemailer.createTransport({
                ...loginOptions,
                pool: true,
                connectionTimeout: CONNECT_TIMEOUT_MS,
                greetingTimeout: CONNECT_TIMEOUT_MS
            });
            await this._client.verify();
            this._status = ClientStatus.LOGGED_IN;
        } catch (thrownError: any) {
            this._client?.close();
            this._client = undefined;
            this._setStatusFromError(thrownError);
        }

        return this._status;
    }

    /**
     * @brief Closes the pooled transport and clears local state.
     */
    async logoutFromEmailServer(): Promise<boolean> {
        if (this._status === ClientStatus.LOGGED_OUT || !this._client) {
            return false;
        }

        this._client.close();
        this._client = undefined;
        this._status = ClientStatus.LOGGED_OUT;
        return true;
    }

    /**
     * @brief Re-verifies the transport to detect revoked credentials or a dead server.
     */
    async isAlive(): Promise<boolean> {
        if (!this._client) {
            return false;
        }

        try {
            await this._client.verify();
            return true;
        } catch {
            return false;
        }
    }

    compileEmail(message: EmailToSend): MimeNode {
        const mail = new MailComposer(this._flattenEmailToSend(message));
        return mail.compile();
    }

    async sendEmail(message: EmailToSend): Promise<boolean> {
        if (!this._client) {
            return false;
        }

        try {
            const info = await this._client.sendMail(this._flattenEmailToSend(message));

            console.log("Message sent: %s", info.messageId);

            return true;

        } catch (error: any) {
            console.error("Error while sending mail:", error);
            return false;
        }

    }
}
