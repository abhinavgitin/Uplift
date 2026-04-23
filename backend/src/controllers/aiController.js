import { solveProblem } from '../services/aiService.js';

export async function solveProblemController(req, res, next) {
  try {
    const rawProviderOverride = req.headers['x-ai-provider'];
    const providerOverride = Array.isArray(rawProviderOverride)
      ? rawProviderOverride[0]
      : rawProviderOverride;

    const data = await solveProblem(req.validatedBody, providerOverride, {
      requestId: req.requestId
    });

    res.status(200).json({
      success: true,
      data: {
        content: data.content
      },
      meta: {
        requestId: req.requestId,
        provider: data.provider,
        model: data.model,
        requestType: data.requestType,
        retries: data.retryCount,
        latencyMs: data.latencyMs
      }
    });
  } catch (error) {
    next(error);
  }
}
