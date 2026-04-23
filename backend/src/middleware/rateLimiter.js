import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

const bucket = new Map();
let requestCount = 0;

function getClientKey(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const forwarded = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
  const proxiedIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null;
  return proxiedIp || req.ip || req.socket?.remoteAddress || 'unknown';
}

function cleanupExpiredBuckets(now) {
  const cutoff = now - env.rateLimit.windowMs;
  for (const [key, value] of bucket.entries()) {
    if (value.windowStart < cutoff) {
      bucket.delete(key);
    }
  }
}

export function rateLimiter(req, _res, next) {
  const key = getClientKey(req);
  const now = Date.now();

  requestCount += 1;
  if (requestCount % 200 === 0) {
    cleanupExpiredBuckets(now);
  }

  const currentEntry = bucket.get(key);
  if (!currentEntry || now - currentEntry.windowStart >= env.rateLimit.windowMs) {
    bucket.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (currentEntry.count >= env.rateLimit.max) {
    return next(new AppError('Too many requests, please try again later.', 429, 'RATE_LIMITED'));
  }

  currentEntry.count += 1;
  bucket.set(key, currentEntry);
  return next();
}
