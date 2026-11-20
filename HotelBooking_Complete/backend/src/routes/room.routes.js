import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router } from 'express';
import * as controller from '../controllers/room.controller.js';
const router = Router();
router.get('/', asyncHandler(controller.listRooms));
router.get('/:id', asyncHandler(controller.getRoom));
export default router;
