import { Router, Request, Response } from 'express';
import { AuthService, AuthenticatedRequest } from './authService';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

/**
 * Validation schemas for authentication endpoints
 */
const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, {
      message: 'Username can only contain letters, numbers, and underscores'
    }),
    email: z.string().email().optional(),
    password: z.string().min(6).max(100),
    role: z.enum(['user', 'admin', 'premium']).optional().default('user'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', 
  validateRequest(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, role } = req.body;
    const deviceInfo = AuthService.extractDeviceInfo(req);

    const authResponse = await AuthService.register(
      { username, email, password, role },
      deviceInfo
    );

    // Set refresh token as httpOnly cookie for security
    res.cookie('refreshToken', authResponse.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: authResponse.user,
      accessToken: authResponse.accessToken,
    });
  })
);

/**
 * POST /auth/login  
 * Authenticate user and return tokens
 */
router.post('/login',
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const deviceInfo = AuthService.extractDeviceInfo(req);

    const authResponse = await AuthService.login(username, password, deviceInfo);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', authResponse.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      user: authResponse.user,
      accessToken: authResponse.accessToken,
    });
  })
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    // Try to get refresh token from cookie first, then from body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    const deviceInfo = AuthService.extractDeviceInfo(req);
    const tokens = await AuthService.refreshAccessToken(refreshToken, deviceInfo);

    // Set new refresh token as cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
    });
  })
);

/**
 * POST /auth/logout
 * Logout user and revoke refresh token
 */
router.post('/logout',
  asyncHandler(async (req: Request, res: Response) => {
    // Try to get refresh token from cookie first, then from body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      message: 'Logout successful',
    });
  })
);

/**
 * POST /auth/logout-all
 * Logout user from all devices
 */
router.post('/logout-all',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await AuthService.logoutAllDevices(req.user.userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      message: 'Logged out from all devices successfully',
    });
  })
);

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get fresh user data from storage
    const { storage } = await import('../storage');
    const user = await storage.getUser(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: AuthService.sanitizeUser(user),
    });
  })
);

/**
 * GET /auth/verify
 * Verify if access token is valid
 */
router.get('/verify',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({
      valid: true,
      user: {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,
      },
    });
  })
);

/**
 * POST /auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password',
  z.object({
    body: z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6).max(100),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;
    const { storage } = await import('../storage');
    
    // Get user from storage
    const user = await storage.getUser(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await AuthService.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await AuthService.hashPassword(newPassword);

    // Update password in storage (implement this method in storage)
    await storage.updateUserPassword(user.id, hashedNewPassword);

    // Revoke all refresh tokens to force re-authentication
    await AuthService.logoutAllDevices(user.id);

    res.json({
      message: 'Password changed successfully. Please log in again.',
    });
  })
);

export { router as authRoutes };