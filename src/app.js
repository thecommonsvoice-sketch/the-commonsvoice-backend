import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit"; // Ensure rateLimit is installed
// Import route modules
import authRoutes from "./routes/auth.routes.js";
import articleRoutes from "./routes/article.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import adminRoutes from "./routes/adminRoutes.js"; // Correct file naming to be consistent
import commentRoutes from "./routes/comment.routes.js";
import bookmarkRoutes from "./routes/bookmark.routes.js";
const app = express();
// Set up security and standard middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || "https://localhost:3000", // Prefer a default value over a wildcard
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(morgan("dev")); // Use 'dev' for development, 'combined' or 'tiny' for production
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // Add body parser for URL-encoded data
// Set up compression
// Note: This filter is unnecessary as `compression` already handles HTTP status codes.
app.use(compression());
// Set up rate limiting
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Max 500 requests per 15 minutes
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
}));
// Health check route
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});
// Mount route handlers
app.use("/api/auth", authRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
// Export the configured Express app
export default app;
