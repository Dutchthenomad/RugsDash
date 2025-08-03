# RugsDash IDE Handoff Guide

## Overview
This guide provides comprehensive instructions for completing the remaining repairs to the RugsDash project. Foundational work has been completed via terminal, but the remaining tasks require IDE features for refactoring, debugging, and complex integrations.

## Current Status

### ✅ Completed (via terminal):
1. **Testing Framework**: Vitest installed and configured
2. **Input Validation**: Zod schemas created for all endpoints
3. **Environment Validation**: Type-safe env configuration
4. **Error Handling**: Custom error classes and middleware
5. **Security Basics**: Rate limiting, CORS, and helmet configured
6. **Initial Type Fixes**: Q-learning types defined

### 🚧 Requires IDE Completion:

## 1. Authentication System Implementation

**Priority**: CRITICAL  
**Estimated Time**: 4-6 hours  
**Files to modify**:
- `server/auth/` (create new directory)
- `server/routes.ts`
- `server/index.ts`
- Database schema updates

### Tasks:
1. **Install dependencies**:
   ```bash
   npm install jsonwebtoken bcrypt
   npm install --save-dev @types/jsonwebtoken @types/bcrypt
   ```

2. **Create auth service** (`server/auth/authService.ts`):
   - User registration with password hashing
   - User login with JWT generation
   - Token verification middleware
   - Refresh token implementation

3. **Update database schema** (`shared/schema.ts`):
   - Add refresh_tokens table
   - Add user roles/permissions

4. **Protect routes**:
   - Add auth middleware to protected endpoints
   - Update WebSocket to require authentication

5. **Client integration**:
   - Add login/register components
   - Implement token storage (httpOnly cookies)
   - Add axios interceptors for token refresh

## 2. Complete API Validation Integration

**Priority**: HIGH  
**Estimated Time**: 2-3 hours  
**Files to modify**: `server/routes.ts`

### Tasks:
1. **Apply validation middleware** to all routes:
   ```typescript
   import { validateRequest } from './middleware/validation';
   import * as schemas from './validation/schemas';
   
   app.post('/api/predictions', 
     validateRequest(schemas.createPredictionSchema),
     asyncHandler(async (req, res) => {
       // Handler code
     })
   );
   ```

2. **Update error handling** in routes to use custom error classes
3. **Test all endpoints** with invalid data

## 3. WebSocket Security

**Priority**: HIGH  
**Estimated Time**: 3-4 hours  
**Files to modify**:
- `client/src/lib/websocketClient.ts`
- `server/routes.ts`

### Tasks:
1. **Add authentication to WebSocket connections**
2. **Implement reconnection with auth tokens**
3. **Add message validation for WebSocket data**
4. **Handle auth failures gracefully**

## 4. Complete TypeScript Fixes

**Priority**: MEDIUM  
**Estimated Time**: 2-3 hours  
**Files with `any` types**:
- `server/routes.ts` (lines 42, 134)
- `server/qlearning/QLearningService.ts` (lines 22-23)
- `server/index.ts` (line 42)

### Tasks:
1. **Replace all `any` types** with proper interfaces
2. **Update imports** to use new type definitions
3. **Run type checking**: `npm run check`

## 5. Implement Logging System

**Priority**: MEDIUM  
**Estimated Time**: 2 hours  
**Recommendation**: Use Winston or Pino

### Tasks:
1. **Install logger**:
   ```bash
   npm install winston
   ```

2. **Create logger configuration** (`server/utils/logger.ts`)
3. **Replace all console.log statements**
4. **Add request logging middleware**
5. **Configure log rotation**

## 6. Add Comprehensive Tests

**Priority**: HIGH  
**Estimated Time**: 4-6 hours

### Unit Tests Needed:
- `server/qlearning/QLearningAgent.ts`
- `client/src/lib/predictionEngine.ts`
- All validation schemas
- Error handling middleware

### Integration Tests Needed:
- All API endpoints
- WebSocket connection/reconnection
- Authentication flow

### Example test structure:
```typescript
// server/routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './testApp';

describe('API Routes', () => {
  describe('POST /api/predictions', () => {
    it('should validate input data', async () => {
      const response = await request(app)
        .post('/api/predictions')
        .send({ invalid: 'data' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
```

## 7. Performance Optimizations

**Priority**: MEDIUM  
**Estimated Time**: 3-4 hours  
**Files to optimize**:
- `client/src/pages/dashboard.tsx`
- `client/src/lib/websocketClient.ts`

### Tasks:
1. **Implement React.memo** for expensive components
2. **Add debouncing** to WebSocket updates
3. **Use React.useCallback** for event handlers
4. **Implement virtual scrolling** for large lists
5. **Add caching layer** for API responses

## 8. Memory Leak Fixes

**Priority**: HIGH  
**Estimated Time**: 2 hours  
**Files to fix**:
- `client/src/pages/dashboard.tsx`
- `client/src/lib/websocketClient.ts`

### Tasks:
1. **Add cleanup in useEffect hooks**:
   ```typescript
   useEffect(() => {
     const handler = () => {};
     window.addEventListener('event', handler);
     
     return () => {
       window.removeEventListener('event', handler);
     };
   }, []);
   ```

2. **Clear WebSocket listeners on unmount**
3. **Cancel pending API requests**

## 9. Database Improvements

**Priority**: MEDIUM  
**Estimated Time**: 2-3 hours

### Tasks:
1. **Add database indexes** for performance
2. **Implement connection pooling**
3. **Add transaction support** for critical operations
4. **Create migration system**

## 10. Documentation & Deployment

**Priority**: LOW  
**Estimated Time**: 2-3 hours

### Tasks:
1. **Create API documentation** (OpenAPI/Swagger)
2. **Add JSDoc comments** to all functions
3. **Create deployment guide**
4. **Set up CI/CD pipeline** (.github/workflows)

## Testing Your Changes

1. **Run type checking**: `npm run check`
2. **Run tests**: `npm test`
3. **Check for security issues**: `npm audit`
4. **Test in development**: `npm run dev`
5. **Build for production**: `npm run build`

## Commit Guidelines

Follow the conventional commit format:
```
feat(auth): implement JWT authentication
fix(websocket): handle reconnection failures
test(api): add integration tests for predictions endpoint
```

## Priority Order

1. Authentication System (blocks other features)
2. Complete API Validation
3. WebSocket Security
4. Memory Leak Fixes
5. Comprehensive Tests
6. TypeScript Fixes
7. Logging System
8. Performance Optimizations
9. Database Improvements
10. Documentation

## Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [React Performance](https://react.dev/learn/render-and-commit)

## Questions or Issues?

Check the following files for context:
- `AUDIT_REPORT.md` - Original issues found
- `REPAIR_TRACKER.md` - Current progress
- `CLAUDE.md` - Architecture overview

---
*Created: January 3, 2025*  
*Project Status: 58.3% Complete*