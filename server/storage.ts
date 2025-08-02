import { type User, type InsertUser, type Prediction, type InsertPrediction, type PredictionResult, type InsertPredictionResult, type GameHistory, type InsertGameHistory, type MarketPattern, type InsertMarketPattern } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Prediction methods
  getAllPredictions(): Promise<Prediction[]>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  getAnalytics(): Promise<{
    accuracy: number;
    totalBets: number;
    winRate: number;
    totalProfit: number;
    brierScore: number;
  }>;
  
  // Historical game analysis
  saveGameHistory(history: InsertGameHistory): Promise<GameHistory>;
  getGameHistory(limit?: number): Promise<GameHistory[]>;
  getMarketPatterns(): Promise<MarketPattern[]>;
  updateMarketPattern(pattern: InsertMarketPattern): Promise<MarketPattern>;
  getHistoricalAnalytics(): Promise<{
    totalGames: number;
    avgGameLength: number;
    avgPeakMultiplier: number;
    rugProbabilityByTick: Map<number, number>;
    confidenceScore: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private predictions: Map<string, Prediction>;
  private predictionResults: Map<string, PredictionResult>;
  private gameHistory: Map<string, GameHistory>;
  private marketPatterns: Map<string, MarketPattern>;

  constructor() {
    this.users = new Map();
    this.predictions = new Map();
    this.predictionResults = new Map();
    this.gameHistory = new Map();
    this.marketPatterns = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllPredictions(): Promise<Prediction[]> {
    return Array.from(this.predictions.values());
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const id = randomUUID();
    const prediction: Prediction = {
      ...insertPrediction,
      id,
      timestamp: new Date()
    };
    this.predictions.set(id, prediction);
    return prediction;
  }

  async getAnalytics(): Promise<{
    accuracy: number;
    totalBets: number;
    winRate: number;
    totalProfit: number;
    brierScore: number;
  }> {
    const results = Array.from(this.predictionResults.values());
    const totalBets = results.length;
    
    if (totalBets === 0) {
      return {
        accuracy: 0,
        totalBets: 0,
        winRate: 0,
        totalProfit: 0,
        brierScore: 0
      };
    }
    
    const correctPredictions = results.filter(r => r.correct).length;
    const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);
    const wins = results.filter(r => r.actual).length;
    
    return {
      accuracy: correctPredictions / totalBets,
      totalBets,
      winRate: wins / totalBets,
      totalProfit,
      brierScore: 0.1 // Placeholder
    };
  }

  async saveGameHistory(insertHistory: InsertGameHistory): Promise<GameHistory> {
    const id = randomUUID();
    const history: GameHistory = {
      ...insertHistory,
      id
    };
    this.gameHistory.set(id, history);
    return history;
  }

  async getGameHistory(limit: number = 100): Promise<GameHistory[]> {
    const histories = Array.from(this.gameHistory.values())
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
    return limit ? histories.slice(0, limit) : histories;
  }

  async getMarketPatterns(): Promise<MarketPattern[]> {
    return Array.from(this.marketPatterns.values());
  }

  async updateMarketPattern(insertPattern: InsertMarketPattern): Promise<MarketPattern> {
    const id = randomUUID();
    const pattern: MarketPattern = {
      ...insertPattern,
      id,
      lastUpdated: new Date()
    };
    this.marketPatterns.set(id, pattern);
    return pattern;
  }

  async getHistoricalAnalytics(): Promise<{
    totalGames: number;
    avgGameLength: number;
    avgPeakMultiplier: number;
    rugProbabilityByTick: Map<number, number>;
    confidenceScore: number;
  }> {
    const histories = Array.from(this.gameHistory.values());
    const totalGames = histories.length;
    
    if (totalGames === 0) {
      return {
        totalGames: 0,
        avgGameLength: 0,
        avgPeakMultiplier: 0,
        rugProbabilityByTick: new Map(),
        confidenceScore: 0
      };
    }
    
    const avgGameLength = histories.reduce((sum, h) => sum + h.finalTick, 0) / totalGames;
    const avgPeakMultiplier = histories.reduce((sum, h) => sum + h.peakPrice, 0) / totalGames;
    
    // Calculate rug probability by tick ranges
    const rugProbabilityByTick = new Map<number, number>();
    for (let tick = 0; tick <= 1000; tick += 50) {
      const gamesAtTick = histories.filter(h => h.finalTick >= tick && h.finalTick < tick + 50);
      if (gamesAtTick.length > 0) {
        rugProbabilityByTick.set(tick, gamesAtTick.length / totalGames);
      }
    }
    
    const confidenceScore = Math.min(totalGames / 100, 1); // Confidence grows with data
    
    return {
      totalGames,
      avgGameLength,
      avgPeakMultiplier,
      rugProbabilityByTick,
      confidenceScore
    };
  }
}

export const storage = new MemStorage();
