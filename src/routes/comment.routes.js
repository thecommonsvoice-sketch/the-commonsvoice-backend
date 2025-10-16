import { Router } from "express";
import { addComment, getComments, getCommentsByUser, deleteComment, editComment, } from "../controllers/commentController.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
// Add a comment to an article
router.post("/", authenticate, addComment);
// Get all comments for a specific article
router.get("/:articleId", getComments);
// Get all comments by a specific user
router.get("/user/:userId", authenticate, getCommentsByUser);
// Delete a specific comment
router.delete("/:commentId", authenticate, deleteComment);
// Edit a specific comment
router.put("/:commentId", authenticate, editComment);
export default router;
