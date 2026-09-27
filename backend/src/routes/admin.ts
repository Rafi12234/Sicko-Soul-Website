import { Router } from "express";
import { authenticateStaff, requireRoles } from "../middleware/auth.js";
import { adminAuthRouter } from "../modules/admin-auth/admin-auth.routes.js";
import { adminCatalogRouter } from "../modules/admin-catalog/admin-catalog.routes.js";
import { adminCollectionsRouter } from "../modules/collections/collections.routes.js";
import { adminInventoryRouter } from "../modules/inventory/inventory.routes.js";
import { adminOrdersRouter } from "../modules/orders/orders.routes.js";
import { adminPaymentsRouter } from "../modules/payments/payments.routes.js";
import { adminRefundsRouter } from "../modules/refunds/refunds.routes.js";
import { adminShipmentsRouter } from "../modules/shipments/shipments.routes.js";
import { adminReviewsRouter } from "../modules/reviews/reviews.routes.js";
import { adminComplaintsRouter } from "../modules/complaints/complaints.routes.js";
import { adminStaffRouter } from "../modules/staff/staff.routes.js";
import { adminAuditRouter } from "../modules/audit/audit.routes.js";
import { adminEmailRouter } from "../modules/email/email.routes.js";
import { adminCustomersRouter } from "../modules/customers/customers.routes.js";

export const adminRouter = Router();

adminRouter.use("/auth", adminAuthRouter);
adminRouter.use(authenticateStaff);

adminRouter.use(
  "/catalog",
  requireRoles("ADMIN"),
  adminCatalogRouter,
);
adminRouter.use(
  "/collections",
  requireRoles("ADMIN"),
  adminCollectionsRouter,
);
adminRouter.use(
  "/inventory",
  requireRoles("ADMIN", "INVENTORY_MANAGER"),
  adminInventoryRouter,
);
adminRouter.use(
  "/orders",
  requireRoles("ADMIN", "ORDER_MANAGER"),
  adminOrdersRouter,
);
adminRouter.use(
  "/payments",
  requireRoles("ADMIN", "ORDER_MANAGER"),
  adminPaymentsRouter,
);
adminRouter.use(
  "/refunds",
  requireRoles("ADMIN", "ORDER_MANAGER"),
  adminRefundsRouter,
);
adminRouter.use(
  "/shipments",
  requireRoles("ADMIN", "ORDER_MANAGER"),
  adminShipmentsRouter,
);
adminRouter.use(
  "/reviews",
  requireRoles("ADMIN", "SUPPORT"),
  adminReviewsRouter,
);
adminRouter.use(
  "/complaints",
  requireRoles("ADMIN", "SUPPORT"),
  adminComplaintsRouter,
);
adminRouter.use(
  "/customers",
  requireRoles("ADMIN", "ORDER_MANAGER", "SUPPORT"),
  adminCustomersRouter,
);
adminRouter.use(
  "/staff",
  requireRoles("SUPER_ADMIN"),
  adminStaffRouter,
);
adminRouter.use(
  "/audit",
  requireRoles("ADMIN"),
  adminAuditRouter,
);
adminRouter.use(
  "/email",
  requireRoles("ADMIN"),
  adminEmailRouter,
);
