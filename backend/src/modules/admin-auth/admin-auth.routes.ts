import { Router } from "express";
import { authenticateStaff } from "../../middleware/auth.js";
import { authRateLimit } from "../../middleware/auth-rate-limit.js";
import {
  staffLoginController, staffRefreshController, staffLogoutController, staffMeController,
} from "./admin-auth.controller.js";

export const adminAuthRouter = Router();
adminAuthRouter.post("/login", authRateLimit, staffLoginController);
adminAuthRouter.post("/refresh", authRateLimit, staffRefreshController);
adminAuthRouter.post("/logout", staffLogoutController);
adminAuthRouter.get("/me", authenticateStaff, staffMeController);
