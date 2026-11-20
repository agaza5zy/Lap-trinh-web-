import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router } from 'express';
import * as controller from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.get('/hotel/:hotelId', asyncHandler(controller.listReviews));
router.post('/', authenticate, asyncHandler(controller.createReview));
export default router;
