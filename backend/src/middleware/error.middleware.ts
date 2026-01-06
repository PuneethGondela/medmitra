/**
 * Error handling middleware
 * Catches all errors and sends standardized responses
 */

import { Request, Response, NextFunction } from 'express';
import { handleError, AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle known errors
  if (err instanceof AppError) {
    return handleError(err, res);
  }

  // Handle Firestore errors
  if (err.code === 'not-found') {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Default error
  handleError(err, res);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
};
