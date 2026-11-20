import 'dotenv/config';
import express from 'express';
import app from './backend/src/app.js';

// Vercel's Node backend runtime detects the Express framework from this entrypoint.
// The exported app is the same Express instance that owns all /api routes.
if (typeof express !== 'function') {
  throw new Error('Express runtime không khả dụng.');
}

export default app;
