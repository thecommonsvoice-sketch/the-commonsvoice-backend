import { verifyToken } from "../utils/tokens.js";
import { ACCESS_TOKEN_COOKIE } from "../config/authCookies.js";

export const checkUser = async (req, res, next) => {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
    
    if (token) {
        try {
            const decoded = verifyToken(token);
            req.user = { userId: decoded.userId, role: decoded.role };
        } catch (error) {
            // Token invalid or expired, just ignore and proceed as guest
            console.log("checkUser: Invalid token", error.message);
        }
    }
    
    next();
};
