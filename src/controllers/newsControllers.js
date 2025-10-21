import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function fetchLatestNews(req, res) {
  try {
    const params = new URLSearchParams({
      apikey: process.env.NEWSDATA_API_KEY,
      country: "in",
      language: "en",
    });

    const response = await fetch(`https://newsdata.io/api/1/latest?${params}`);
    const data = await response.json();

    const articles = data.results || [];

    for (const article of articles) {
      // Skip if article_id or title missing
      if (!article.article_id || !article.title) continue;

      await prisma.latestNews.upsert({
        where: { id: article.article_id }, // use unique article_id
        update: {
          title: article.title,
          photoUrl: article.image_url || null,
          link: article.link || null,
          description: article.description || null,
        },
        create: {
          id: article.article_id, // use API article_id as unique ID
          title: article.title,
          photoUrl: article.image_url || null,
          link: article.link || null,
          description: article.description || null,
        },
      });
    }

    res.json({ success: true, message: "News updated successfully." });
  } catch (error) {
    console.error(error);
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



/* ------------------------------------------------------------
 * 1. CRON USE ONLY — Fetch from TheNewsAPI and store in DB
 * ------------------------------------------------------------ */
export async function fetchNewsByCategory(category) {
  try {
    // Helper to fetch from API
    const fetchFromAPI = async (paramsObj) => {
      const params = new URLSearchParams(paramsObj);
      const response = await fetch(`https://api.thenewsapi.com/v1/news/all?${params}`);
      const data = await response.json();
      return data.data || [];
    };

    // 1️⃣ Try category with Indian locale
    let articles = await fetchFromAPI({
      api_token: process.env.THENEWS_API_KEY,
      language: "en",
      locale: "in",
      categories: category,
      limit: 20,
    });

    // 2️⃣ Fallback: search keyword if category returns empty
    if (!articles.length) {
      articles = await fetchFromAPI({
        api_token: process.env.THENEWS_API_KEY,
        language: "en",
        locale: "in",
        search: category,
        limit: 20,
      });
    }

    // 3️⃣ Fallback: remove locale (global) if still empty
    if (!articles.length) {
      articles = await fetchFromAPI({
        api_token: process.env.THENEWS_API_KEY,
        language: "en",
        search: category,
        limit: 20,
      });
    }

    // Save articles to DB
    for (const article of articles) {
      if (!article.uuid || !article.title) continue;

      await prisma.latestNews.upsert({
        where: { id: article.uuid },
        update: {
          title: article.title,
          photoUrl: article.image_url || null,
          link: article.url || null,
          description: article.description || null,
          type: category,
        },
        create: {
          id: article.uuid,
          title: article.title,
          photoUrl: article.image_url || null,
          link: article.url || null,
          description: article.description || null,
          type: category,
        },
      });
    }

    return { success: true, count: articles.length };
  } catch (error) {
    console.error("Cron fetch failed:", error);
    return { success: false, error: error.message };
  }
}


/* ------------------------------------------------------------
 * 2. FRONTEND USE — Only reads from Prisma (cached data)
 * ------------------------------------------------------------ */
export async function fetchGeneralNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      where: { type: "general" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchBusinessNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      where: { type: "business" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchSportsNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      where: { type: "sports" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchTechNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      where: { type: "tech" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchScienceNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      where: { type: "science" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchHealthNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      where: { type: "health" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchEntertainmentNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      where: { type: "entertainment" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function fetchFashionNews(req, res) {
  try {
    const news = await prisma.latestNews.findMany({
      where: { type: "fashion" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}