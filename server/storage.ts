import { type User, type InsertUser, type Prediction, type InsertPrediction, type PredictionResult, type InsertPredictionResult } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private predictions: Map<string, Prediction>;
  private predictionResults: Map<string, PredictionResult>;

  constructor() {
    this.users = new Map();
    this.predictions = new Map();
    this.predictionResults = new Map();
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
}

export const storage = new MemStorage();
