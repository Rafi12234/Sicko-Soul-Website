import { Router } from "express";
import {
  adminListOutboxController,
  adminProcessOutboxController,
  adminRetryOutboxController,
} from "./email.controller.js";

export const adminEmailRouter = Router();
adminEmailRouter.get("/outbox", adminListOutboxController);
adminEmailRouter.post("/outbox/process", adminProcessOutboxController);
adminEmailRouter.post("/outbox/:outboxId/retry", adminRetryOutboxController);
