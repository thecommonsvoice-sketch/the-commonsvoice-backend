import { Router } from "express";
import {
    createArticle, getArticles, getArticleBySlugOrId, getArticleWithRoleCheck, getAdjacentArticles, // Import the new handler
    updateArticle, deleteArticle, restoreArticle, updateArticleStatus,
} from "../controllers/articleController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { checkUser } from "../middleware/checkUser.js";
const router = Router();
// Create article (EDITOR, REPORTER, ADMIN)
router.post("/", authenticate, authorizeRole(["EDITOR", "REPORTER", "ADMIN"]), createArticle);
// Get all articles (public, with pagination & filters)
router.get("/", checkUser, getArticles);
// Get adjacent articles (next/previous) - MUST be before /:slugOrId
router.get("/adjacent/:slug", getAdjacentArticles);
// Get single article by slug or ID
router.get("/:slugOrId", getArticleBySlugOrId);
// Get article with role-based access control
router.get("/role-check/:slugOrId", authenticate, // Add authenticate middleware first
    authorizeRole(["EDITOR", "REPORTER", "ADMIN"]), getArticleWithRoleCheck);
// Update article (EDITOR, REPORTER (own only), ADMIN)
router.put("/:slugOrId", authenticate, authorizeRole(["EDITOR", "REPORTER", "ADMIN"]), updateArticle);
// Update article with role check
router.put("/role-check/:slugOrId", authenticate, // Add authenticate middleware first
    authorizeRole(["EDITOR", "REPORTER", "ADMIN"]), updateArticle);
// Delete article (Soft by default, force delete with ?force=true, ADMIN only)
router.delete("/:slugOrId", authenticate, authorizeRole(["EDITOR", "REPORTER", "ADMIN"]), deleteArticle);
// Restore soft-deleted article (ADMIN & EDITOR)
router.patch("/restore/:slugOrId", authenticate, authorizeRole(["ADMIN", "EDITOR"]), restoreArticle);
// Update article status (ADMIN, EDITOR only)
router.patch("/status/:id", authenticate, authorizeRole(["ADMIN", "EDITOR"]), updateArticleStatus);
export default router;
