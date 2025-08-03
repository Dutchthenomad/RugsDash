import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { qLearningService } from "./qlearning/QLearningService";
import { authRoutes } from "./auth/authRoutes";
import { authenticateToken, optionalAuth, requireRole } from "./auth/authService";
import { validateRequest } from "./middleware/validation";
import { asyncHandler } from "./middleware/errorHandler";
import * as schemas from "./validation/schemas";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware for handling refresh tokens
  app.use(cookieParser());
  
  // Authentication routes (public)
  app.use('/auth', authRoutes);
  
  // API routes for prediction data storage (protected)
  app.get("/api/predictions", 
    authenticateToken,
    asyncHandler(async (req, res) => {
      const predictions = await storage.getAllPredictions();
      res.json(predictions);
    })
  );

  app.post("/api/predictions", 
    authenticateToken,
    validateRequest(schemas.createPredictionSchema),
    asyncHandler(async (req, res) => {
      const prediction = await storage.createPrediction(req.body);
      res.json(prediction);
    })
  );

  app.get("/api/analytics", 
    authenticateToken,
    asyncHandler(async (req, res) => {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    })
  );

  // Q-Learning API endpoints (protected)
  app.post("/api/qlearning/recommendation", 
    authenticateToken,
    validateRequest(schemas.qLearningRecommendationSchema),
    asyncHandler(async (req, res) => {
      const { gameState, timing, bankroll } = req.body;
      const recommendation = await qLearningService.getRecommendation(gameState, timing, bankroll);
      res.json(recommendation);
    })
  );

  app.post("/api/qlearning/execute-bet", 
    authenticateToken,
    validateRequest(schemas.executeBetSchema),
    asyncHandler(async (req, res) => {
      const { gameId, decision, gameState } = req.body;
      const bet = await qLearningService.executeBet(gameId, decision, gameState);
      res.json(bet);
    })
  );

  app.post("/api/qlearning/start-game", 
    authenticateToken,
    validateRequest(schemas.startGameSchema),
    asyncHandler(async (req, res) => {
      const { gameId } = req.body;
      await qLearningService.startGame(gameId);
      res.json({ message: 'Game started successfully' });
    })
  );

  app.post("/api/qlearning/end-game", 
    authenticateToken,
    validateRequest(schemas.endGameSchema),
    asyncHandler(async (req, res) => {
      const { gameId, finalTick } = req.body;
      await qLearningService.endGame(gameId, finalTick);
      res.json({ message: 'Game ended successfully' });
    })
  );

  app.post("/api/qlearning/record-tick", 
    authenticateToken,
    validateRequest(schemas.recordTickSchema),
    asyncHandler(async (req, res) => {
      const { tick, timestamp } = req.body;
      qLearningService.recordTick(tick, timestamp);
      res.json({ message: 'Tick recorded successfully' });
    })
  );

  app.get("/api/qlearning/stats", 
    authenticateToken,
    asyncHandler(async (req, res) => {
      const stats = await qLearningService.getStats();
      res.json(stats);
    })
  );

  app.get("/api/qlearning/analytics", 
    authenticateToken,
    asyncHandler(async (req, res) => {
      const analytics = await qLearningService.getAnalytics();
      res.json(analytics);
    })
  );

  app.post("/api/qlearning/training", 
    authenticateToken,
    requireRole(['admin']), // Only admins can toggle training
    validateRequest(schemas.trainingToggleSchema),
    asyncHandler(async (req, res) => {
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

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to internal WebSocket');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Received message:', data);
        
        // Handle internal WebSocket messages if needed
        // This is separate from the rugs.fun WebSocket connection
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from internal WebSocket');
    });

    // Send initial connection confirmation
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        timestamp: Date.now()
      }));
    }
  });

  return httpServer;
}
