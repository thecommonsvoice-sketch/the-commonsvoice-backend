import { prisma } from "../lib/prisma.js";
import { z } from "zod";
import { ArticleStatus } from "@prisma/client";
// CUID regex
const CUID_REGEX = /^c[a-z0-9]{24}$/;
// Validation schemas
const articleSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    content: z.string().min(10, "Content must be at least 10 characters"),
    categoryId: z.string().optional(),
    coverImage: z.string().url().optional().or(z.literal("")).or(z.null()),
    metaTitle: z.string().max(60).optional().or(z.literal("")),
    metaDescription: z.string().max(160).optional().or(z.literal("")),
    tags: z.array(z.string().min(1, "Tag cannot be empty")).optional(),
    status: z.nativeEnum(ArticleStatus).optional(),
    videos: z.array(z.object({
        type: z.enum(['upload', 'embed']),
        url: z.string().url(),
        title: z.string().optional().or(z.literal("")),
        description: z.string().optional().or(z.literal("")),
    })).optional(),
});
// const updateSchema = articleSchema.partial();
// Utility: generate unique slug
const generateSlug = async (title, excludeId) => {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
        slug = `${slug}-${Date.now()}`;
    }
    return slug;
};
// Create Article
export const createArticle = async (req, res) => {
    console.log('Create article request body:', JSON.stringify(req.body, null, 2));
    const parsed = articleSchema.safeParse(req.body);
    if (!parsed.success) {
        console.error('Validation failed:', parsed.error.flatten());
        res
            .status(400)
            .json({ message: "Validation failed", errors: parsed.error.flatten() });
        return;
    }
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const { title, content, categoryId, coverImage, metaTitle, metaDescription, tags, videos } = parsed.data;
        console.log('Parsed data:', { title, content, categoryId, coverImage, metaTitle, metaDescription, tags, videos });
        const slug = await generateSlug(title);
        console.log('Generated slug:', slug);
        const articleData = {
            title,
            content,
            slug,
            categoryId: categoryId ?? "cmetuhypb0000jaappupxf6qx", // default fallback
            coverImage: coverImage || null,
            metaTitle: metaTitle || title.slice(0, 60),
            metaDescription: metaDescription || content.slice(0, 160),
            tags: tags || [],
            status: ArticleStatus.DRAFT,
            authorId: req.user.userId,
        };
        // Only add videos if they exist
        if (Array.isArray(videos) && videos.length > 0) {
            articleData.videos = {
                create: videos.map((video) => ({
                    type: video.type,
                    url: video.url,
                    title: video.title || null,
                    description: video.description || null,
                })),
            };
        }
        console.log('Creating article with data:', JSON.stringify(articleData, null, 2));
        const article = await prisma.article.create({
            data: articleData,
            include: {
                author: { select: { id: true, name: true, email: true } },
                category: { select: { id: true, name: true, slug: true } },
                videos: true,
            },
        });
        console.log('Article created successfully:', article.id);
        res.status(201).json({
            message: "Article created successfully",
            article,
        });
        return;
    }
    catch (error) {
        console.error('Article creation error:', error);
        if (!res.headersSent) {
            res
                .status(500)
                .json({ message: "Failed to create article", error: error instanceof Error ? error.message : 'Unknown error' });
            return;
        }
    }
};
// Get All Articles (Public + Authenticated)
export const getArticles = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", category, author, authorId, // New authorId parameter
        // userId,
        status, startDate, endDate, } = req.query;
        const isGuest = !req.user || req.user.role === "USER";
        console.log("is guest:", isGuest);
        // Get current date without time (just date comparison)
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Set to midnight to ignore the time part
        const where = {
            deletedAt: null, // Exclude soft-deleted articles
            ...(isGuest && !authorId && { status: ArticleStatus.PUBLISHED }), // Only published for guests unless authorId is provided
            ...(status && typeof status === 'string' && Object.values(ArticleStatus).includes(status) && { status: status }), // Filter by status
            ...(category && { category: { name: { contains: String(category), mode: "insensitive" } } }), // Filter by category
            ...(author && { author: { name: { contains: String(author), mode: "insensitive" } } }), // Filter by author name
            ...(authorId && { authorId: String(authorId) }), // Filter by authorId (includes all statuses)
            ...(search && {
                OR: [
                    { title: { contains: String(search), mode: "insensitive" } }, // Match title
                    { content: { contains: String(search), mode: "insensitive" } }, // Match content
                    // { tags: { has: String(search) } }, // Match tags (assuming tags is an array)
                    { category: { name: { contains: String(search), mode: "insensitive" } } }, // Match category name
                    { author: { name: { contains: String(search), mode: "insensitive" } } }, // Match author name
                    { metaTitle: { contains: String(search), mode: "insensitive" } }, // Match meta title
                    { metaDescription: { contains: String(search), mode: "insensitive" } }, // Match meta description
                ],
            }),
            ...(startDate && endDate && {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            }),
        };
        const skip = (Number(page) - 1) * Number(limit);
        // Get today's updated articles count
        const updatedTodayCount = await prisma.article.count({
            where: {
                NOT: {
                    status: ArticleStatus.DRAFT || ArticleStatus.ARCHIVED,
                },
                updatedAt: {
                    gte: currentDate, // Greater than or equal to today's midnight
                    lt: new Date(currentDate.getTime() + 86400000), // Less than tomorrow's midnight
                },
                ...(author && { author: { name: { contains: String(author), mode: "insensitive" } } }), // Filter by author if provided
            },
        });
        // Get today's updated draft articles count
        const draftCount = await prisma.article.count({
            where: {
                status: ArticleStatus.DRAFT,
                ...(author && { author: { name: { contains: String(author), mode: "insensitive" } } }), // Filter by author if provided
            },
        });
        // Fetch articles and total count
        const [articles, total] = await Promise.all([
            prisma.article.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    coverImage: true,
                    status: true,
                    metaTitle: true,
                    metaDescription: true,
                    // tags: true, // Assuming `tags` is a field in the database
                    category: { select: { name: true, slug: true } },
                    author: { select: { name: true } },
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma.article.count({ where }),
        ]);
        // Attach bookmark status for authenticated users
        if (req.user?.userId) {
            const userId = req.user.userId;
            const articleIds = articles.map((article) => article.id);
            
            const bookmarks = await prisma.bookmark.findMany({
                where: {
                    userId,
                    articleId: { in: articleIds },
                },
                select: { articleId: true },
            });
            
            const bookmarkedArticleIds = new Set(
                bookmarks.map((bookmark) => bookmark.articleId)
            );
            
            articles.forEach((article) => {
                article.isBookmarked = bookmarkedArticleIds.has(article.id);
            });
        }
        // Send response with updated count
        res.json({
            data: articles,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
            updatedTodayCount,
            draftCount,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch articles" });
    }
};
// Get Single Article by Slug or ID
export const getArticleBySlugOrId = async (req, res) => {
    const identifier = req.params.slugOrId;
    if (!identifier) {
        res.status(400).json({ message: "Slug or ID is required" });
        return;
    }
    const where = CUID_REGEX.test(identifier)
        ? { id: identifier }
        : { slug: identifier };
    try {
        const article = await prisma.article.findUnique({
            where,
            include: {
                author: { select: { id: true, name: true, email: true } },
                category: { select: { id: true, name: true, slug: true } },
                videos: true,
            },
        });
        // const {user} = req.params;
        const isGuest = !req.user || req.user.role === "USER";
        if (!article ||
            article.deletedAt ||
            (isGuest && article.status !== ArticleStatus.PUBLISHED)) {
            res.status(404).json({ message: "Article not found" });
            return;
        }
        res.json({ article });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch article", error });
    }
};
// Update Article
export const updateArticle = async (req, res) => {
    try {
        const { slugOrId } = req.params;
        const { title, content, categoryId, coverImage, metaTitle, metaDescription, tags, videos } = req.body;
        console.log('Updating article with videos:', videos);
        // Find the article
        const existingArticle = await prisma.article.findFirst({
            where: {
                OR: [
                    { id: slugOrId },
                    { slug: slugOrId }
                ]
            },
            include: {
                videos: true,
                author: true,
                category: true
            }
        });
        if (!existingArticle) {
            res.status(404).json({ message: "Article not found" });
            return;
        }
        // Check authorization
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        if (req.user.role === "REPORTER" && existingArticle.authorId !== req.user.userId) {
            res.status(403).json({ message: "Not authorized to edit this article" });
            return;
        }
        // Always handle video updates - delete old videos first if videos array is provided
        if (videos !== undefined && Array.isArray(videos)) {
            // Delete existing videos for complete replacement
            await prisma.articleVideo.deleteMany({
                where: { articleId: existingArticle.id },
            });
        }
        
        // Prepare update data
        const updateData = {
            title,
            content,
            categoryId,
            coverImage,
            metaTitle,
            metaDescription,
            tags: tags || [],
        };
        
        // Add videos to update only if provided as an array (including empty arrays)
        if (videos !== undefined && Array.isArray(videos)) {
            updateData.videos = {
                create: videos.map((video) => ({
                    type: video.type,
                    url: video.url,
                    title: video.title || null,
                    description: video.description || null,
                })),
            };
        }
        
        // Update article with new data
        const updatedArticle = await prisma.article.update({
            where: { id: existingArticle.id },
            data: updateData,
            include: {
                author: true,
                category: true,
                videos: true
            }
        });
        res.json({ article: updatedArticle });
    }
    catch (error) {
        console.error('Article update error:', error);
        res.status(500).json({ message: "Failed to update article" });
    }
};
// Delete Article
// Delete Article (Soft by default, Force for Admin)
export const deleteArticle = async (req, res) => {
    const { slugOrId } = req.params;
    const { force } = req.query; // ?force=true to permanently delete
    const where = CUID_REGEX.test(slugOrId)
        ? { id: slugOrId }
        : { slug: slugOrId };
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const article = await prisma.article.findUnique({ where });
        if (!article) {
            res.status(404).json({ message: "Article not found" });
            return;
        }
        const isAdmin = req.user.role === "ADMIN";
        const isReporterOwner = req.user.role === "REPORTER" && article.authorId === req.user.userId;
        if (!isAdmin && !isReporterOwner && req.user.role !== "EDITOR") {
            res
                .status(403)
                .json({ message: "You are not authorized to delete this article" });
            return;
        }
        if (force === "true") {
            if (!isAdmin) {
                res.status(403).json({ message: "Only admins can force delete" });
                return;
            }
            await prisma.article.delete({ where });
            res.json({ message: "Article permanently deleted" });
        }
        else {
            if (article.deletedAt) {
                res.status(400).json({ message: "Article is already soft deleted" });
                return;
            }
            const softDeleted = await prisma.article.update({
                where,
                data: { deletedAt: new Date() },
            });
            res.json({ message: "Article soft deleted", article: softDeleted });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete article", error });
    }
};
// Restore Article (Undo Soft Delete)
export const restoreArticle = async (req, res) => {
    const { slugOrId } = req.params;
    const where = CUID_REGEX.test(slugOrId) ? { id: slugOrId } : { slug: slugOrId };
    if (!req.user || req.user.role !== "ADMIN") {
        res.status(403).json({ message: "Only admins can restore articles" });
        return;
    }
    try {
        const article = await prisma.article.findUnique({ where });
        if (!article || !article.deletedAt) {
            res.status(404).json({ message: "Article not found or not deleted" });
            return;
        }
        const restored = await prisma.article.update({
            where,
            data: { deletedAt: null },
        });
        res.json({ message: "Article restored successfully", article: restored });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to restore article", error });
    }
};
// Automatic Permanent Deletion (Cron Job Example)
export const autoPurgeDeletedArticles = async () => {
    const DAYS_BEFORE_PURGE = 30; // Change as needed
    const cutoffDate = new Date(Date.now() - DAYS_BEFORE_PURGE * 24 * 60 * 60 * 1000);
    try {
        const deleted = await prisma.article.deleteMany({
            where: { deletedAt: { lt: cutoffDate } },
        });
    }
    catch (error) {
        console.error("Failed to auto-purge deleted articles:", error);
    }
};
// Update Article Status
export const updateArticleStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!CUID_REGEX.test(id)) {
        res.status(400).json({ message: "Invalid Article ID" });
        return;
    }
    if (!req.user || !["ADMIN", "EDITOR"].includes(req.user.role)) {
        res
            .status(403)
            .json({ message: "You are not authorized to update status" });
        return;
    }
    if (!Object.values(ArticleStatus).includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
    }
    try {
        const updated = await prisma.article.update({
            where: { id },
            data: { status },
        });
        res.json({ message: "Status updated successfully", article: updated });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update status", error });
    }
};
// Get Article with Role Check
export const getArticleWithRoleCheck = async (req, res) => {
    const { slugOrId } = req.params;
    // Check authentication
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized: Authentication required" });
        return;
    }
    // Deny access to regular users
    if (req.user.role === "USER") {
        res.status(403).json({ message: "Access denied: Insufficient permissions" });
        return;
    }
    try {
        const where = {
            OR: [
                { id: slugOrId }, // Match by ID
                { slug: slugOrId }, // Match by slug
            ],
            deletedAt: null, // Exclude soft-deleted articles
        };
        // Fetch the article from the database
        const article = await prisma.article.findFirst({
            where,
            include: {
                author: { select: { id: true, name: true, email: true } },
                category: { select: { id: true, name: true, slug: true } },
                videos: true,
            },
        });
        if (!article) {
            res.status(404).json({ message: "Article not found" });
            return;
        }
        console.log('Fetched article for role check:', {
            id: article.id,
            slug: article.slug,
            videosCount: article.videos?.length || 0,
            videos: article.videos
        });
        // Role-based access control
        const isAdmin = req.user.role === "ADMIN";
        const isEditor = req.user.role === "EDITOR";
        const isReporter = req.user.role === "REPORTER";
        const isOwner = article.authorId === req.user.userId;
        // ADMIN and EDITOR can view any article
        if (isAdmin || isEditor) {
            console.log('Returning article to ADMIN/EDITOR with videos:', article.videos?.length || 0);
            res.json({ article });
            return;
        }
        // REPORTER can only view their own articles
        if (isReporter && isOwner) {
            console.log('Returning article to REPORTER (owner) with videos:', article.videos?.length || 0);
            res.json({ article });
            return;
        }
        // REPORTER trying to access another reporter's article
        if (isReporter && !isOwner) {
            res.status(403).json({ message: "Access denied: You can only view your own articles" });
            return;
        }
        // Fallback denial
        res.status(403).json({ message: "Access denied: Insufficient permissions" });
    }
    catch (error) {
        console.error("Article role check error:", error);
        res.status(500).json({ message: "Failed to fetch article", error });
    }
};
