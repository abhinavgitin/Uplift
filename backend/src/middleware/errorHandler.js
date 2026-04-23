import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const requestId = req.requestId || null;
  const shouldMaskMessage = env.nodeEnv === 'production' && statusCode >= 500;
  const message = shouldMaskMessage ? 'Internal server error' : (err.message || 'Something went wrong');
  const safePath = req.originalUrl || 'unknown';
  const safeMethod = req.method || 'UNKNOWN';

  const logPayload = {
    requestId,
    code,
    statusCode,
    method: safeMethod,
    path: safePath,
    message: err.message
  };

  if (statusCode >= 500) {
    logger.error(logPayload, err.stack || err);
  } else {
    logger.warn(logPayload);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId
    }
  });
}
