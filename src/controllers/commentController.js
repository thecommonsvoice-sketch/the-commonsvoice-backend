import { prisma } from "../lib/prisma.js";
// Add a comment to an article
export const addComment = async (req, res) => {
    const { articleId, content } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const comment = await prisma.comment.create({
            data: {
                content,
                userId,
                articleId,
            },
        });
        res.status(201).json({ message: "Comment added successfully", comment });
    }
    catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ message: "Failed to add comment" });
    }
};
// Get all comments for an article
export const getComments = async (req, res) => {
    const { articleId } = req.params;
    try {
        const comments = await prisma.comment.findMany({
            where: { articleId },
            include: {
                user: { select: { id: true, name: true } }, // Include user details
            },
            orderBy: { createdAt: "desc" },
        });
        console.log("req user comments:", req.user);
        res.json({ comments });
    }
    catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Failed to fetch comments" });
    }
};
// Get all comments by a specific user
export const getCommentsByUser = async (req, res) => {
    const { userId } = req.params;
    console.log("req user comments:", req?.user);
    try {
        const comments = await prisma.comment.findMany({
            where: { userId },
            include: {
                article: { select: { id: true, title: true, slug: true } }, // Include article details
            },
            orderBy: { createdAt: "desc" },
        });
        res.json({ comments });
    }
    catch (error) {
        console.error("Error fetching comments by user:", error);
        res.status(500).json({ message: "Failed to fetch comments by user" });
    }
};
// Delete a comment
export const deleteComment = async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        // Ensure the comment belongs to the user or the user is an admin
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { userId: true },
        });
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }
        if (comment.userId !== userId) {
            res.status(403).json({ message: "You are not authorized to delete this comment" });
            return;
        }
        await prisma.comment.delete({
            where: { id: commentId },
        });
        res.json({ message: "Comment deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Failed to delete comment" });
    }
};
// Edit a comment
export const editComment = async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        // Ensure the comment belongs to the user
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { userId: true },
        });
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }
        if (comment.userId !== userId) {
            res.status(403).json({ message: "You are not authorized to edit this comment" });
            return;
        }
        const updatedComment = await prisma.comment.update({
            where: { id: commentId },
            data: { content },
        });
        res.json({ message: "Comment updated successfully", updatedComment });
    }
    catch (error) {
        console.error("Error editing comment:", error);
        res.status(500).json({ message: "Failed to edit comment" });
    }
};

// Reply to a comment (nested replies)
export const replyToComment = async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (!content || content.trim() === "") {
        res.status(400).json({ message: "Reply content cannot be empty" });
        return;
    }

    try {
        // Verify parent comment exists and get its article context
        const parentComment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: {
                id: true,
                articleId: true,
                userId: true,
                content: true,
            },
        });

        if (!parentComment) {
            res.status(404).json({ message: "Parent comment not found" });
            return;
        }

        if (parentComment.userId === userId) {
            res.status(400).json({ message: "You cannot reply to your own comment" });
            return;
        }

        // Create the reply comment with parent reference
        const reply = await prisma.comment.create({
            data: {
                content,
                userId,
                articleId: parentComment.articleId,
                parentId: commentId,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                parent: {
                    select: {
                        id: true,
                        content: true,
                        user: { select: { id: true, name: true } },
                    },
                },
            },
        });

        res.status(201).json({
            message: "Reply added successfully",
            reply,
        });
    }
    catch (error) {
        console.error("Error replying to comment:", error);
        res.status(500).json({ message: "Failed to add reply to comment" });
    }
};
