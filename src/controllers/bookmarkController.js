import { prisma } from "../lib/prisma.js";
// Add a bookmark for an article
export const addBookmark = async (req, res) => {
    const { articleId } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const bookmark = await prisma.bookmark.create({
            data: {
                userId,
                articleId,
            },
        });
        res.status(201).json({ success: true, message: "Article bookmarked successfully", bookmark });
    }
    catch (error) {
        // Handle unique constraint violation (bookmark already exists)
        if (error.code === 'P2002') {
            res.status(200).json({ success: true, message: "Article already bookmarked" });
            return;
        }
        console.error("Error adding bookmark:", error);
        res.status(500).json({ message: "Failed to bookmark article" });
    }
};
// Remove a bookmark for an article
export const removeBookmark = async (req, res) => {
    const { articleId } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const result = await prisma.bookmark.deleteMany({
            where: {
                userId,
                articleId,
            },
        });
        if (result.count === 0) {
            res.status(404).json({ success: false, message: "Bookmark not found" });
            return;
        }
        res.json({ success: true, message: "Bookmark removed successfully" });
    }
    catch (error) {
        console.error("Error removing bookmark:", error);
        res.status(500).json({ message: "Failed to remove bookmark" });
    }
};
// get bookmark of an article
export const getBookmark = async (req, res) => {
    const { articleId } = req.params; // 🔄 Use req.params for GET route like /bookmarks/:articleId
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    if (!articleId) {
        res.status(400).json({ message: "Article ID is required" });
        return;
    }
    try {
        const bookmark = await prisma.bookmark.findFirst({
            where: {
                userId,
                articleId,
            },
        });
        if (!bookmark) {
            res.status(404).json({ success: false, message: "Bookmark not found" });
            return;
        }
        res.json({ success: true, message: "Article is bookmarked", bookmark });
    }
    catch (error) {
        console.error("Error finding bookmark:", error);
        res.status(500).json({ message: "Failed to find bookmark" });
    }
};
// get bookmark of an article
export const getUserBookmarks = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const [bookmarks, bookmarkCount] = await Promise.all([
            prisma.bookmark.findMany({
                where: {
                    userId,
                },
                include: {
                    article: true,
                },
            }),
            prisma.bookmark.count({
                where: {
                    userId,
                },
            }),
        ]);
        if (!bookmarks) {
            res.status(404).json({ success: false, message: "Bookmark not found" });
            return;
        }
        res.json({ success: true, bookmarks, bookmarkCount });
    }
    catch (error) {
        console.error("Error finding bookmark:", error);
        res.status(500).json({ message: "Failed to find bookmark" });
    }
};
// // Get all bookmarks for the authenticated user
// export const getBookmarks = async (req: Request, res: Response): Promise<void> => {
//     const userId = req.user?.userId;
//     console.log("req user bookmarks:", req.user);
//     if (!userId) {
//         res.status(401).json({ message: "Unauthorized" });
//         return;
//     }
//     try {
//         const [bookmarks, count] = await Promise.all([
//             prisma.bookmark.findMany({
//                 where: { userId },
//                 include: {
//                     article: { select: { id: true, title: true, slug: true } },
//                 },
//             }),
//             prisma.bookmark.count({ where: { userId } }),
//         ]);
//         res.json({success:true, bookmarks, count });
//     } catch (error) {
//         console.error("Error fetching bookmarks:", error);
//         res.status(500).json({ message: "Failed to fetch bookmarks" });
//     }
// };
