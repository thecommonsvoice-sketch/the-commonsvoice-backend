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
                author: true,
                category: true,
                videos: true,
            },
        });
        console.log('Article created successfully:', article.id);
        res.status(201).json({ article });
    }
    catch (error) {
        console.error('Article creation error:', error);
        res.status(500).json({ message: "Failed to create article" });
    }
};
// Get All Articles with Filters
export const getArticles = async (req, res) => {
    const { page = 1, limit = 10, search, category, author, startDate, endDate, status, } = req.query;
    try {
        // Build where clause
        const where = { deletedAt: null };
        // Role-based filtering
        const isGuest = !req.user || req.user.role === "USER";
        if (isGuest) {
            where.status = ArticleStatus.PUBLISHED;
        }
        else if (status) {
            where.status = status;
        }
        // Search filter
        if (search) {
            where.OR = [
                { title: { contains: String(search), mode: "insensitive" } },
                { content: { contains: String(search), mode: "insensitive" } },
            ];
        }
        // HIERARCHY LOGIC: Resolve category and its children
        let categoryFilter = {};
        if (category) {
            const catStr = String(category);
            // Search for categories matching slug or name
            // We prioritize slug match as that's what frontend sends
            const matchingCategories = await prisma.category.findMany({
                where: {
                    OR: [
                        { slug: catStr },
                        { name: { contains: catStr, mode: "insensitive" } }
                    ]
                },
                include: { children: { select: { id: true } } }
            });
            if (matchingCategories.length > 0) {
                // If we found categories, include them AND their children
                const ids = new Set();
                matchingCategories.forEach(c => {
                    ids.add(c.id);
                    if (c.children) {
                        c.children.forEach(child => ids.add(child.id));
                    }
                });
                categoryFilter = { categoryId: { in: Array.from(ids) } };
            }
            else {
                // Fallback: If no category found in DB, filter by name string match on Article's relation
                categoryFilter = { category: { name: { contains: catStr, mode: "insensitive" } } };
            }
        }
        // Author filter
        if (author) {
            where.author = { name: { contains: String(author), mode: "insensitive" } };
        }
        // Date range filter
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(String(startDate));
            if (endDate)
                where.createdAt.lte = new Date(String(endDate));
        }
        // Merge category filter into where clause
        Object.assign(where, categoryFilter);
        // Fetch articles with pagination
        const skip = (Number(page) - 1) * Number(limit);
        // Fetch counts for dashboard stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [articles, total, updatedTodayCount, draftCount] = await Promise.all([
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
            select: {
                id: true,
                title: true,
                slug: true,
                content: true,
                coverImage: true,
                excerpt: true,
                metaTitle: true,
                metaDescription: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    select: {
                        name: true  // Only fetch name, not id/email
                    }
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                videos: true
            }
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

// Get Adjacent Articles (Next/Previous)
export const getAdjacentArticles = async (req, res) => {
    const { slug } = req.params;

    try {
        // Get current article to find its createdAt
        const current = await prisma.article.findUnique({
            where: { slug },
            select: { createdAt: true, categoryId: true }
        });

        if (!current) {
            return res.status(404).json({ message: "Article not found" });
        }

        // Use Promise.all to fetch next and prev in parallel
        const [next, prev] = await Promise.all([
            // Next article (newer)
            prisma.article.findFirst({
                where: {
                    createdAt: { gt: current.createdAt },
                    status: 'PUBLISHED',
                    deletedAt: null
                },
                orderBy: { createdAt: 'asc' },
                select: { title: true, slug: true }
            }),
            // Previous article (older)
            prisma.article.findFirst({
                where: {
                    createdAt: { lt: current.createdAt },
                    status: 'PUBLISHED',
                    deletedAt: null
                },
                orderBy: { createdAt: 'desc' },
                select: { title: true, slug: true }
            })
        ]);

        res.json({ next, prev });
    } catch (error) {
        console.error('Adjacent articles error:', error);
        res.status(500).json({ message: "Failed to fetch adjacent articles" });
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
                    { slug: slugOrId },
                    { id: slugOrId }
                ]
            },
            include: {
                videos: true
            }
        });
        if (!existingArticle) {
            return res.status(404).json({ message: "Article not found" });
        }
        // Authorization check
        const isAdmin = req.user.role === "ADMIN";
        const isEditor = req.user.role === "EDITOR";
        const isReporterOwner = req.user.role === "REPORTER" && existingArticle.authorId === req.user.userId;
        if (!isAdmin && !isEditor && !isReporterOwner) {
            return res.status(403).json({ message: "You are not authorized to update this article" });
        }
        // Prepare update data
        const updateData = {};
        if (title !== undefined) {
            updateData.title = title;
            // Regenerate slug if title changed
            if (title !== existingArticle.title) {
                updateData.slug = await generateSlug(title, existingArticle.id);
            }
        }
        if (content !== undefined)
            updateData.content = content;
        if (categoryId !== undefined)
            updateData.categoryId = categoryId;
        if (coverImage !== undefined)
            updateData.coverImage = coverImage || null;
        if (metaTitle !== undefined)
            updateData.metaTitle = metaTitle;
        if (metaDescription !== undefined)
            updateData.metaDescription = metaDescription;
        if (tags !== undefined)
            updateData.tags = tags;
        // Handle videos update
        if (videos !== undefined) {
            // Delete existing videos
            await prisma.articleVideo.deleteMany({
                where: { articleId: existingArticle.id }
            });
            // Create new videos if provided
            if (Array.isArray(videos) && videos.length > 0) {
                updateData.videos = {
                    create: videos.map((video) => ({
                        type: video.type,
                        url: video.url,
                        title: video.title || null,
                        description: video.description || null,
                    })),
                };
            }
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
        res.status(500).json({ message: "Failed to delete article" });
    }
};
// Restore Article
export const restoreArticle = async (req, res) => {
    const { slugOrId } = req.params;
    const where = CUID_REGEX.test(slugOrId)
        ? { id: slugOrId }
        : { slug: slugOrId };
    if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "EDITOR")) {
        res.status(403).json({ message: "Only admins and editors can restore articles" });
        return;
    }
    try {
        const article = await prisma.article.findUnique({ where });
        if (!article) {
            res.status(404).json({ message: "Article not found" });
            return;
        }
        if (!article.deletedAt) {
            res.status(400).json({ message: "Article is not deleted" });
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
        res.status(500).json({ message: "Failed to restore article" });
    }
};
// Update Article Status
export const updateArticleStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "EDITOR")) {
        res.status(403).json({ message: "Only admins and editors can update article status" });
        return;
    }
    if (!Object.values(ArticleStatus).includes(status)) {
        res.status(400).json({ message: "Invalid status value" });
        return;
    }
    try {
        const article = await prisma.article.update({
            where: { id },
            data: { status },
            include: {
                author: true,
                category: true,
            },
        });
        res.json({ article });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update article status" });
    }
};
// Get Article with Role Check (for editing)
export const getArticleWithRoleCheck = async (req, res) => {
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
        if (!article || article.deletedAt) {
            res.status(404).json({ message: "Article not found" });
            return;
        }
        // Role-based access control
        const isAdmin = req.user?.role === "ADMIN";
        const isEditor = req.user?.role === "EDITOR";
        const isReporter = req.user?.role === "REPORTER";
        const isOwner = article.authorId === req.user?.userId;
        console.log('Role check:', { isAdmin, isEditor, isReporter, isOwner, userId: req.user?.userId, authorId: article.authorId });
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
