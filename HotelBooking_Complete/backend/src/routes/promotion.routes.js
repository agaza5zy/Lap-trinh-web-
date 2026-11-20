import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router } from 'express';
import * as controller from '../controllers/promotion.controller.js';
const router = Router();
router.get('/', asyncHandler(controller.listPromotions));
export default router;
