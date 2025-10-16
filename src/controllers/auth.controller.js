import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, getCookieOptions, } from "../config/authCookies.js";
import { signAccessToken, signRefreshToken, verifyToken, genJti } from "../utils/tokens.js";
const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});
const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});
async function issueTokensAndCookies(res, userId, role, email, oldJti) {
    if (oldJti) {
        await prisma.refreshToken.updateMany({
            where: { jti: oldJti, userId, revoked: false },
            data: { revoked: true },
        });
    }
    const jti = genJti();
    const basePayload = { userId, role, email };
    const access = signAccessToken(basePayload);
    const refresh = signRefreshToken({ ...basePayload, jti });
    await prisma.refreshToken.create({
        data: {
            jti,
            userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    const base = getCookieOptions();
    res.cookie(ACCESS_TOKEN_COOKIE, access, base); // Use maxAge from getCookieOptions
    res.cookie(REFRESH_TOKEN_COOKIE, refresh, base); // Use maxAge from getCookieOptions
}
export const register = async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation failed",
            errors: parsed.error.flatten(),
        });
        return;
    }
    const { name, email, password } = parsed.data;
    try {
        // Check if the email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: "Email already exists" });
            return;
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create the user in the database
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword },
            select: { id: true, name: true, email: true, role: true },
        });
        // Issue tokens and set cookies
        await issueTokensAndCookies(res, user.id, user.role, user.email);
        // Attach the user to req.user
        req.user = {
            userId: user.id,
            role: user.role
        };
        // Respond with the created user (excluding sensitive data)
        res.status(201).json({
            message: "Registration successful",
            user,
        });
    }
    catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
export const login = async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation failed",
            errors: parsed.error.flatten(),
        });
        return;
    }
    const { email, password } = parsed.data;
    try {
        // Find user including password (to compare)
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, password: true, role: true },
        });
        if (!user) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        // Issue tokens & cookies immediately
        await issueTokensAndCookies(res, user.id, user.role, user.email);
        // Attach user to req.user
        req.user = {
            userId: user.id,
            role: user.role
        };
        // Exclude password from response
        const { password: _, ...safeUser } = user;
        res.json({
            message: "Login successful",
            user: safeUser,
        });
    }
    catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// POST /auth/refresh — verify, check DB, rotate
export const refresh = async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
        res.status(401).json({ message: "No refresh token" });
        return;
    }
    try {
        const payload = verifyToken(refreshToken);
        if (payload.type !== "refresh") {
            res.status(401).json({ message: "Invalid refresh token" });
            return;
        }
        // Check DB status
        const record = await prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
        if (!record || record.revoked || record.userId !== payload.userId || record.expiresAt < new Date()) {
            res.status(401).json({ message: "Refresh token revoked/expired" });
            return;
        }
        // Rotate: revoke old, issue new pair
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true },
        });
        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }
        await issueTokensAndCookies(res, user.id, user.role, user.email, payload.jti);
        // Attach user to req.user
        req.user = {
            userId: user.id,
            role: user.role
        };
        res.json({ message: "Refreshed" });
    }
    catch (error) {
        console.error("Error during token refresh:", error);
        res.status(401).json({ message: "Invalid or expired refresh token" });
    }
};
// POST /auth/logout — revoke current refresh (if present) and clear cookies
export const logout = async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
        try {
            const payload = verifyToken(refreshToken);
            await prisma.refreshToken.updateMany({
                where: { jti: payload.jti, userId: payload.userId, revoked: false },
                data: { revoked: true },
            });
        }
        catch (error) {
            console.error("Error during logout:", error);
            // Ignore malformed/expired token on logout
        }
    }
    const base = getCookieOptions();
    res.clearCookie(ACCESS_TOKEN_COOKIE, base);
    res.clearCookie(REFRESH_TOKEN_COOKIE, base);
    res.json({ message: "Logged out successfully" });
};
