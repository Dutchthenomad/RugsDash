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
  startTick: number;  // When side bet window starts
  endTick: number;    // When side bet window ends (startTick + 40)
  betAmount: number;
  payout: number;     // Total payout if win (betAmount * 5)
  probability: number;
  expectedValue: number;
  actualOutcome: 'WIN' | 'LOSS' | 'PENDING';
  profit: number;     // payout - betAmount if win, -betAmount if loss
  confidence: number;
  zone: string;
  xPayout: number;    // Multiplier (5 for side bets)
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

// === PREDICTION TRACKING SYSTEM ===

export interface PredictionRecord {
  predictionId: string;
  gameId: string;
  predictionTick: number;
  predictedEndWindow: {
    start: number;
    end: number; // 40 ticks later
  };
  gameState: {
    currentMultiplier: number;
    volatility: number;
    ticksSinceStart: number;
    timestamp: number;
  };
  confidence: number;
  triggerReason: string;
  strategy: string;
  zone: string;
}

export interface OutcomeRecord {
  predictionId: string;
  gameId: string;
  actualEndTick: number;
  withinWindow: boolean;
  ticksEarly: number; // positive if early, negative if late
  accuracy: 'early_accurate' | 'on_time' | 'late_miss' | 'false_positive';
  timestamp: number;
}

export interface PredictionMetrics {
  totalPredictions: number;
  withinWindowCount: number;
  withinWindowRate: number;
  averageTicksEarly: number;
  falsePositiveRate: number;
  optimalRangeCount: number; // predictions ending 10-30 ticks early
  optimalRangeRate: number;
  lastUpdated: number;
}

export interface TrackingData {
  predictions: {
    active: Record<string, PredictionRecord>;
    completed: PredictionRecord[];
  };
  outcomes: OutcomeRecord[];
  metrics: PredictionMetrics;
}

// === ADVANCED PREDICTION SYSTEMS ===

export interface VolatilitySignal {
  signal: 'IMMINENT_RUG_WARNING' | 'ELEVATED_RISK' | 'DANGER_ZONE' | 'CAUTION' | 'NORMAL';
  confidence: number;
  recommendedAction?: 'IMMEDIATE_EXIT' | 'PREPARE_EXIT' | 'CAUTION' | 'MONITOR' | 'SAFE';
  timeWindow?: string;
  spikeRatio?: number; // Current volatility / normal volatility
}

export interface TreasuryPrediction {
  riskLevel: 'EXTREMELY_HIGH' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'NORMAL';
  instarhugProbability: number;
  recommendation: 'AVOID_EARLY_GAME' | 'LATE_ENTRY_ONLY' | 'NORMAL_OPERATION';
  reason?: string;
}

export interface GameResult {
  id: string;
  duration: number;
  peakMultiplier: number;
  endTick: number;
  timestamp: number;
  totalPayouts?: number;   // Estimated total payouts (for treasury calculation)
  wasInstarhug?: boolean;  // Duration < 30 ticks
}

export interface AdvancedPredictionState {
  volatilityHistory: number[];
  gameHistory: GameResult[];
  currentVolatilitySignal: VolatilitySignal;
  currentTreasuryPrediction: TreasuryPrediction;
}

// === ENHANCED PREDICTION SYSTEM ===

export interface EnhancedPredictionData extends PredictionData {
  // Volatility analysis
  volatilitySignal: VolatilitySignal;
  volatilityTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  
  // Meta-algorithm detection
  treasuryRisk: TreasuryRiskLevel;
  gameSequenceRisk: number; // 0-1 scale
  
  // Enhanced probability calculations
  bayesianConfidence: number;
  timingCompensatedProbability: number;
  
  // Composite signals
  exitUrgency: 'IMMEDIATE' | 'SOON' | 'NORMAL' | 'SAFE';
  entryQuality: 'EXCELLENT' | 'GOOD' | 'POOR' | 'AVOID';
}

export type TreasuryRiskLevel = 
  | 'EXTREMELY_HIGH'  // 84% instarhug probability
  | 'HIGH'           // Treasury stress detected
  | 'ELEVATED'       // Some treasury pressure
  | 'NORMAL';        // Standard conditions

export interface EnhancedVolatilitySignal extends VolatilitySignal {
  spikeRatio: number; // Current volatility / normal volatility
}

export interface EvidenceBundle {
  basePrediction: PredictionData;
  volatilitySignal: VolatilitySignal;
  treasuryRisk: TreasuryRiskLevel;
  timing: TimingData;
}
