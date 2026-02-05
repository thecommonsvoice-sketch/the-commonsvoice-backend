import { Router } from "express";
import { createCategory, getCategories, getCategoryBySlugOrId, updateCategory, deleteCategory, getAllCategoriesWithHierarchy } from "../controllers/categoryController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
const router = Router();
// Create Category (ADMIN, EDITOR, REPORTER)
router.post("/", authenticate, authorizeRole(["ADMIN", "EDITOR", "REPORTER"]), createCategory);
// Get all categories with hierarchy (Public) - MUST BE BEFORE slugOrId
router.get("/all-with-hierarchy", getAllCategoriesWithHierarchy);
// Get all categories (Public)
router.get("/", getCategories);
// Get category by slug or id (Public)
router.get("/:slugOrId", getCategoryBySlugOrId);
// Update category (ADMIN, EDITOR)
router.put("/:slugOrId", authenticate, authorizeRole(["ADMIN", "EDITOR"]), updateCategory);
// Delete category (ADMIN only, soft delete)
router.delete("/:slugOrId", authenticate, authorizeRole(["ADMIN", "EDITOR"]), deleteCategory);
export default router;
