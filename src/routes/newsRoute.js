import express from "express";
import { 

  // Cron controller (used by scheduled jobs)
    fetchLatestNews, 
    fetchNewsByCategory,
  // Frontend read-only controllers (fetch from DB)
    getCachedNews, 
//   fetchGeneralNews,
  fetchBusinessNews,
  fetchSportsNews,
  fetchTechNews,
  fetchScienceNews,
fetchHealthNews,
fetchEntertainmentNews,
fetchFashionNews} from "../controllers/newsControllers.js";


const router = express.Router();

// Fetch news from NewsData.io and save/update in database
router.get("/fetch-latest-news", fetchLatestNews);

// Route to return cached news
router.get("/news", getCachedNews);

/* ------------------------------------------------------------
 * CRON ENDPOINT — call these from a scheduler like node-cron
 * ------------------------------------------------------------ */

router.get("/fetch-news-cat", async (req, res) => {
  const { category } = req.query;
  if (!category)
    return res.status(400).json({ success: false, message: "Category is required." });

  const result = await fetchNewsByCategory(category);
  res.json(result);
});

/* ------------------------------------------------------------
 * FRONTEND ENDPOINTS — read cached news from Prisma DB
 * ------------------------------------------------------------ */

// router.get("/news/general", fetchGeneralNews);
router.get("/news/business", fetchBusinessNews);
router.get("/news/sports", fetchSportsNews);
router.get("/news/tech", fetchTechNews);
router.get("/news/science", fetchScienceNews);
router.get("/news/health", fetchHealthNews);
router.get("/news/entertainment", fetchEntertainmentNews);
router.get("/news/fashion", fetchFashionNews);

export default router;
