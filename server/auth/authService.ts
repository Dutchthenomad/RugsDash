import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { User, InsertUser, RefreshToken, InsertRefreshToken } from '../../shared/schema';
import { AuthenticationError, ValidationError } from '../middleware/errorHandler';

/**
 * Configuration for JWT tokens
 */
const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || 'rugs_access_secret_change_in_production',
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || 'rugs_refresh_secret_change_in_production',
  ACCESS_TOKEN_EXPIRES_IN: '15m', // 15 minutes
  REFRESH_TOKEN_EXPIRES_IN: '7d', // 7 days
  SALT_ROUNDS: 12,
} as const;

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Auth response interface
 */
export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Authentication Service Class
 * Handles all authentication-related operations including JWT generation,
 * password hashing, user validation, and token management
 */
export class AuthService {
  
  /**
   * Hash a password using bcrypt
   * @param password - Plain text password
   * @returns Promise<string> - Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long');
    }
    return bcrypt.hash(password, JWT_CONFIG.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns Promise<boolean> - Whether password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   * @param user - User object
   * @returns string - JWT token
   */
  static generateAccessToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    return jwt.sign(payload, JWT_CONFIG.ACCESS_TOKEN_SECRET, {
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * Generate JWT refresh token
   * @param user - User object
   * @returns string - JWT refresh token
   */
  static generateRefreshToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    return jwt.sign(payload, JWT_CONFIG.REFRESH_TOKEN_SECRET, {
      expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * Verify JWT access token
   * @param token - JWT token
   * @returns Promise<JWTPayload> - Decoded token payload
   */
  static async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      return jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired access token');
    }
  }

  /**
   * Verify JWT refresh token
   * @param token - JWT refresh token
   * @returns Promise<JWTPayload> - Decoded token payload
   */
  static async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      return jwt.verify(token, JWT_CONFIG.REFRESH_TOKEN_SECRET) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  /**
   * Store refresh token in database
   * @param userId - User ID
   * @param refreshToken - Refresh token
   * @param deviceInfo - Device information (user agent, IP)
   * @returns Promise<RefreshToken> - Stored refresh token record
   */
  static async storeRefreshToken(
    userId: string, 
    refreshToken: string, 
    deviceInfo?: string
  ): Promise<RefreshToken> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const refreshTokenData: InsertRefreshToken = {
      userId,
      token: refreshToken,
      expiresAt,
      deviceInfo: deviceInfo || null,
      isRevoked: false,
    };

    return storage.createRefreshToken(refreshTokenData);
  }

  /**
   * Register a new user
   * @param userData - User registration data
   * @param deviceInfo - Device information
   * @returns Promise<AuthResponse> - User data with tokens
   */
  static async register(
    userData: InsertUser,
    deviceInfo?: string
  ): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    // Check email if provided
    if (userData.email) {
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        throw new ValidationError('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);

    // Create user
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(newUser);
    const refreshToken = this.generateRefreshToken(newUser);

    // Store refresh token
    await this.storeRefreshToken(newUser.id, refreshToken, deviceInfo);

    // Update last login
    await storage.updateUserLastLogin(newUser.id);

    return {
      user: this.sanitizeUser(newUser),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   * @param username - Username
   * @param password - Password
   * @param deviceInfo - Device information
   * @returns Promise<AuthResponse> - User data with tokens
   */
  static async login(
    username: string,
    password: string,
    deviceInfo?: string
  ): Promise<AuthResponse> {
    // Find user
    const user = await storage.getUserByUsername(username);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Revoke old refresh tokens for this device (optional security measure)
    await storage.revokeRefreshTokensByDevice(user.id, deviceInfo);

    // Generate new tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken, deviceInfo);

    // Update last login
    await storage.updateUserLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token
   * @param deviceInfo - Device information
   * @returns Promise<{ accessToken: string, refreshToken: string }> - New tokens
   */
  static async refreshAccessToken(
    refreshToken: string,
    deviceInfo?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const payload = await this.verifyRefreshToken(refreshToken);

    // Check if refresh token exists and is not revoked
    const storedToken = await storage.getRefreshToken(refreshToken);
    if (!storedToken || storedToken.isRevoked) {
      throw new AuthenticationError('Refresh token is invalid or revoked');
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      throw new AuthenticationError('Refresh token has expired');
    }

    // Get user
    const user = await storage.getUser(payload.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Revoke old refresh token
    await storage.revokeRefreshToken(refreshToken);

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    // Store new refresh token
    await this.storeRefreshToken(user.id, newRefreshToken, deviceInfo);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user by revoking refresh token
   * @param refreshToken - Refresh token to revoke
   * @returns Promise<void>
   */
  static async logout(refreshToken: string): Promise<void> {
    await storage.revokeRefreshToken(refreshToken);
  }

  /**
   * Logout user from all devices
   * @param userId - User ID
   * @returns Promise<void>
   */
  static async logoutAllDevices(userId: string): Promise<void> {
    await storage.revokeAllRefreshTokens(userId);
  }

  /**
   * Remove password from user object
   * @param user - User object
   * @returns Omit<User, 'password'> - User without password
   */
  static sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Extract device information from request
   * @param req - Express request object
   * @returns string - Device information
   */
  static extractDeviceInfo(req: Request): string {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    return `${userAgent} | ${ip}`;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Access token is required');
    }

    const payload = await AuthService.verifyAccessToken(token);
    
    // Verify user still exists and is active
    const user = await storage.getUser(payload.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role
 */
export const requireRole = (roles: string | string[]) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!requiredRoles.includes(req.user.role)) {
      return next(new AuthenticationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = await AuthService.verifyAccessToken(token);
      const user = await storage.getUser(payload.userId);
      
      if (user && user.isActive) {
        req.user = payload;
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};