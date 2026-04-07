import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

const bucket = new Map();

function getClientKey(req) {
  return req.ip || req.headers['x-forwarded-for'] || 'unknown';
}

export function rateLimiter(req, _res, next) {
  const key = getClientKey(req);
  const now = Date.now();
  const windowStart = now - env.rateLimit.windowMs;

  const records = bucket.get(key) || [];
  const recentRecords = records.filter((timestamp) => timestamp > windowStart);

  if (recentRecords.length >= env.rateLimit.max) {
    return next(new AppError('Too many requests, please try again later.', 429, 'RATE_LIMITED'));
  }

  recentRecords.push(now);
  bucket.set(key, recentRecords);
  return next();
}
