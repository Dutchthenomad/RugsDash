import { 
  type User, type InsertUser, type RefreshToken, type InsertRefreshToken,
  type Prediction, type InsertPrediction, 
  type PredictionResult, type InsertPredictionResult, type GameHistory, 
  type InsertGameHistory, type MarketPattern, type InsertMarketPattern,
  type SideBet, type InsertSideBet, type QState, type InsertQState,
  type QAction, type InsertQAction, type QValue, type InsertQValue,
  type TrainingEpisode, type InsertTrainingEpisode, type ModelParameter,
  type InsertModelParameter, type PerformanceMetric, type InsertPerformanceMetric
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(userId: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  
  // Refresh token methods
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeRefreshTokensByDevice(userId: string, deviceInfo?: string): Promise<void>;
  revokeAllRefreshTokens(userId: string): Promise<void>;
  
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
  
  // Q-Learning and side bet methods
  saveSideBet(sideBet: InsertSideBet): Promise<SideBet>;
  updateSideBet(id: string, update: Partial<InsertSideBet>): Promise<SideBet>;
  getSideBets(gameId?: string, playerId?: string): Promise<SideBet[]>;
  
  // Q-Learning state management
  getOrCreateQState(stateFeatures: Record<string, any>): Promise<QState>;
  updateQState(stateId: string, visitCount: number): Promise<QState>;
  getQStates(limit?: number): Promise<QState[]>;
  
  // Q-Learning actions
  getQActions(): Promise<QAction[]>;
  createQAction(action: InsertQAction): Promise<QAction>;
  
  // Q-Values management
  getQValue(stateId: string, actionId: string): Promise<QValue | null>;
  updateQValue(stateId: string, actionId: string, qValue: number, reward?: number): Promise<QValue>;
  getTopQValues(stateId: string): Promise<QValue[]>;
  
  // Training episodes
  saveTrainingEpisode(episode: InsertTrainingEpisode): Promise<TrainingEpisode>;
  getTrainingEpisodes(limit?: number): Promise<TrainingEpisode[]>;
  
  // Model parameters
  getModelParameter(name: string): Promise<ModelParameter | null>;
  setModelParameter(name: string, value: number, category: string, description?: string): Promise<ModelParameter>;
  getAllModelParameters(): Promise<ModelParameter[]>;
  
  // Performance tracking
  savePerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  getPerformanceMetrics(metricType?: string, limit?: number): Promise<PerformanceMetric[]>;
  
  // Q-Learning analytics
  getQLearningAnalytics(): Promise<{
    totalEpisodes: number;
    avgEpisodeReward: number;
    convergenceRate: number;
    explorationRate: number;
    winRate: number;
    profitability: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private refreshTokens: Map<string, RefreshToken>;
  private predictions: Map<string, Prediction>;
  private predictionResults: Map<string, PredictionResult>;
  private gameHistory: Map<string, GameHistory>;
  private marketPatterns: Map<string, MarketPattern>;
  
  // Q-Learning storage
  private sideBets: Map<string, SideBet>;
  private qStates: Map<string, QState>;
  private qActions: Map<string, QAction>;
  private qValues: Map<string, QValue>;
  private trainingEpisodes: Map<string, TrainingEpisode>;
  private modelParameters: Map<string, ModelParameter>;
  private performanceMetrics: Map<string, PerformanceMetric>;

  constructor() {
    this.users = new Map();
    this.refreshTokens = new Map();
    this.predictions = new Map();
    this.predictionResults = new Map();
    this.gameHistory = new Map();
    this.marketPatterns = new Map();
    
    // Initialize Q-Learning storage
    this.sideBets = new Map();
    this.qStates = new Map();
    this.qActions = new Map();
    this.qValues = new Map();
    this.trainingEpisodes = new Map();
    this.modelParameters = new Map();
    this.performanceMetrics = new Map();
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
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email || null,
      role: insertUser.role || 'user',
      isActive: true,
      lastLogin: null,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.password = hashedPassword;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  // Refresh token methods
  async createRefreshToken(insertToken: InsertRefreshToken): Promise<RefreshToken> {
    const id = randomUUID();
    const token: RefreshToken = {
      ...insertToken,
      id,
      deviceInfo: insertToken.deviceInfo || null,
      isRevoked: insertToken.isRevoked || false,
      createdAt: new Date(),
    };
    this.refreshTokens.set(insertToken.token, token);
    return token;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    return this.refreshTokens.get(token);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const refreshToken = this.refreshTokens.get(token);
    if (refreshToken) {
      refreshToken.isRevoked = true;
      this.refreshTokens.set(token, refreshToken);
    }
  }

  async revokeRefreshTokensByDevice(userId: string, deviceInfo?: string): Promise<void> {
    for (const [tokenStr, token] of this.refreshTokens.entries()) {
      if (token.userId === userId && (!deviceInfo || token.deviceInfo === deviceInfo)) {
        token.isRevoked = true;
        this.refreshTokens.set(tokenStr, token);
      }
    }
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    for (const [tokenStr, token] of this.refreshTokens.entries()) {
      if (token.userId === userId) {
        token.isRevoked = true;
        this.refreshTokens.set(tokenStr, token);
      }
    }
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

  // Q-Learning side bet methods
  async saveSideBet(insertSideBet: InsertSideBet): Promise<SideBet> {
    const id = randomUUID();
    const sideBet: SideBet = {
      ...insertSideBet,
      id,
      rugTick: insertSideBet.rugTick || null,
      gameState: insertSideBet.gameState || null,
      profit: insertSideBet.profit || 0,
      createdAt: new Date(),
      resolvedAt: insertSideBet.resolvedAt || null
    };
    this.sideBets.set(id, sideBet);
    return sideBet;
  }

  async updateSideBet(id: string, update: Partial<InsertSideBet>): Promise<SideBet> {
    const existing = this.sideBets.get(id);
    if (!existing) {
      throw new Error(`SideBet with id ${id} not found`);
    }
    
    const updated: SideBet = {
      ...existing,
      ...update,
      resolvedAt: update.resolvedAt || existing.resolvedAt
    };
    this.sideBets.set(id, updated);
    return updated;
  }

  async getSideBets(gameId?: string, playerId?: string): Promise<SideBet[]> {
    let bets = Array.from(this.sideBets.values());
    
    if (gameId) {
      bets = bets.filter(bet => bet.gameId === gameId);
    }
    if (playerId) {
      bets = bets.filter(bet => bet.playerId === playerId);
    }
    
    return bets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Q-Learning state methods
  async getOrCreateQState(stateFeatures: Record<string, any>): Promise<QState> {
    // Create hash of state features for deduplication
    const stateHash = JSON.stringify(stateFeatures);
    
    // Try to find existing state
    const existingState = Array.from(this.qStates.values()).find(state => state.stateHash === stateHash);
    
    if (existingState) {
      // Update visit count and last seen
      const updated: QState = {
        ...existingState,
        visitCount: existingState.visitCount + 1,
        lastSeen: new Date()
      };
      this.qStates.set(existingState.id, updated);
      return updated;
    }
    
    // Create new state
    const id = randomUUID();
    const newState: QState = {
      id,
      stateHash,
      tickCount: stateFeatures.tickCount,
      priceLevel: stateFeatures.priceLevel,
      volatilityLevel: stateFeatures.volatilityLevel,
      timingReliability: stateFeatures.timingReliability,
      gamePhase: stateFeatures.gamePhase,
      recentPattern: stateFeatures.recentPattern,
      features: stateFeatures,
      visitCount: 1,
      createdAt: new Date(),
      lastSeen: new Date()
    };
    
    this.qStates.set(id, newState);
    return newState;
  }

  async updateQState(stateId: string, visitCount: number): Promise<QState> {
    const existing = this.qStates.get(stateId);
    if (!existing) {
      throw new Error(`QState with id ${stateId} not found`);
    }
    
    const updated: QState = {
      ...existing,
      visitCount,
      lastSeen: new Date()
    };
    this.qStates.set(stateId, updated);
    return updated;
  }

  async getQStates(limit: number = 1000): Promise<QState[]> {
    const states = Array.from(this.qStates.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    return limit ? states.slice(0, limit) : states;
  }

  // Q-Learning action methods
  async getQActions(): Promise<QAction[]> {
    return Array.from(this.qActions.values()).filter(action => action.isActive);
  }

  async createQAction(insertAction: InsertQAction): Promise<QAction> {
    const id = randomUUID();
    const action: QAction = {
      ...insertAction,
      id,
      isActive: insertAction.isActive ?? true
    };
    this.qActions.set(id, action);
    return action;
  }

  // Q-Value methods
  async getQValue(stateId: string, actionId: string): Promise<QValue | null> {
    const qValue = Array.from(this.qValues.values()).find(
      qv => qv.stateId === stateId && qv.actionId === actionId
    );
    return qValue || null;
  }

  async updateQValue(stateId: string, actionId: string, qValue: number, reward?: number): Promise<QValue> {
    // Try to update existing Q-value
    const existing = await this.getQValue(stateId, actionId);
    
    if (existing) {
      const updated: QValue = {
        ...existing,
        qValue,
        visitCount: existing.visitCount + 1,
        lastReward: reward !== undefined ? reward : existing.lastReward,
        updatedAt: new Date()
      };
      this.qValues.set(existing.id, updated);
      return updated;
    }
    
    // Create new Q-value
    const id = randomUUID();
    const newQValue: QValue = {
      id,
      stateId,
      actionId,
      qValue,
      visitCount: 1,
      lastReward: reward || null,
      updatedAt: new Date()
    };
    
    this.qValues.set(id, newQValue);
    return newQValue;
  }

  async getTopQValues(stateId: string): Promise<QValue[]> {
    return Array.from(this.qValues.values())
      .filter(qv => qv.stateId === stateId)
      .sort((a, b) => b.qValue - a.qValue)
      .slice(0, 10);
  }

  // Training episode methods
  async saveTrainingEpisode(insertEpisode: InsertTrainingEpisode): Promise<TrainingEpisode> {
    const id = randomUUID();
    const episode: TrainingEpisode = {
      ...insertEpisode,
      id,
      createdAt: new Date()
    };
    this.trainingEpisodes.set(id, episode);
    return episode;
  }

  async getTrainingEpisodes(limit: number = 100): Promise<TrainingEpisode[]> {
    const episodes = Array.from(this.trainingEpisodes.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return limit ? episodes.slice(0, limit) : episodes;
  }

  // Model parameter methods
  async getModelParameter(name: string): Promise<ModelParameter | null> {
    const param = Array.from(this.modelParameters.values()).find(p => p.parameterName === name);
    return param || null;
  }

  async setModelParameter(name: string, value: number, category: string, description?: string): Promise<ModelParameter> {
    const existing = await this.getModelParameter(name);
    
    if (existing) {
      const updated: ModelParameter = {
        ...existing,
        parameterValue: value,
        version: existing.version + 1,
        updatedAt: new Date()
      };
      this.modelParameters.set(existing.id, updated);
      return updated;
    }
    
    const id = randomUUID();
    const newParam: ModelParameter = {
      id,
      parameterName: name,
      parameterValue: value,
      description: description || null,
      category,
      version: 1,
      updatedAt: new Date()
    };
    
    this.modelParameters.set(id, newParam);
    return newParam;
  }

  async getAllModelParameters(): Promise<ModelParameter[]> {
    return Array.from(this.modelParameters.values());
  }

  // Performance metric methods
  async savePerformanceMetric(insertMetric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const id = randomUUID();
    const metric: PerformanceMetric = {
      ...insertMetric,
      id,
      createdAt: new Date()
    };
    this.performanceMetrics.set(id, metric);
    return metric;
  }

  async getPerformanceMetrics(metricType?: string, limit: number = 100): Promise<PerformanceMetric[]> {
    let metrics = Array.from(this.performanceMetrics.values());
    
    if (metricType) {
      metrics = metrics.filter(m => m.metricType === metricType);
    }
    
    return metrics
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Q-Learning analytics
  async getQLearningAnalytics(): Promise<{
    totalEpisodes: number;
    avgEpisodeReward: number;
    convergenceRate: number;
    explorationRate: number;
    winRate: number;
    profitability: number;
  }> {
    const episodes = Array.from(this.trainingEpisodes.values());
    const sideBetsData = Array.from(this.sideBets.values()).filter(bet => bet.playerId === 'bot');
    
    const totalEpisodes = episodes.length;
    const avgEpisodeReward = totalEpisodes > 0 ? 
      episodes.reduce((sum, ep) => sum + ep.totalReward, 0) / totalEpisodes : 0;
    
    // Calculate win rate from side bets
    const completedBets = sideBetsData.filter(bet => bet.actualOutcome !== 'PENDING');
    const winRate = completedBets.length > 0 ?
      completedBets.filter(bet => bet.actualOutcome === 'WIN').length / completedBets.length : 0;
    
    // Calculate profitability
    const profitability = completedBets.reduce((sum, bet) => sum + bet.profit, 0);
    
    return {
      totalEpisodes,
      avgEpisodeReward,
      convergenceRate: 0.85, // Placeholder - implement convergence detection
      explorationRate: 0.1, // Current epsilon - should be retrieved from model parameters
      winRate,
      profitability
    };
  }
}

// Database storage implementation using Drizzle ORM
import { db } from "./db";
import { 
  users, refreshTokens, gameStates, gameHistory, marketPatterns, predictions, predictionResults,
  sideBets, qStates, qActions, qValues, trainingEpisodes, modelParameters, performanceMetrics
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await db.update(users)
      .set({ 
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Refresh token methods
  async createRefreshToken(insertToken: InsertRefreshToken): Promise<RefreshToken> {
    const [token] = await db.insert(refreshTokens).values(insertToken).returning();
    return token;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return refreshToken || undefined;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.token, token));
  }

  async revokeRefreshTokensByDevice(userId: string, deviceInfo?: string): Promise<void> {
    const whereCondition = deviceInfo 
      ? and(eq(refreshTokens.userId, userId), eq(refreshTokens.deviceInfo, deviceInfo))
      : eq(refreshTokens.userId, userId);
    
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(whereCondition);
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await db.update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  // Prediction methods
  async getAllPredictions(): Promise<Prediction[]> {
    return await db.select().from(predictions).orderBy(desc(predictions.timestamp));
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const [prediction] = await db.insert(predictions).values(insertPrediction).returning();
    return prediction;
  }

  async getAnalytics(): Promise<{
    accuracy: number;
    totalBets: number;
    winRate: number;
    totalProfit: number;
    brierScore: number;
  }> {
    const results = await db.select().from(predictionResults);
    const totalBets = results.length;
    
    if (totalBets === 0) {
      return { accuracy: 0, totalBets: 0, winRate: 0, totalProfit: 0, brierScore: 0 };
    }
    
    const correctPredictions = results.filter(r => r.correct).length;
    const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);
    const wins = results.filter(r => r.actual).length;
    
    return {
      accuracy: correctPredictions / totalBets,
      totalBets,
      winRate: wins / totalBets,
      totalProfit,
      brierScore: 0.1 // Placeholder - implement proper Brier score calculation
    };
  }

  // Game history methods
  async saveGameHistory(insertHistory: InsertGameHistory): Promise<GameHistory> {
    const [history] = await db.insert(gameHistory).values(insertHistory).returning();
    return history;
  }

  async getGameHistory(limit: number = 100): Promise<GameHistory[]> {
    return await db.select().from(gameHistory)
      .orderBy(desc(gameHistory.endTime))
      .limit(limit);
  }

  async getMarketPatterns(): Promise<MarketPattern[]> {
    return await db.select().from(marketPatterns);
  }

  async updateMarketPattern(insertPattern: InsertMarketPattern): Promise<MarketPattern> {
    const [pattern] = await db.insert(marketPatterns).values(insertPattern).returning();
    return pattern;
  }

  async getHistoricalAnalytics(): Promise<{
    totalGames: number;
    avgGameLength: number;
    avgPeakMultiplier: number;
    rugProbabilityByTick: Map<number, number>;
    confidenceScore: number;
  }> {
    const histories = await db.select().from(gameHistory);
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
    
    return {
      totalGames,
      avgGameLength,
      avgPeakMultiplier,
      rugProbabilityByTick,
      confidenceScore: Math.min(totalGames / 100, 1)
    };
  }

  // Q-Learning side bet methods
  async saveSideBet(insertSideBet: InsertSideBet): Promise<SideBet> {
    const [sideBet] = await db.insert(sideBets).values(insertSideBet).returning();
    return sideBet;
  }

  async updateSideBet(id: string, update: Partial<InsertSideBet>): Promise<SideBet> {
    const [sideBet] = await db.update(sideBets)
      .set(update)
      .where(eq(sideBets.id, id))
      .returning();
    return sideBet;
  }

  async getSideBets(gameId?: string, playerId?: string): Promise<SideBet[]> {
    if (gameId && playerId) {
      return await db.select().from(sideBets)
        .where(and(eq(sideBets.gameId, gameId), eq(sideBets.playerId, playerId)))
        .orderBy(desc(sideBets.createdAt));
    } else if (gameId) {
      return await db.select().from(sideBets)
        .where(eq(sideBets.gameId, gameId))
        .orderBy(desc(sideBets.createdAt));
    } else if (playerId) {
      return await db.select().from(sideBets)
        .where(eq(sideBets.playerId, playerId))
        .orderBy(desc(sideBets.createdAt));
    }
    
    return await db.select().from(sideBets).orderBy(desc(sideBets.createdAt));
  }

  // Q-Learning state methods
  async getOrCreateQState(stateFeatures: Record<string, any>): Promise<QState> {
    // Create hash of state features for deduplication
    const stateHash = crypto.createHash('md5').update(JSON.stringify(stateFeatures)).digest('hex');
    
    // Try to find existing state
    let [existingState] = await db.select().from(qStates).where(eq(qStates.stateHash, stateHash));
    
    if (existingState) {
      // Update visit count and last seen
      [existingState] = await db.update(qStates)
        .set({ 
          visitCount: existingState.visitCount + 1,
          lastSeen: new Date()
        })
        .where(eq(qStates.id, existingState.id))
        .returning();
      return existingState;
    }
    
    // Create new state
    const insertState: InsertQState = {
      stateHash,
      tickCount: stateFeatures.tickCount,
      priceLevel: stateFeatures.priceLevel,
      volatilityLevel: stateFeatures.volatilityLevel,
      timingReliability: stateFeatures.timingReliability,
      gamePhase: stateFeatures.gamePhase,
      recentPattern: stateFeatures.recentPattern,
      features: stateFeatures,
      visitCount: 1
    };
    
    const [newState] = await db.insert(qStates).values(insertState).returning();
    return newState;
  }

  async updateQState(stateId: string, visitCount: number): Promise<QState> {
    const [state] = await db.update(qStates)
      .set({ visitCount, lastSeen: new Date() })
      .where(eq(qStates.id, stateId))
      .returning();
    return state;
  }

  async getQStates(limit: number = 1000): Promise<QState[]> {
    return await db.select().from(qStates)
      .orderBy(desc(qStates.lastSeen))
      .limit(limit);
  }

  // Q-Learning action methods
  async getQActions(): Promise<QAction[]> {
    return await db.select().from(qActions).where(eq(qActions.isActive, true));
  }

  async createQAction(insertAction: InsertQAction): Promise<QAction> {
    const [action] = await db.insert(qActions).values(insertAction).returning();
    return action;
  }

  // Q-Value methods
  async getQValue(stateId: string, actionId: string): Promise<QValue | null> {
    const [qValue] = await db.select().from(qValues)
      .where(and(eq(qValues.stateId, stateId), eq(qValues.actionId, actionId)));
    return qValue || null;
  }

  async updateQValue(stateId: string, actionId: string, qValue: number, reward?: number): Promise<QValue> {
    // Try to update existing Q-value
    const existing = await this.getQValue(stateId, actionId);
    
    if (existing) {
      const [updated] = await db.update(qValues)
        .set({ 
          qValue,
          visitCount: existing.visitCount + 1,
          lastReward: reward || existing.lastReward,
          updatedAt: new Date()
        })
        .where(eq(qValues.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new Q-value
    const insertQValue: InsertQValue = {
      stateId,
      actionId,
      qValue,
      visitCount: 1,
      lastReward: reward
    };
    
    const [newQValue] = await db.insert(qValues).values(insertQValue).returning();
    return newQValue;
  }

  async getTopQValues(stateId: string): Promise<QValue[]> {
    return await db.select().from(qValues)
      .where(eq(qValues.stateId, stateId))
      .orderBy(desc(qValues.qValue))
      .limit(10);
  }

  // Training episode methods
  async saveTrainingEpisode(insertEpisode: InsertTrainingEpisode): Promise<TrainingEpisode> {
    const [episode] = await db.insert(trainingEpisodes).values(insertEpisode).returning();
    return episode;
  }

  async getTrainingEpisodes(limit: number = 100): Promise<TrainingEpisode[]> {
    return await db.select().from(trainingEpisodes)
      .orderBy(desc(trainingEpisodes.createdAt))
      .limit(limit);
  }

  // Model parameter methods
  async getModelParameter(name: string): Promise<ModelParameter | null> {
    const [param] = await db.select().from(modelParameters)
      .where(eq(modelParameters.parameterName, name));
    return param || null;
  }

  async setModelParameter(name: string, value: number, category: string, description?: string): Promise<ModelParameter> {
    const existing = await this.getModelParameter(name);
    
    if (existing) {
      const [updated] = await db.update(modelParameters)
        .set({ 
          parameterValue: value,
          version: existing.version + 1,
          updatedAt: new Date()
        })
        .where(eq(modelParameters.id, existing.id))
        .returning();
      return updated;
    }
    
    const insertParam: InsertModelParameter = {
      parameterName: name,
      parameterValue: value,
      description,
      category,
      version: 1
    };
    
    const [newParam] = await db.insert(modelParameters).values(insertParam).returning();
    return newParam;
  }

  async getAllModelParameters(): Promise<ModelParameter[]> {
    return await db.select().from(modelParameters);
  }

  // Performance metric methods
  async savePerformanceMetric(insertMetric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const [metric] = await db.insert(performanceMetrics).values(insertMetric).returning();
    return metric;
  }

  async getPerformanceMetrics(metricType?: string, limit: number = 100): Promise<PerformanceMetric[]> {
    if (metricType) {
      return await db.select().from(performanceMetrics)
        .where(eq(performanceMetrics.metricType, metricType))
        .orderBy(desc(performanceMetrics.createdAt))
        .limit(limit);
    }
    
    return await db.select().from(performanceMetrics)
      .orderBy(desc(performanceMetrics.createdAt))
      .limit(limit);
  }

  // Q-Learning analytics
  async getQLearningAnalytics(): Promise<{
    totalEpisodes: number;
    avgEpisodeReward: number;
    convergenceRate: number;
    explorationRate: number;
    winRate: number;
    profitability: number;
  }> {
    const episodes = await db.select().from(trainingEpisodes);
    const sideBetsData = await db.select().from(sideBets).where(eq(sideBets.playerId, 'bot'));
    
    const totalEpisodes = episodes.length;
    const avgEpisodeReward = totalEpisodes > 0 ? 
      episodes.reduce((sum, ep) => sum + ep.totalReward, 0) / totalEpisodes : 0;
    
    // Calculate win rate from side bets
    const completedBets = sideBetsData.filter(bet => bet.actualOutcome !== 'PENDING');
    const winRate = completedBets.length > 0 ?
      completedBets.filter(bet => bet.actualOutcome === 'WIN').length / completedBets.length : 0;
    
    // Calculate profitability
    const profitability = completedBets.reduce((sum, bet) => sum + bet.profit, 0);
    
    return {
      totalEpisodes,
      avgEpisodeReward,
      convergenceRate: 0.85, // Placeholder - implement convergence detection
      explorationRate: 0.1, // Current epsilon - should be retrieved from model parameters
      winRate,
      profitability
    };
  }
}

// Switch to database storage
export const storage = new DatabaseStorage();
