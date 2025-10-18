import express from "express";
import { fetchLatestNews, getCachedNews } from "../controllers/newsControllers.js";

const router = express.Router();

// Fetch news from NewsData.io and save/update in database
router.get("/fetch-latest-news", fetchLatestNews);

// Route to return cached news
router.get("/news", getCachedNews);

export default router;
