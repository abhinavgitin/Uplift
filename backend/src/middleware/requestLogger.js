import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const startedAt = Date.now();
  logger.info(`[${requestId}] ${req.method} ${req.originalUrl} started`);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    logger.info(`[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });

  next();
}
