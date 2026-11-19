import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router } from 'express';
import * as controller from '../controllers/hotel.controller.js';
const router = Router();
router.get('/', asyncHandler(controller.listHotels));
export default router;
