import { prisma } from "../lib/prisma.js";
export const authorizeRole = (allowedRoles) => {
    return async (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }
        if (!user.userId) {
            res.status(401).json({ message: "Unauthorized: invalid user payload" });
            return;
        }
        try {
            // Fetch the user's role from the database to ensure it's up-to-date
            const dbUser = await prisma.user.findUnique({
                where: { id: user.userId },
                select: { role: true },
            });
            if (!dbUser) {
                res.status(401).json({ message: "Unauthorized: user not found" });
                return;
            }
            const role = dbUser.role;
            // Normalize roles and use a Set for efficient membership checks
            const allowed = new Set(allowedRoles.map((r) => String(r).toUpperCase()));
            if (!allowed.has(String(role).toUpperCase())) {
                res.status(403).json({ message: "Access denied: insufficient permissions" });
                return;
            }
            // Attach the updated role to req.user without dropping other fields
            req.user = { ...user, role };
            next();
        }
        catch (error) {
            console.error("Authorization error:", error);
            next(error);
        }
    };
};
