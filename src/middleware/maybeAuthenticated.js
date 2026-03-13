import { verifyToken } from "../utils/tokens.js";
import { ACCESS_TOKEN_COOKIE } from "../config/authCookies.js";

export const maybeAuthenticate = (req, res, next) => {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];

    if (!token) {
        // No token — continue as unauthenticated (guest) visitor
        req.user = null;
        next();
        return;
    }

    try {
        const decoded = verifyToken(token);
        req.user = { userId: decoded.userId, role: decoded.role };
        next();
    } catch (error) {
        // Token is invalid/expired — continue as unauthenticated
        req.user = null;
        next();
    }
};
