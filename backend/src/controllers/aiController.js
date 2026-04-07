import { solveProblem } from '../services/aiService.js';

export async function solveProblemController(req, res, next) {
  try {
    const providerOverride = req.headers['x-ai-provider'];
    const data = await solveProblem(req.validatedBody, providerOverride);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}
