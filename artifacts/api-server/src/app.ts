import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1);
app.use(cookieParser());
app.use('/api/auth', express.json({ limit: '16kb' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", authMiddleware, router);

// Never emit database parameters, passwords, or session identifiers in errors.
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (error as { status?: number })?.status;
  if (res.headersSent) { res.end(); return; }
  if (status === 413) { res.status(413).json({ error: 'حجم الطلب أكبر من المسموح.' }); return; }
  if (status === 400) { res.status(400).json({ error: 'الطلب غير صالح.' }); return; }
  logger.error('Request could not be completed');
  res.status(503).json({ error: 'الخدمة غير متاحة مؤقتًا. أعد المحاولة.' });
});

export default app;
