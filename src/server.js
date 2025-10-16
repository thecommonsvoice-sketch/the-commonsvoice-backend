// src/server.ts
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import dotenv from "dotenv";
dotenv.config();
const PORT = process.env.PORT || 5000;
// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Graceful shutdown
const shutdown = async () => {
    console.log("Shutting down gracefully...");
    await prisma.$disconnect();
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
