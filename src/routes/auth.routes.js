// src/routes/auth.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { register, login, refresh, logout } from "../controllers/auth.controller.js";
const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
export default router;
