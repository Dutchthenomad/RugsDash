# RugsDash Setup Guide

## 🎉 Project Status
The RugsDash project has been successfully configured and is ready to run. All 24 critical issues identified in the audit have been resolved, including:
- ✅ Complete JWT authentication system
- ✅ WebSocket security
- ✅ Client authentication UI
- ✅ All TypeScript errors fixed
- ✅ Memory leaks resolved
- ✅ Comprehensive validation
- ✅ Logging system implemented

## 🚀 Quick Start

### 1. Server is Already Running!
The development server is currently running on port 5000. You can access it at:
- **Web Interface**: http://localhost:5000
- **API Endpoints**: http://localhost:5000/api/*

### 2. Test User Created
A test user has been created for you:
- **Username**: testuser
- **Password**: Test123
- **Email**: test@example.com

### 3. Access the Application
1. Open your browser and go to http://localhost:5000
2. You'll be redirected to the login page
3. Use the test credentials above to log in

## 📋 Server Management

### Stop the Server
```bash
# Find the process
ps aux | grep "tsx server/index.ts"
# Kill it (replace PID with the actual process ID)
kill PID
```

### Restart the Server
```bash
npm run dev
```

### View Server Logs
```bash
tail -f server.log
```

## 🛠️ Configuration Details

### Environment Setup
The `.env` file has been created with development defaults:
- **Port**: 5000
- **Database**: Using in-memory storage (no real database needed for development)
- **JWT Secrets**: Development keys configured
- **CORS**: Configured for localhost access

### Known Issues & Workarounds
1. **Vite Dev Server**: Due to Node.js compatibility issues, Vite hot-reload is disabled. The server serves pre-built static files instead.
2. **Database**: Currently using in-memory storage. Data will be lost on server restart.

## 🔧 Development Workflow

### Making Changes to Frontend
1. Make your changes in `client/src/`
2. Build the frontend: `npm run build`
3. Restart the server: `npm run dev`

### Making Changes to Backend
1. Make your changes in `server/`
2. The server will need to be restarted
3. Stop the current server and run `npm run dev`

### Running Tests
```bash
npm test
```

## 🌐 API Testing

### Test Authentication
```bash
# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123"}'

# Use the returned accessToken for authenticated requests
```

### Test Protected Endpoints
```bash
# Replace YOUR_TOKEN with the actual token from login
curl -X GET http://localhost:5000/api/predictions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Features Available

1. **Authentication System**
   - User registration and login
   - JWT-based authentication
   - Role-based access control (user/admin/premium)
   - Refresh token rotation

2. **Game Dashboard**
   - Real-time game state from rugs.fun
   - Prediction engine
   - Q-Learning bot recommendations
   - Side betting system

3. **WebSocket Connections**
   - External: Connects to backend.rugs.fun for game data
   - Internal: Authenticated WebSocket for client-server communication

4. **Security Features**
   - Input validation with Zod
   - Rate limiting
   - CORS protection
   - Helmet security headers

## 🔍 Troubleshooting

### Server Won't Start
1. Check if port 5000 is already in use
2. Ensure Node.js version is 18.x or higher
3. Check server.log for detailed error messages

### Can't Access the Web Interface
1. Ensure the server is running (`ps aux | grep tsx`)
2. Check that you're using http://localhost:5000 (not https)
3. Clear browser cache and cookies

### Authentication Issues
1. Tokens expire after 15 minutes
2. Use the refresh endpoint to get new tokens
3. Check that you're including "Bearer " before the token

## 📝 Next Steps

1. **Set up a real PostgreSQL database** for production use
2. **Configure production environment variables** in `.env`
3. **Set up monitoring** for the Q-Learning bot performance
4. **Implement additional tests** for new features
5. **Deploy to production** with proper SSL certificates

---
*Generated: January 3, 2025*