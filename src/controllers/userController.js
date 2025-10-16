import { prisma } from "../lib/prisma.js";
export const getProfile = async (req, res) => {
    try {
        const userId = req.user?.userId; // Comes from the authenticate middleware
        console.log("user id :", userId);
        console.log("req user comments:", req.user);
        // If no user (visitor), return guest response
        if (!userId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }
        // Fetch user details from the database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
