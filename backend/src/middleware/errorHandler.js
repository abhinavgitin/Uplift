import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Something went wrong';

  if (statusCode >= 500) {
    logger.error(err);
  } else {
    logger.warn(message);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}
