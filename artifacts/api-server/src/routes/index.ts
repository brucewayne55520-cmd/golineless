import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import googleAuthRouter from "./google-auth";
import usersRouter from "./users";
import tasksRouter from "./tasks";
import runnersRouter from "./runners";
import subscriptionsRouter from "./subscriptions";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import pricingRouter from "./pricing";
import operationsRouter from "./operations";
import paymentsRouter from "./payments";
import verificationRouter from "./verification";
import kycEnhancementsRouter from "./kyc-enhancements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(googleAuthRouter);
router.use(usersRouter);
router.use(tasksRouter);
router.use(runnersRouter);
router.use(subscriptionsRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(pricingRouter);
router.use(operationsRouter);
router.use(paymentsRouter);
router.use(verificationRouter);
router.use(kycEnhancementsRouter);

export default router;
