import { asyncHandler } from '../middleware/asyncHandler.js';
import { Router } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.post('/register', authLimiter, asyncHandler(controller.register));
router.post('/verify-email', authLimiter, asyncHandler(controller.verifyEmail));
router.post('/resend-verification', authLimiter, asyncHandler(controller.resendVerification));
router.post('/login', authLimiter, asyncHandler(controller.login));
router.get('/google/nonce', authLimiter, asyncHandler(controller.googleNonce));
router.post('/google', authLimiter, asyncHandler(controller.googleLogin));
router.get('/apple/nonce', authLimiter, asyncHandler(controller.appleNonce));
router.post('/apple', authLimiter, asyncHandler(controller.appleLogin));
router.get('/me', authenticate, asyncHandler(controller.me));
export default router;
