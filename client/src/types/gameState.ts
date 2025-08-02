export interface GameStateData {
  tickCount: number;
  price: number;
  active: boolean;
  cooldownTimer: number;
  peakPrice?: number;
  gameId?: string;
  timestamp?: number;
}

export interface PredictionData {
  rugProbability: number;
  expectedValue: number;
  confidence: number;
  zone: PredictionZone;
  recommendation: string;
}

export interface TimingData {
  currentRate: number;
  reliability: number;
  variance: number;
  mean: number;
  median: number;
}

export interface AnalyticsData {
  accuracy: number;
  recent10: string;
  confidence: number;
  brierScore: number;
  totalBets: number;
  winRate: number;
  totalProfit: number;
}

export interface MarketData {
  avgLength: number;
  earlyRugRate: number;
  lateGameRate: number;
  volatility: number;
}

export interface StrategyData {
  recommendedBet: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  maxProfit: number;
  successRate: number;
}

export interface PredictionZone {
  name: 'AVOID' | 'CAUTION' | 'OPPORTUNITY' | 'STRONG' | 'EXCELLENT' | 'CERTAINTY';
  description: string;
  recommendation: string;
  color: string;
  threshold: [number, number];
}

export interface RecentPrediction {
  gameId: string;
  startTick: number;
  endTick: number;
  result: 'WIN' | 'LOSS';
  profit: number;
}

export interface ConnectionStatus {
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';
  reconnectAttempts: number;
  message?: string;
}
