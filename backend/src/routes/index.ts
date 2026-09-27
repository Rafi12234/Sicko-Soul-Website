import { Router } from "express";
import { categoriesRouter } from "../modules/categories/categories.routes.js";
import { collectionsRouter } from "../modules/collections/collections.routes.js";
import { cartsRouter } from "../modules/carts/carts.routes.js";
import { complaintsRouter } from "../modules/complaints/complaints.routes.js";
import { healthRouter } from "../modules/health/health.routes.js";
import { ordersRouter } from "../modules/orders/orders.routes.js";
import { orderRefundsRouter } from "../modules/refunds/refunds.routes.js";
import { productsRouter } from "../modules/products/products.routes.js";
import { productReviewsRouter, publicReviewsRouter } from "../modules/reviews/reviews.routes.js";
import { adminRouter } from "./admin.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/collections", collectionsRouter);
apiRouter.use("/carts", cartsRouter);
apiRouter.use("/complaints", complaintsRouter);

apiRouter.use("/reviews", publicReviewsRouter);
apiRouter.use("/products/:productId/reviews", productReviewsRouter);
apiRouter.use("/products", productsRouter);

apiRouter.use("/orders/:reference/refunds", orderRefundsRouter);
apiRouter.use("/orders", ordersRouter);

apiRouter.use("/admin", adminRouter);
