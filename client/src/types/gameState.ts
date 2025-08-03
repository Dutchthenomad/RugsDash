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

export interface HistoricalInsights {
  totalGamesAnalyzed: number;
  avgGameLength: number;
  avgPeakMultiplier: number;
  shortGameRate: number;
  longGameRate: number;
  modelConfidence: number;
  optimalBetTiming: Array<{
    tick: number;
    probability: number;
    expectedValue: number;
  }>;
}

export interface BankrollStrategy {
  recommendedBankroll: number;
  maxConsecutiveLosses: number;
  expectedWinStreak: number;
  profitProbability: number;
  breakEvenPoint: number;
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

export interface PaperTrade {
  id: string;
  gameId: string;
  betTick: number;
  exitTick: number;
  betAmount: number;
  probability: number;
  expectedValue: number;
  actualOutcome: 'WIN' | 'LOSS' | 'PENDING';
  profit: number;
  confidence: number;
  zone: string;
  timestamp: Date;
}

export interface BotSettings {
  enabled: boolean;
  minConfidence: number;
  maxBetSize: number;
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  autoExitThreshold: number;
  minExpectedValue: number;
}

export interface PaperTradingBot {
  settings: BotSettings;
  currentTrade: PaperTrade | null;
  tradeHistory: PaperTrade[];
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  averageProfit: number;
  maxDrawdown: number;
  currentStreak: {
    type: 'WIN' | 'LOSS';
    count: number;
  };
  bankroll: number;
  roi: number;
}
