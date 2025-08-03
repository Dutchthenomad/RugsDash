import { storage } from "../storage";
import { 
  type QState, type QAction, type QValue, type SideBet,
  type TrainingEpisode, type ModelParameter 
} from "@shared/schema";
import crypto from "crypto";

export interface GameStateFeatures {
  tickCount: number;
  priceLevel: number;
  volatilityLevel: number;
  timingReliability: number;
  gamePhase: 'EARLY' | 'MID' | 'LATE';
  recentPattern: 'RISING' | 'FALLING' | 'VOLATILE';
  peakPrice: number;
  ticksSincePeak: number;
  avgTickInterval: number;
}

export interface QLearningDecision {
  action: 'BET_SMALL' | 'BET_MEDIUM' | 'BET_LARGE' | 'HOLD';
  confidence: number;
  expectedValue: number;
  qValue: number;
  reasoning: string;
  betAmount?: number;
}

export class QLearningAgent {
  private learningRate: number = 0.1;
  private discountFactor: number = 0.95;
  private explorationRate: number = 0.15;
  private explorationDecay: number = 0.995;
  private minExploration: number = 0.05;
  
  private episodeNumber: number = 0;
  private currentEpisode: {
    gameId: string;
    states: string[];
    actions: string[];
    rewards: number[];
    startTime: Date;
  } | null = null;

  private tickHistory: Array<{ tick: number; interval: number; timestamp: number }> = [];
  private gameHistory: Array<{ gameId: string; finalTick: number; outcome: 'WIN' | 'LOSS' }> = [];

  constructor() {
    this.initializeActions();
    this.loadParameters();
  }

  // Initialize standard actions in database
  private async initializeActions() {
    const actions = [
      { actionType: 'HOLD', betSizeMultiplier: 0, description: 'Hold and wait for better opportunity' },
      { actionType: 'BET_SMALL', betSizeMultiplier: 0.5, description: 'Small conservative bet (0.5x base)' },
      { actionType: 'BET_MEDIUM', betSizeMultiplier: 1.0, description: 'Medium standard bet (1.0x base)' },
      { actionType: 'BET_LARGE', betSizeMultiplier: 1.5, description: 'Large aggressive bet (1.5x base)' }
    ];

    for (const action of actions) {
      try {
        await storage.createQAction(action);
      } catch (error) {
        // Action might already exist, which is fine
      }
    }
  }

  // Load hyperparameters from database
  private async loadParameters() {
    try {
      const params = await storage.getAllModelParameters();
      const paramMap = new Map(params.map(p => [p.parameterName, p.parameterValue]));
      
      this.learningRate = paramMap.get('learning_rate') || 0.1;
      this.discountFactor = paramMap.get('discount_factor') || 0.95;
      this.explorationRate = paramMap.get('exploration_rate') || 0.15;
      this.explorationDecay = paramMap.get('exploration_decay') || 0.995;
      this.minExploration = paramMap.get('min_exploration') || 0.05;
      
      const episodeParam = await storage.getModelParameter('episode_number');
      this.episodeNumber = episodeParam?.parameterValue || 0;
    } catch (error) {
      console.warn('Failed to load Q-learning parameters, using defaults:', error);
    }
  }

  // Feature engineering: Convert game state to discrete features
  public encodeGameState(gameState: any, timing: any): GameStateFeatures {
    // Discretize tick count into phases
    const tickCount = gameState.tickCount || 0;
    let gamePhase: 'EARLY' | 'MID' | 'LATE' = 'EARLY';
    if (tickCount > 200) gamePhase = 'LATE';
    else if (tickCount > 50) gamePhase = 'MID';

    // Discretize price level (1-5 scale)
    const price = gameState.price || 1.0;
    const priceLevel = Math.min(5, Math.max(1, Math.ceil(price)));

    // Calculate volatility level based on recent price changes
    const volatilityLevel = this.calculateVolatilityLevel(gameState);
    
    // Timing reliability from recent tick intervals
    const timingReliability = this.calculateTimingReliability();
    
    // Recent pattern detection
    const recentPattern = this.detectRecentPattern(gameState);

    // Advanced features
    const peakPrice = gameState.peakPrice || price;
    const ticksSincePeak = Math.max(0, tickCount - (gameState.peakTick || 0));
    const avgTickInterval = this.getAverageTickInterval();

    return {
      tickCount,
      priceLevel,
      volatilityLevel,
      timingReliability,
      gamePhase,
      recentPattern,
      peakPrice,
      ticksSincePeak,
      avgTickInterval
    };
  }

  // Get or create Q-state from features
  private async getOrCreateState(features: GameStateFeatures): Promise<QState> {
    const stateFeatures = {
      tickCount: features.tickCount,
      priceLevel: features.priceLevel,
      volatilityLevel: features.volatilityLevel,
      timingReliability: features.timingReliability,
      gamePhase: features.gamePhase,
      recentPattern: features.recentPattern
    };

    return await storage.getOrCreateQState(stateFeatures);
  }

  // Main decision-making function
  public async makeDecision(gameState: any, timing: any, bankroll: number = 1.0): Promise<QLearningDecision> {
    const features = this.encodeGameState(gameState, timing);
    const state = await this.getOrCreateState(features);
    const actions = await storage.getQActions();
    
    // Get Q-values for all actions in this state
    const qValues = new Map<string, number>();
    for (const action of actions) {
      const qValue = await storage.getQValue(state.id, action.id);
      qValues.set(action.id, qValue?.qValue || 0);
    }

    // Epsilon-greedy action selection
    let selectedAction: QAction;
    if (Math.random() < this.explorationRate) {
      // Explore: random action
      selectedAction = actions[Math.floor(Math.random() * actions.length)];
    } else {
      // Exploit: best Q-value action
      let bestActionId = actions[0].id;
      let bestQValue = qValues.get(bestActionId) || 0;
      
      for (const action of actions) {
        const qValue = qValues.get(action.id) || 0;
        if (qValue > bestQValue) {
          bestQValue = qValue;
          bestActionId = action.id;
        }
      }
      selectedAction = actions.find(a => a.id === bestActionId)!;
    }

    // Calculate bet amount for betting actions
    let betAmount = 0;
    if (selectedAction.actionType !== 'HOLD') {
      const baseBetSize = Math.min(0.05, bankroll * 0.02); // 2% of bankroll, max 0.05 SOL
      betAmount = baseBetSize * selectedAction.betSizeMultiplier;
    }

    // Get confidence and expected value
    const confidence = this.calculateConfidence(state, selectedAction, qValues);
    const expectedValue = this.calculateExpectedValue(features, selectedAction, qValues);

    return {
      action: selectedAction.actionType as any,
      confidence,
      expectedValue,
      qValue: qValues.get(selectedAction.id) || 0,
      reasoning: this.generateReasoning(features, selectedAction, qValues),
      betAmount
    };
  }

  // Start a new training episode
  public async startEpisode(gameId: string): Promise<void> {
    this.currentEpisode = {
      gameId,
      states: [],
      actions: [],
      rewards: [],
      startTime: new Date()
    };
    this.episodeNumber++;
    
    // Save updated episode number
    await storage.setModelParameter('episode_number', this.episodeNumber, 'Q_LEARNING');
  }

  // Record state-action pair in current episode
  public async recordStateAction(state: QState, action: QAction): Promise<void> {
    if (!this.currentEpisode) return;
    
    this.currentEpisode.states.push(state.id);
    this.currentEpisode.actions.push(action.id);
  }

  // End episode and perform Q-learning updates
  public async endEpisode(finalOutcome: 'WIN' | 'LOSS', finalReward: number): Promise<void> {
    if (!this.currentEpisode) return;

    const episode = this.currentEpisode;
    this.currentEpisode = null;

    // Calculate rewards for each step
    const stepRewards = this.calculateStepRewards(episode, finalOutcome, finalReward);
    
    // Perform Q-learning updates
    await this.updateQValues(episode, stepRewards);
    
    // Save training episode to database
    await storage.saveTrainingEpisode({
      gameId: episode.gameId,
      episodeNumber: this.episodeNumber,
      stateSequence: episode.states,
      actionSequence: episode.actions,
      rewardSequence: stepRewards,
      totalReward: finalReward,
      episodeLength: episode.states.length,
      finalOutcome,
      explorationRate: this.explorationRate,
      learningRate: this.learningRate
    });

    // Update exploration rate
    this.explorationRate = Math.max(
      this.minExploration,
      this.explorationRate * this.explorationDecay
    );
    
    await storage.setModelParameter('exploration_rate', this.explorationRate, 'Q_LEARNING');

    // Record game outcome for analysis
    this.gameHistory.push({
      gameId: episode.gameId,
      finalTick: 0, // TODO: Get from game state
      outcome: finalOutcome
    });

    // Save performance metrics
    await this.savePerformanceMetrics();
  }

  // Q-learning update using Bellman equation
  private async updateQValues(episode: any, stepRewards: number[]): Promise<void> {
    for (let i = 0; i < episode.states.length; i++) {
      const stateId = episode.states[i];
      const actionId = episode.actions[i];
      const reward = stepRewards[i];
      
      // Get current Q-value
      const currentQValue = await storage.getQValue(stateId, actionId);
      const oldValue = currentQValue?.qValue || 0;
      
      // Calculate next state's max Q-value for Bellman equation
      let nextMaxQ = 0;
      if (i < episode.states.length - 1) {
        const nextStateId = episode.states[i + 1];
        const actions = await storage.getQActions();
        
        for (const action of actions) {
          const nextQ = await storage.getQValue(nextStateId, action.id);
          nextMaxQ = Math.max(nextMaxQ, nextQ?.qValue || 0);
        }
      }
      
      // Bellman equation: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
      const newValue = oldValue + this.learningRate * (
        reward + this.discountFactor * nextMaxQ - oldValue
      );
      
      // Update Q-value in database
      await storage.updateQValue(stateId, actionId, newValue, reward);
    }
  }

  // Calculate step-wise rewards for the episode
  private calculateStepRewards(episode: any, finalOutcome: 'WIN' | 'LOSS', finalReward: number): number[] {
    const rewards: number[] = [];
    const episodeLength = episode.states.length;
    
    for (let i = 0; i < episodeLength; i++) {
      let reward = 0;
      
      // Final step gets the main reward
      if (i === episodeLength - 1) {
        reward = finalOutcome === 'WIN' ? finalReward : -1;
      } else {
        // Intermediate steps get small negative rewards for time cost
        reward = -0.01;
      }
      
      rewards.push(reward);
    }
    
    return rewards;
  }

  // Helper functions for feature engineering
  private calculateVolatilityLevel(gameState: any): number {
    // Simple volatility calculation - can be enhanced
    const price = gameState.price || 1.0;
    const peakPrice = gameState.peakPrice || price;
    const volatility = Math.abs(price - peakPrice) / peakPrice;
    
    if (volatility > 0.1) return 3; // High
    if (volatility > 0.05) return 2; // Medium
    return 1; // Low
  }

  private calculateTimingReliability(): number {
    if (this.tickHistory.length < 10) return 2; // Default medium
    
    const recent = this.tickHistory.slice(-20);
    const intervals = recent.map(t => t.interval);
    const mean = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
    const cv = Math.sqrt(variance) / mean;
    
    if (cv < 0.1) return 3; // High reliability
    if (cv < 0.3) return 2; // Medium reliability
    return 1; // Low reliability
  }

  private detectRecentPattern(gameState: any): 'RISING' | 'FALLING' | 'VOLATILE' {
    // Simple pattern detection - can be enhanced with more sophisticated analysis
    const price = gameState.price || 1.0;
    const peakPrice = gameState.peakPrice || price;
    
    if (price > peakPrice * 0.95) return 'RISING';
    if (price < peakPrice * 0.8) return 'FALLING';
    return 'VOLATILE';
  }

  private getAverageTickInterval(): number {
    if (this.tickHistory.length === 0) return 250; // Default
    
    const recent = this.tickHistory.slice(-10);
    return recent.reduce((sum, t) => sum + t.interval, 0) / recent.length;
  }

  private calculateConfidence(state: QState, action: QAction, qValues: Map<string, number>): number {
    // Confidence based on Q-value difference and visit count
    const qValue = qValues.get(action.id) || 0;
    const maxQValue = Math.max(...Array.from(qValues.values()));
    const minQValue = Math.min(...Array.from(qValues.values()));
    
    const range = maxQValue - minQValue;
    if (range === 0) return 0.5;
    
    const relativeValue = (qValue - minQValue) / range;
    const visitFactor = Math.min(1, state.visitCount / 100);
    
    return relativeValue * visitFactor;
  }

  private calculateExpectedValue(features: GameStateFeatures, action: QAction, qValues: Map<string, number>): number {
    // Simple expected value calculation - can be enhanced
    const qValue = qValues.get(action.id) || 0;
    
    if (action.actionType === 'HOLD') return 0;
    
    // Convert Q-value to expected value estimate
    return qValue * action.betSizeMultiplier;
  }

  private generateReasoning(features: GameStateFeatures, action: QAction, qValues: Map<string, number>): string {
    const qValue = qValues.get(action.id) || 0;
    
    if (action.actionType === 'HOLD') {
      return `Holding due to ${features.gamePhase} phase and ${features.recentPattern} pattern`;
    }
    
    return `${action.actionType} recommended (Q-value: ${qValue.toFixed(3)}) in ${features.gamePhase} phase`;
  }

  // Save current performance metrics
  private async savePerformanceMetrics(): Promise<void> {
    const recent = this.gameHistory.slice(-100); // Last 100 games
    if (recent.length === 0) return;
    
    const wins = recent.filter(g => g.outcome === 'WIN').length;
    const winRate = wins / recent.length;
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    await storage.savePerformanceMetric({
      metricType: 'WIN_RATE',
      value: winRate,
      windowStart,
      windowEnd: now,
      sampleSize: recent.length,
      modelVersion: 'v1.0'
    });
    
    await storage.savePerformanceMetric({
      metricType: 'EXPLORATION_RATE',
      value: this.explorationRate,
      windowStart,
      windowEnd: now,
      sampleSize: 1,
      modelVersion: 'v1.0'
    });
  }

  // Record tick timing for adaptive analysis
  public recordTick(tick: number, timestamp: number): void {
    if (this.tickHistory.length > 0) {
      const lastTimestamp = this.tickHistory[this.tickHistory.length - 1].timestamp;
      const interval = timestamp - lastTimestamp;
      
      this.tickHistory.push({ tick, interval, timestamp });
      
      // Keep only recent history
      if (this.tickHistory.length > 100) {
        this.tickHistory.shift();
      }
    } else {
      this.tickHistory.push({ tick, interval: 250, timestamp });
    }
  }

  // Get current learning statistics
  public async getStats(): Promise<{
    episodeNumber: number;
    explorationRate: number;
    recentWinRate: number;
    totalStates: number;
    totalQValues: number;
  }> {
    const allStates = await storage.getQStates(1000);
    
    const recent = this.gameHistory.slice(-50);
    const wins = recent.filter(g => g.outcome === 'WIN').length;
    const recentWinRate = recent.length > 0 ? wins / recent.length : 0;
    
    // Count total Q-values (approximate)
    let totalQValues = 0;
    for (const state of allStates.slice(0, 10)) { // Sample first 10 states
      const qVals = await storage.getTopQValues(state.id);
      totalQValues += qVals.length;
    }
    totalQValues = totalQValues * (allStates.length / 10); // Extrapolate
    
    return {
      episodeNumber: this.episodeNumber,
      explorationRate: this.explorationRate,
      recentWinRate,
      totalStates: allStates.length,
      totalQValues: Math.round(totalQValues)
    };
  }
}