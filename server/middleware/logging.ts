import { Request, Response, NextFunction } from 'express';
import { requestLogger, performanceLogger } from '../utils/logger';
import type { AuthenticatedRequest } from '../auth/authService';

// Request logging middleware
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Attach request ID to request object
  (req as any).requestId = requestId;
  
  // Log request
  requestLogger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    ...((req as AuthenticatedRequest).user && { userId: ((req as AuthenticatedRequest).user as any).userId }),
  });
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data: any): Response {
    res.send = originalSend;
    
    const duration = Date.now() - start;
    
    // Log response
    requestLogger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length'),
    });
    
    // Log performance metrics for slow requests
    if (duration > 1000) {
      performanceLogger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
      });
    }
    
    return res.send(data);
  };
  
  next();
};

// Error logging middleware
export const logError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId || 'unknown';
  
  requestLogger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    statusCode: res.statusCode,
  });
  
  next(err);
};