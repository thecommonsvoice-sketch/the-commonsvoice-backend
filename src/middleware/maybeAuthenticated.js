import { verifyToken } from "../utils/tokens.js";
import { ACCESS_TOKEN_COOKIE } from "../config/authCookies.js";
export const maybeAuthenticate = (req, res, next) => {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    if (!token) {
        res.status(200).json({ message: "Authorization token missing", access: false, user: null });
        return;
    }
    try {
        const decoded = verifyToken(token);
        req.user = { userId: decoded.userId, role: decoded.role };
        next();
    }
    catch (error) {
        res.status(200).json({ message: "Invalid or expired token" });
    }
};
