// Q-Learning type definitions

export interface GameState {
  tickCount: number;
  price: number;
  active: boolean;
  cooldownTimer: number;
  peakPrice: number;
  gameId?: string;
  timestamp?: number;
}

export interface TimingData {
  currentRate: number;
  reliability: number;
  variance: number;
  mean: number;
  median: number;
}

export interface QLearningDecision {
  action: 'BET_SMALL' | 'BET_MEDIUM' | 'BET_LARGE' | 'HOLD';
  betAmount?: number;
  confidence: number;
  expectedValue: number;
  reasoning: string;
}

export interface StateFeatures {
  tickCount: number;
  priceLevel: number;
  volatilityLevel: number;
  timingReliability: number;
  gamePhase: 'EARLY' | 'MID' | 'LATE';
  recentPattern?: 'RISING' | 'FALLING' | 'VOLATILE';
}

export interface Episode {
  gameId: string;
  states: string[];
  actions: string[];
  rewards: number[];
  totalReward: number;
}