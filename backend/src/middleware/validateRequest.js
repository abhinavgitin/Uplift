import { z } from 'zod';
import { AppError } from '../utils/appError.js';

const solveSchema = z.object({
  problem: z.string().min(1, 'problem is required'),
  code: z.string().min(1, 'code is required'),
  language: z.string().min(1, 'language is required')
});

export function validateSolveRequest(req, _res, next) {
  const parsed = solveSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((item) => item.message).join(', ');
    return next(new AppError(`Invalid request body: ${details}`, 400, 'VALIDATION_ERROR'));
  }
  req.validatedBody = parsed.data;
  return next();
}
