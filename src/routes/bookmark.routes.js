import { Router } from "express";
import { addBookmark, removeBookmark, getBookmark, getUserBookmarks } from "../controllers/bookmarkController.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
router.post("/", authenticate, addBookmark); // Add a bookmark
router.delete("/", authenticate, removeBookmark); // Remove a bookmark
router.get("/", authenticate, getUserBookmarks); // check bookmark of user for the article
router.get("/:articleId", authenticate, getBookmark); // check bookmark of user for the article
export default router;
