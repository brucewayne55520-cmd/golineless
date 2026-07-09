import express, { type Express, type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import cookieParser from "cookie-parser";

// Derive __dirname at runtime from import.meta.url (works correctly in esbuild-bundled ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import multer from "multer";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { uploadFile } from "./lib/storage";
import { globalErrorHandler, notFoundHandler } from "./lib/error-handler";

const app: Express = express();

// Trust the first proxy (LiteSpeed/cPanel) so X-Forwarded-For headers don't crash express-rate-limit
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// --- Rate Limiting (env-configurable) ---
const getRateLimit = (defaultMax: number, windowMinutes = 1, label: string) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: Number(process.env[`RATE_LIMIT_${label}`] ?? defaultMax),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: `Too many requests. Please slow down.` },
  });

const globalLimiter = getRateLimit(100, 1, "GLOBAL");
const otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: Number(process.env["RATE_LIMIT_OTP"] ?? 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP attempts. Please try again later." },
});
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env["RATE_LIMIT_BOOKING"] ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many bookings. Please try again later." },
});
const dispatchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env["RATE_LIMIT_DISPATCH"] ?? 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many dispatch requests. Please slow down." },
});

// --- Fix #1: Raw body capture for webhook signature verification ---
// This middleware captures the raw body BEFORE express.json() parses it.
// Only active for /api/payments/webhook path so other routes aren't affected.
app.use((req: Request, _res: Response, next) => {
  if (req.path === "/api/payments/webhook") {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      req.rawBody = Buffer.concat(chunks).toString("utf-8");
      next();
    });
  } else {
    next();
  }
});

app.use(globalLimiter);

// --- CORS: restrict to configured origins in production ---
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || ["http://localhost:3000", "http://localhost:5173"];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, curl)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(cookieParser());

// --- CSRF Token Cookie (double-submit pattern) ---
// Browsers automatically send cookies on same-origin requests. We set a non-httOnly
// CSRF token cookie and require it as a header on state-changing requests. This
// blocks simple cross-origin form submissions (no CORS preflight) from forging
// state-changing requests.
const CSRF_COOKIE_NAME = "_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
app.use((req: Request, res: Response, next) => {
  // On any GET/HEAD/OPTIONS request, ensure a CSRF cookie exists
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      const csrfToken = crypto.randomBytes(32).toString("hex");
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }
    return next();
  }

  // For state-changing methods, validate CSRF token
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  // Skip CSRF for webhook endpoints (Razorpay sends its own signatures)
  if (req.path === "/api/payments/webhook") return next();

  // Skip CSRF for Bearer-authenticated requests (Authorization header prevents CSRF)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return next();

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: "CSRF token missing or invalid" });
    return;
  }
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- Photo Upload Endpoint ---
// In production with B2 configured: uploads to cloud storage
// In dev / without B2: stores to local disk
const uploadsDir = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadsDir));

const photoStorage = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

app.post("/api/upload", photoStorage.single("photo"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const buffer = fs.readFileSync(req.file.path);

  // Try B2 upload first
  const b2Result = await uploadFile(buffer, req.file.originalname);
  if (b2Result) {
    // Clean up local temp file
    try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    res.json({ url: b2Result.url, key: b2Result.key, filename: req.file.originalname });
    return;
  }

  // Fallback: save to local disk
  const ext = path.extname(req.file.originalname) || ".jpg";
  const newName = `${crypto.randomUUID()}${ext}`;
  const localPath = path.join(uploadsDir, newName);
  fs.renameSync(req.file.path, localPath);
  logger.info({ filename: newName }, "Photo saved to local disk (B2 not configured)");
  res.json({ url: `/uploads/${newName}`, filename: newName });
});

// --- Request Timeout Middleware (#88) ---
// Prevent hung DB queries from blocking forever
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 30_000); // 30s default
app.use((req: Request, res: Response, next) => {
  // Don't timeout webhook endpoints (Razorpay can take a while)
  if (req.path === "/api/payments/webhook") { next(); return; }
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: "Request timed out. Please try again." });
    }
  }, REQUEST_TIMEOUT_MS);
  res.on("finish", () => clearTimeout(timer));
  next();
});

// --- Apply rate limiters per-route ---
// A4: Separate rate limiter for OTP send (shorter window, prevents SMS abuse without blocking verify)
const otpSendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: Number(process.env["RATE_LIMIT_OTP_SEND"] ?? 3), // 3 OTPs per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please wait before trying again." },
});
app.use("/api/auth/send-otp", otpSendLimiter);
app.use("/api/tasks/:id/verify-otp", otpLimiter);
app.use("/api/tasks/:id/confirm-cash", otpLimiter); // (#23) Rate limit confirm-cash
app.use("/api/tasks/:id/confirm-cash-user", rateLimit({ windowMs: 60 * 60 * 1000, max: Number(process.env["RATE_LIMIT_CONFIRM_USER"] ?? 10), standardHeaders: true, legacyHeaders: false, message: { error: "Too many confirm/dispute attempts." } })); // (#27)
app.use("/api/tasks/:id/refund", rateLimit({ windowMs: 60 * 60 * 1000, max: Number(process.env["RATE_LIMIT_REFUND"] ?? 5), standardHeaders: true, legacyHeaders: false, message: { error: "Too many refund requests." } })); // (#28)
app.use("/api/tasks/:id/accept", dispatchLimiter);
app.use("/api/verification/sessions/:id/photo", rateLimit({ windowMs: 60 * 1000, max: Number(process.env["RATE_LIMIT_VERIFICATION"] ?? 10), standardHeaders: true, legacyHeaders: false, message: { error: "Too many photo verification attempts. Please slow down." } }));
app.post("/api/tasks", bookingLimiter);

// B8: Rate limiting on GPS endpoints (using getRateLimit helper for consistency)
const gpsLimiter = getRateLimit(20, 1, "GPS");
const gpsBgLimiter = getRateLimit(30, 1, "GPS_BG");
app.use("/api/runners/me/gps-check", gpsLimiter);
app.use("/api/runners/me/gps-background", gpsBgLimiter);

// H11: Rate limiting on admin API routes
const adminLimiter = getRateLimit(60, 1, "ADMIN");
app.use("/api/admin", adminLimiter);

// Rate limit login to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env["RATE_LIMIT_LOGIN"] ?? 10), // 10 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});
app.post("/api/auth/login", loginLimiter);

// Rate limit signup to prevent mass account creation
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: Number(process.env["RATE_LIMIT_SIGNUP"] ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts. Please try again later." },
});
app.post("/api/auth/signup", signupLimiter);

// --- CSRF Protection (L4): Bearer token auth prevents CSRF inherently (browser won't send Authorization headers cross-origin).
// With httpOnly cookies, SameSite=Strict setting prevents CSRF. This middleware is a no-op safety net.
// If switching to SameSite=None cookies in the future, implement proper CSRF token validation here.
app.use("/api", router);

// --- Serve built frontend SPA static files ---
// Resolve public/ directory. esbuild bundles everything into dist/index.mjs,
// so __dirname = api-server/dist/ and __dirname/../public = api-server/public/
// Use process.cwd() fallback for environments where __dirname resolves differently.
const _publicDirCandidates = [
  path.join(__dirname, "..", "public"),
  path.join(process.cwd(), "artifacts", "api-server", "public"),
];
const publicDir = _publicDirCandidates.find(d => fs.existsSync(path.join(d, "index.html"))) ?? _publicDirCandidates[0];

// --- Fix favicon 404: serve favicon.svg when /favicon.ico is requested ---
const faviconSvgPath = path.join(publicDir, "favicon.svg");
if (fs.existsSync(faviconSvgPath)) {
  app.get("/favicon.ico", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(faviconSvgPath);
  });
}

app.use(express.static(publicDir));

// --- SPA catch-all: serve index.html for client-side routing ---
// After API routes and static files are checked, any unmatched GET request
// gets index.html so React Router can handle it (no more refresh 404s).
app.get("/*splat", (req: Request, res: Response, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(publicDir, "index.html"), (err) => {
    if (err) next(err);
  });
});

// --- Error handling (last middleware) ---
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
