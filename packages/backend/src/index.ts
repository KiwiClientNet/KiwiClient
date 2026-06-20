/**
 * @brief Express app entry point. Configures middleware and mounts routes.
 *
 * CORS is restricted to the known local development origins plus the
 * Capacitor schemes used by the mobile shell builds.
 */

import express from "express";
import type { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import healthRoutes from "./routes/health.js";
import mailboxRoutes from "./routes/mailboxes.js";
import messageRoutes from "./routes/messages.js";
import partRoutes from "./routes/parts.js";
import waitlistRoutes from "./routes/waitlist.js";
import { getEnv } from "./auth_sessions.js";

const DEFAULT_PORT = 3001;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const ALLOWED_ORIGINS: string[] = getEnv("CORS_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const app = express();
app.set("trust proxy", 1); // Trust first hop (the local reverse proxy)
app.use(helmet());

app.use(cors({
    credentials: true,
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Per-route rate limiters live in middleware/rateLimiter.ts and are mounted on
// the abuse-prone unauthenticated endpoints (login, refresh).
// Authenticated routes sit behind requireAuth, so a flooded request implies a
// compromised session rather than anonymous abuse and is a different threat model.

app.use(express.json());
app.use(cookieParser());

app.use("/api", authRoutes);
app.use("/api", healthRoutes);
app.use("/api", waitlistRoutes);
app.use("/api", mailboxRoutes);
app.use("/api", messageRoutes);
app.use("/api", partRoutes);

/**
 * @brief Final error handler that hides internal failures behind a generic 500.
 *
 * CORS errors are caught explicitly so the response shape stays consistent
 * with the rest of the API and the underlying message is never leaked.
 */
app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
    if (error.message === "Not allowed by CORS") {
        response.status(403).json({ success: false, code: "AUTH_REQUIRED", message: "Forbidden" });
        return;
    }
    console.error(error);
    response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Backend listening on :${PORT} (commit ${process.env.GIT_COMMIT ?? 'dev'})`));
