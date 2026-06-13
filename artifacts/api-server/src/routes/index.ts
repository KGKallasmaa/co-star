import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import councilRouter from "./council";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(councilRouter);
router.use(stripeRouter);

export default router;
