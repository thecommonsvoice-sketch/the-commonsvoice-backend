import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { getAllUsers, updateUserRole, toggleUserActiveStatus, adminGetAllArticles, changeArticleStatus, deleteArticleByAdmin, createUser, getArticleBySlugOrId, bulkDeleteArticles, bulkChangeArticleStatus, bulkUpdateUsers, bulkDeleteUsers } from "../controllers/adminController.js";
const router = Router();
// ADMIN ONLY ROUTES
router.use(authenticate, authorizeRole(["ADMIN"]));
// User Management
router.get("/users", getAllUsers);
router.post("/users", createUser); // Create user
router.patch("/users/:userId/role", updateUserRole);
router.patch("/users/:userId/toggle", toggleUserActiveStatus);
// Article Management
router.get("/articles/:slugOrId", getArticleBySlugOrId);
router.get("/articles", adminGetAllArticles);
router.patch("/articles/:articleId/status", changeArticleStatus);
router.delete("/articles/:articleId", deleteArticleByAdmin);

// Bulk Actions
router.post("/articles/bulk-delete", bulkDeleteArticles);
router.patch("/articles/bulk-status", bulkChangeArticleStatus);
router.post("/users/bulk-delete", bulkDeleteUsers);
router.patch("/users/bulk-update", bulkUpdateUsers);

export default router;
