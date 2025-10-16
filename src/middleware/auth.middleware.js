import { verifyToken } from "../utils/tokens.js";
import { ACCESS_TOKEN_COOKIE } from "../config/authCookies.js";
export const authenticate = async (req, res, next) => {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    if (!token) {
        res.status(401).json({ message: "Authorization token missing" });
        return;
    }
    try {
        const decoded = verifyToken(token);
        // Attach user details to req.user
        req.user = { userId: decoded.userId, role: decoded.role };
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
