import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function fetchLatestNews(req, res) {
  try {
    const params = new URLSearchParams({
      apikey: process.env.NEWSDATA_API_KEY,
      country: "in,us",
      language: "en",
    });

    const response = await fetch(`https://newsdata.io/api/1/latest?${params}`);
    
    if (!response.ok) {
      console.error("News API request failed:", response.status, response.statusText);
      return res.status(502).json({ success: false, error: "Failed to fetch news from API" });
    }

    const data = await response.json();

    const articles = Array.isArray(data.results) ? data.results : [];

    if (!articles.length) {
      console.warn("No articles received or 'results' not an array:", data.results);
    }

    for (const article of articles) {
      if (!article.article_id || !article.title) continue;

      await prisma.latestNews.upsert({
        where: { id: article.article_id },
        update: {
          title: article.title,
          photoUrl: article.image_url || null,
          link: article.link || null,
          description: article.description || null,
        },
        create: {
          id: article.article_id,
          title: article.title,
          photoUrl: article.image_url || null,
          link: article.link || null,
          description: article.description || null,
        },
      });
    }

    res.json({ success: true, message: "News updated successfully." });
  } catch (error) {
    console.error("Error in fetchLatestNews:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getCachedNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
