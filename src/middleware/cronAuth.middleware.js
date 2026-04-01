
export const cronAuth = (req, res, next) => {
    const cronSecret = process.env.CRON_SECRET;
    const providedKey = req.headers["x-cron-key"];

    if (!cronSecret) {
        console.warn("CRON_SECRET is not set in environment variables. Access denied by default.");
        res.status(500).json({ success: false, message: "Server configuration error" });
        return;
    }

    if (providedKey !== cronSecret) {
        res.status(401).json({ success: false, message: "Unauthorized: Invalid cron key" });
        return;
    }

    next();
};
