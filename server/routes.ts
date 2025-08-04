import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { qLearningService } from "./qlearning/QLearningService";
import { authRoutes } from "./auth/authRoutes";
import { authenticateToken, optionalAuth, requireRole, authenticateWebSocket, extractWebSocketToken } from "./auth/authService";
import { validateRequest } from "./middleware/validation";
import { asyncHandler } from "./middleware/errorHandler";
import { AuthenticatedRequest } from "./auth/authService";
import { Request, Response } from "express";
import * as schemas from "./validation/schemas";
import { validateWebSocketMessage } from "../shared/validation/websocket";
import { gameStateUpdateSchema, sideBetUpdateSchema, gameEndSchema } from "../shared/validation/websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware for handling refresh tokens
  app.use(cookieParser());
  
  // Authentication routes (public)
  app.use('/auth', authRoutes);
  
  // API routes for prediction data storage (protected)
  app.get("/api/predictions", 
    authenticateToken,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const predictions = await storage.getAllPredictions();
      res.json(predictions);
    })
  );

  app.post("/api/predictions", 
    authenticateToken,
    validateRequest(schemas.createPredictionSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const prediction = await storage.createPrediction(req.body);
      res.json(prediction);
    })
  );

  app.get("/api/analytics", 
    authenticateToken,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    })
  );

  // Q-Learning API endpoints (protected)
  app.post("/api/qlearning/recommendation", 
    authenticateToken,
    validateRequest(schemas.qLearningRecommendationSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { gameState, timing, bankroll } = req.body;
      const recommendation = await qLearningService.getRecommendation(gameState, timing, bankroll);
      res.json(recommendation);
    })
  );

  app.post("/api/qlearning/execute-bet", 
    authenticateToken,
    validateRequest(schemas.executeBetSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { gameId, decision, gameState } = req.body;
      const bet = await qLearningService.executeBet(gameId, decision, gameState);
      res.json(bet);
    })
  );

  app.post("/api/qlearning/start-game", 
    authenticateToken,
    validateRequest(schemas.startGameSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { gameId } = req.body;
      await qLearningService.startGame(gameId);
      res.json({ message: 'Game started successfully' });
    })
  );

  app.post("/api/qlearning/end-game", 
    authenticateToken,
    validateRequest(schemas.endGameSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { gameId, finalTick } = req.body;
      await qLearningService.endGame(gameId, finalTick);
      res.json({ message: 'Game ended successfully' });
    })
  );

  app.post("/api/qlearning/record-tick", 
    authenticateToken,
    validateRequest(schemas.recordTickSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { tick, timestamp } = req.body;
      qLearningService.recordTick(tick, timestamp);
      res.json({ message: 'Tick recorded successfully' });
    })
  );

  app.get("/api/qlearning/stats", 
    authenticateToken,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const stats = await qLearningService.getStats();
      res.json(stats);
    })
  );

  app.get("/api/qlearning/analytics", 
    authenticateToken,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const analytics = await qLearningService.getAnalytics();
      res.json(analytics);
    })
  );

  app.post("/api/qlearning/training", 
    authenticateToken,
    requireRole(['admin']), // Only admins can toggle training
    validateRequest(schemas.trainingToggleSchema),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const { enabled } = req.body;
      qLearningService.setTraining(enabled);
      res.json({ message: `Training ${enabled ? 'enabled' : 'disabled'} successfully` });
    })
  );

  // Initialize Q-learning service
  await qLearningService.initialize();

  const httpServer = createServer(app);

  // WebSocket server for real-time communication (separate from rugs.fun connection)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store authenticated WebSocket connections
  const authenticatedConnections = new Map<string, { ws: WebSocket; userId: string; userRole: string }>();

  wss.on('connection', async (ws: WebSocket, req: any) => {
    try {
      // Extract and validate authentication token
      const token = extractWebSocketToken(req);
      const user = await authenticateWebSocket(token || '');

      if (!user) {
        console.log('WebSocket connection rejected: Invalid or missing authentication');
        ws.close(1008, 'Unauthorized - Valid authentication token required');
        return;
      }

      // Store connection with user info
      const connectionId = `${user.userId}_${Date.now()}`;
      authenticatedConnections.set(connectionId, {
        ws,
        userId: user.userId,
        userRole: user.role
      });

      console.log(`Authenticated WebSocket connection established for user: ${user.username} (${user.role})`);
      
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          
          // Validate message based on type
          let validationResult;
          switch (data.type) {
            case 'gameStateUpdate':
              validationResult = validateWebSocketMessage(gameStateUpdateSchema, data);
              break;
            case 'sideBetUpdate':
              validationResult = validateWebSocketMessage(sideBetUpdateSchema, data);
              break;
            case 'gameEnd':
              validationResult = validateWebSocketMessage(gameEndSchema, data);
              break;
            default:
              console.warn(`Unknown WebSocket message type: ${data.type}`);
              return;
          }

          if (!validationResult.success) {
            console.error('Invalid WebSocket message:', validationResult.error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
              timestamp: Date.now()
            }));
            return;
          }

          console.log(`Valid WebSocket message from ${user.username}:`, data.type);
          
          // Handle authenticated WebSocket messages
          // Route to appropriate handlers based on user role and message type
          handleAuthenticatedWebSocketMessage(validationResult.data, user);
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON format',
            timestamp: Date.now()
          }));
        }
      });

      ws.on('close', () => {
        authenticatedConnections.delete(connectionId);
        console.log(`WebSocket disconnected for user: ${user.username}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${user.username}:`, error);
        authenticatedConnections.delete(connectionId);
      });

      // Send authentication success message
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'auth_success',
          user: {
            id: user.userId,
            username: user.username,
            role: user.role
          },
          timestamp: Date.now()
        }));
      }

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1011, 'Authentication error');
    }
  });

  // Helper function to handle authenticated WebSocket messages
  function handleAuthenticatedWebSocketMessage(data: any, user: any) {
    switch (data.type) {
      case 'gameStateUpdate':
        // Handle real-time game state updates
        console.log(`Game state update from ${user.username}:`, data.gameId);
        break;
      case 'sideBetUpdate':
        // Handle side bet updates
        console.log(`Side bet update from ${user.username}:`, data.betId);
        break;
      case 'gameEnd':
        // Handle game end notifications
        console.log(`Game end notification from ${user.username}:`, data.gameId);
        break;
      default:
        console.warn(`Unhandled message type: ${data.type}`);
    }
  }

  // Function to broadcast message to all authenticated connections
  function broadcastToAuthenticated(message: any, roleFilter?: string[]) {
    const messageStr = JSON.stringify(message);
    authenticatedConnections.forEach(({ ws, userRole }) => {
      if (!roleFilter || roleFilter.includes(userRole)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      }
    });
  }

  // Expose broadcast function for use in other parts of the application
  (httpServer as any).broadcastToAuthenticated = broadcastToAuthenticated;

  return httpServer;
}
