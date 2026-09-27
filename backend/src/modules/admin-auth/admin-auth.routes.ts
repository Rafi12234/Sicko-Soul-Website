import { Router } from "express";
import { authenticateStaff } from "../../middleware/auth.js";
import { authRateLimit } from "../../middleware/auth-rate-limit.js";
import { staffLoginController, staffMeController } from "./admin-auth.controller.js";

export const adminAuthRouter = Router();
adminAuthRouter.post("/login", authRateLimit, staffLoginController);
adminAuthRouter.get("/me", authenticateStaff, staffMeController);
