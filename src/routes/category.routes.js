import { Router } from "express";
import { createCategory, getCategories, getCategoryBySlugOrId, updateCategory, deleteCategory, getAllCategoriesWithHierarchy, getInactiveCategories, restoreCategory, hardDeleteCategory } from "../controllers/categoryController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
const router = Router();
// Create Category (ADMIN, EDITOR only)
router.post("/", authenticate, authorizeRole(["ADMIN", "EDITOR"]), createCategory);
// Get inactive categories (Admin only)
router.get("/inactive", authenticate, authorizeRole(["ADMIN"]), getInactiveCategories);
// Get all categories with hierarchy (Public) - MUST BE BEFORE slugOrId
router.get("/all-with-hierarchy", getAllCategoriesWithHierarchy);
// Get all categories (Public)
router.get("/", getCategories);
// Get category by slug or id (Public)
router.get("/:slugOrId", getCategoryBySlugOrId);
// Update category (ADMIN, EDITOR)
router.put("/:slugOrId", authenticate, authorizeRole(["ADMIN", "EDITOR"]), updateCategory);
// Restore category (ADMIN only)
router.patch("/:slugOrId/restore", authenticate, authorizeRole(["ADMIN"]), restoreCategory);
// Soft delete category
router.delete("/:slugOrId", authenticate, authorizeRole(["ADMIN", "EDITOR"]), deleteCategory);
// Hard delete category permanently (ADMIN only)
router.delete("/:id/permanent", authenticate, authorizeRole(["ADMIN"]), hardDeleteCategory);
export default router;
