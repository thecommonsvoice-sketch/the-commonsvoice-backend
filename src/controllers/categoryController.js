import { prisma } from "../lib/prisma.js";
import { z } from "zod";
// Validation Schemas
const categorySchema = z.object({
    name: z.string().min(2, "Category name must be at least 2 characters"),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    parentId: z.string().optional().nullable()
});
const updateSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    parentId: z.string().optional().nullable()
});

// Utility to create slug
const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

// CREATE CATEGORY
export const createCategory = async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation failed",
            errors: parsed.error.flatten()
        });
        return;
    }
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { name, description, isActive, parentId } = parsed.data;

    // Validate parent category exists if parentId is provided
    if (parentId) {
        const parentExists = await prisma.category.findUnique({
            where: { id: parentId }
        });
        if (!parentExists) {
            res.status(400).json({ message: "Parent category not found" });
            return;
        }
    }

    let slug = generateSlug(name);
    // Ensure unique slug
    const existingSlug = await prisma.category.findUnique({ where: { slug } });
    if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
    }
    try {
        const category = await prisma.category.create({
            data: {
                name,
                slug,
                description,
                isActive: isActive ?? true,
                parentId
            }
        });
        res.status(201).json({ message: "Category created successfully", category });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create category", error });
    }
};

// GET ALL CATEGORIES (public)
export const getCategories = async (_req, res) => {
    try {
        // Get all parent categories
        const allCategories = await prisma.category.findMany({
            where: {
                isActive: true,
                parentId: null
            },
            include: {
                children: {
                    where: { isActive: true },
                    select: { id: true, name: true, slug: true }
                }
            }
        });

        // Define the desired order: General, Politics, Science and Technology, Entertainment, Business
        const orderMap = {
            'general': 1,
            'politics': 2,
            'science-and-technology': 3,
            'sports-and-entertainment': 4,
            'business': 5
        };

        // Sort categories according to the defined order
        const categories = allCategories.sort((a, b) => {
            const orderA = orderMap[a.slug] || 999;
            const orderB = orderMap[b.slug] || 999;
            return orderA - orderB;
        });

        res.json({ categories });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch categories", error });
    }
};

// GET ALL CATEGORIES WITH HIERARCHY
export const getAllCategoriesWithHierarchy = async (_req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            include: {
                parent: { select: { id: true, name: true, slug: true } },
                children: {
                    where: { isActive: true },
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy: [
                { parentId: 'asc' }, // nulls (parents) first usually, or grouped
                { name: 'asc' }
            ]
        });

        res.json({ categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch categories", error });
    }
};
// GET CATEGORY BY SLUG OR ID
export const getCategoryBySlugOrId = async (req, res) => {
    const identifier = req.params.slugOrId;
    if (!identifier) {
        res.status(400).json({ message: "Slug or ID is required" });
        return;
    }
    const isCUID = /^c[a-z0-9]{24}$/.test(identifier);
    const whereClause = isCUID ? { id: identifier } : { slug: identifier };
    try {
        const category = await prisma.category.findUnique({
            where: whereClause
        });
        if (!category || !category.isActive) {
            res.status(404).json({ message: "Category not found" });
            return;
        }
        res.json({ category });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch category", error });
    }
};
// UPDATE CATEGORY
export const updateCategory = async (req, res) => {
    const { slugOrId } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: "Validation failed",
            errors: parsed.error.flatten()
        });
        return;
    }
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const isCUID = /^c[a-z0-9]{24}$/.test(slugOrId);
    const whereClause = isCUID ? { id: slugOrId } : { slug: slugOrId };
    try {
        const existingCategory = await prisma.category.findUnique({ where: whereClause });
        if (!existingCategory) {
            res.status(404).json({ message: "Category not found" });
            return;
        }
        let newSlug = existingCategory.slug;
        if (parsed.data.name) {
            newSlug = generateSlug(parsed.data.name);
            const existingSlug = await prisma.category.findUnique({ where: { slug: newSlug } });
            if (existingSlug && existingSlug.id !== existingCategory.id) {
                newSlug = `${newSlug}-${Date.now()}`;
            }
        }
        const updatedCategory = await prisma.category.update({
            where: whereClause,
            data: {
                ...parsed.data,
                slug: newSlug
            }
        });
        res.json({ message: "Category updated successfully", category: updatedCategory });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update category", error });
    }
};
// DELETE CATEGORY (soft delete by default)
export const deleteCategory = async (req, res) => {
    const { slugOrId } = req.params;
    const isCUID = /^c[a-z0-9]{24}$/.test(slugOrId);
    const whereClause = isCUID ? { id: slugOrId } : { slug: slugOrId };
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const category = await prisma.category.findUnique({ where: whereClause });
        if (!category) {
            res.status(404).json({ message: "Category not found" });
            return;
        }
        // Soft delete by setting isActive = false
        await prisma.category.update({
            where: whereClause,
            data: { isActive: false }
        });
        res.json({ message: "Category deleted (soft) successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete category", error });
    }
};
