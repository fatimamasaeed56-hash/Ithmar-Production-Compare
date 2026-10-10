import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import archivesRouter from "./archives";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(archivesRouter);
router.use(chatRouter);

export default router;
