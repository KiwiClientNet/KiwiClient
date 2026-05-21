/**
 * @brief Authentication primitives shared by the route layer.
 *
 * Provides three concerns as standalone functions rather than a class because
 * none of them share state between calls: symmetric encryption of the IMAP
 * credentials, signing and verification of JWTs, and reading environment
 * variables with a hard failure when missing.
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import "dotenv/config";

/**
 * @brief Reads a required environment variable, throwing when absent.
 *
 * Used at module load so misconfigured deployments fail fast instead of
 * crashing at the first request that needs the value.
 *
 * @param name - The environment variable name.
 * @returns The variable's value as a string.
 * @throws Error when the variable is unset or empty.
 */
export function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
};

const JWT_SECRET = getEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = getEnv("JWT_REFRESH_SECRET");
const ENCRYPT_KEY = Buffer.from(getEnv("ENCRYPT_KEY"), "hex");

export interface TokenPayload_t {
    email: string;
    encryptedPassword: string;
    serverType: "GMAIL" | "PRIVATE";
}

/**
 * @brief Encrypts a plaintext string using AES-256-GCM.
 *
 * Generates a random initialisation vector each call so identical inputs
 * produce different ciphertexts. Returns iv, auth tag, and ciphertext joined
 * with colons so the decryptor only needs the single returned string.
 *
 * @param text - The plaintext to encrypt.
 * @returns A colon-delimited string of hex-encoded iv, tag, and ciphertext.
 */
export function encrypt(text: string): string {
    const initialisationVector = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPT_KEY, initialisationVector);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${initialisationVector.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * @brief Decrypts a string produced by encrypt.
 *
 * Splits the input into iv, auth tag, and ciphertext, then verifies the auth
 * tag before decrypting. Tampered ciphertexts throw rather than returning
 * garbled plaintext.
 *
 * @param text - The colon-delimited encrypted string.
 * @returns The recovered plaintext.
 * @throws Error when the auth tag does not validate or the format is wrong.
 */
export function decrypt(text: string): string {
    const [iv, tag, encrypted] = text.split(":").map(component => Buffer.from(component, "hex"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPT_KEY, iv!);
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(encrypted!), decipher.final()]).toString("utf8");
}

/**
 * @brief Issues a short-lived JWT access token for the given payload.
 *
 * @param payload - The user identity and stored IMAP credentials.
 * @param expiryMinutes - Lifetime in minutes; the default matches a refresh-on-401 flow.
 * @returns The signed token string.
 */
export function issueAccessToken(payload: TokenPayload_t, expiryMinutes: number = 15): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: `${Math.round(expiryMinutes)}m` });
}

/**
 * @brief Issues a long-lived JWT refresh token for the given payload.
 *
 * No expiry is set on the token itself; the rememberMe cookie's maxAge is
 * what bounds the session lifetime in the browser.
 */
export function issueRefreshToken(payload: TokenPayload_t): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET);
}

/**
 * @brief Verifies an access token, returning the decoded payload.
 *
 * @param tokenToCheck - The access token to verify.
 * @returns The decoded token payload.
 * @throws Error when the token is invalid, expired, or tampered with.
 */
export function verifyAccessToken(tokenToCheck: string): TokenPayload_t {
    const { iat, exp, ...payload } = jwt.verify(tokenToCheck, JWT_SECRET) as TokenPayload_t & { iat?: number; exp?: number };
    return payload;
}

/**
 * @brief Verifies a refresh token, returning the decoded payload.
 *
 * @param tokenToCheck - The refresh token to verify.
 * @returns The decoded token payload.
 * @throws Error when the token is invalid or tampered with.
 */
export function verifyRefreshToken(tokenToCheck: string): TokenPayload_t {
    const { iat, exp, ...payload } = jwt.verify(tokenToCheck, JWT_REFRESH_SECRET) as TokenPayload_t & { iat?: number; exp?: number };
    return payload;
}
