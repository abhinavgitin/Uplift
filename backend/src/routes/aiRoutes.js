import { Router } from 'express';
import { solveProblemController } from '../controllers/aiController.js';
import { validateSolveRequest } from '../middleware/validateRequest.js';

const router = Router();

router.post('/', validateSolveRequest, solveProblemController);
router.post('/solve', validateSolveRequest, solveProblemController);

export { router as aiRoutes };
