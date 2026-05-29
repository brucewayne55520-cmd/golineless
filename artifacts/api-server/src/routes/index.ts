import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import tasksRouter from "./tasks";
import runnersRouter from "./runners";
import subscriptionsRouter from "./subscriptions";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(tasksRouter);
router.use(runnersRouter);
router.use(subscriptionsRouter);
router.use(notificationsRouter);
router.use(adminRouter);

export default router;
