import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { qLearningService } from "./qlearning/QLearningService";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for prediction data storage
  app.get("/api/predictions", async (req, res) => {
    try {
      const predictions = await storage.getAllPredictions();
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch predictions" });
    }
  });

  app.post("/api/predictions", async (req, res) => {
    try {
      const prediction = await storage.createPrediction(req.body);
      res.json(prediction);
    } catch (error) {
      res.status(400).json({ error: "Failed to create prediction" });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Q-Learning API endpoints
  app.post("/api/qlearning/recommendation", async (req, res) => {
    try {
      const { gameState, timing, bankroll } = req.body;
      const recommendation = await qLearningService.getRecommendation(gameState, timing, bankroll);
      res.json(recommendation);
    } catch (error) {
      console.error('Q-learning recommendation error:', error);
      res.status(500).json({ error: "Failed to get Q-learning recommendation" });
    }
  });

  app.post("/api/qlearning/execute-bet", async (req, res) => {
    try {
      const { gameId, decision, gameState } = req.body;
      const bet = await qLearningService.executeBet(gameId, decision, gameState);
      res.json(bet);
    } catch (error) {
      console.error('Q-learning bet execution error:', error);
      res.status(500).json({ error: "Failed to execute Q-learning bet" });
    }
  });

  app.post("/api/qlearning/start-game", async (req, res) => {
    try {
      const { gameId } = req.body;
      await qLearningService.startGame(gameId);
      res.json({ success: true });
    } catch (error) {
      console.error('Q-learning start game error:', error);
      res.status(500).json({ error: "Failed to start Q-learning game" });
    }
  });

  app.post("/api/qlearning/end-game", async (req, res) => {
    try {
      const { gameId, finalTick } = req.body;
      await qLearningService.endGame(gameId, finalTick);
      res.json({ success: true });
    } catch (error) {
      console.error('Q-learning end game error:', error);
      res.status(500).json({ error: "Failed to end Q-learning game" });
    }
  });

  app.post("/api/qlearning/record-tick", async (req, res) => {
    try {
      const { tick, timestamp } = req.body;
      qLearningService.recordTick(tick, timestamp);
      res.json({ success: true });
    } catch (error) {
      console.error('Q-learning tick recording error:', error);
      res.status(500).json({ error: "Failed to record tick" });
    }
  });

  app.get("/api/qlearning/stats", async (req, res) => {
    try {
      const stats = await qLearningService.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Q-learning stats error:', error);
      res.status(500).json({ error: "Failed to get Q-learning stats" });
    }
  });

  app.get("/api/qlearning/analytics", async (req, res) => {
    try {
      const analytics = await qLearningService.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Q-learning analytics error:', error);
      res.status(500).json({ error: "Failed to get Q-learning analytics" });
    }
  });

  app.post("/api/qlearning/training", async (req, res) => {
    try {
      const { enabled } = req.body;
      qLearningService.setTraining(enabled);
      res.json({ success: true, training: enabled });
    } catch (error) {
      console.error('Q-learning training toggle error:', error);
      res.status(500).json({ error: "Failed to toggle training" });
    }
  });

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
