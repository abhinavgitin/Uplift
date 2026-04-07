import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { aiRoutes } from './routes/aiRoutes.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(rateLimiter);

app.use('/health', healthRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
