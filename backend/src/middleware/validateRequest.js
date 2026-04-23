import { z } from 'zod';
import { AppError } from '../utils/appError.js';

const supportedTypes = [
  'explain',
  'constraints',
  'complexity',
  'hint',
  'hint1',
  'hint2',
  'hint3',
  'ideas',
  'analyze',
  'stuck'
];

const solveSchema = z.object({
  type: z
    .string({ required_error: 'type is required' })
    .trim()
    .toLowerCase()
    .refine((value) => supportedTypes.includes(value), {
      message: `type must be one of: ${supportedTypes.join(', ')}`
    }),
  problem: z.string({ required_error: 'problem is required' }).trim().min(1, 'problem is required').max(40_000, 'problem is too large'),
  code: z.string({ required_error: 'code is required' }).trim().min(1, 'code is required').max(50_000, 'code is too large'),
  language: z.string({ required_error: 'language is required' }).trim().min(1, 'language is required').max(50, 'language is too large')
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
