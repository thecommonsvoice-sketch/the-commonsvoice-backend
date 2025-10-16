// src/utils/tokens.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/index.js";
export const signAccessToken = (payload) => {
    return jwt.sign({ ...payload, type: "access" }, process.env.JWT_SECRET, { expiresIn: "1d" });
};
export const signRefreshToken = (payload) => {
    return jwt.sign({ ...payload, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
export const verifyToken = (token) => jwt.verify(token, config.jwtSecret);
export const genJti = () => crypto.randomUUID(); // unique ID per refresh
