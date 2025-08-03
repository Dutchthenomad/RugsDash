import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  Clock
} from 'lucide-react';
import { 
  PredictionData, 
  GameStateData, 
  TimingData,
  StrategyData,
  PaperTrade,
  PaperTradingBot as PaperTradingBotType,
  HistoricalInsights,
  PredictionRecord,
  OutcomeRecord,
  TrackingData,
  PredictionMetrics,
  VolatilitySignal,
  TreasuryPrediction,
  GameResult,
  AdvancedPredictionState
} from '../types/gameState';

// Helper function for trade stats
const calculateTradeStats = (history: PaperTrade[], totalProfit: number, bankroll: number) => {
  if (history.length === 0) {
    return {
      winRate: 0,
      averageProfit: 0,
      maxDrawdown: 0,
      currentStreak: { type: 'WIN' as const, count: 0 },
      roi: 0
    };
  }

  const wins = history.filter(t => t.actualOutcome === 'WIN').length;
  const winRate = wins / history.length;
  const averageProfit = history.reduce((sum, t) => sum + t.profit, 0) / history.length;
  
  let peak = 0;
  let maxDrawdown = 0;
  let runningTotal = 0;
  
  for (const trade of history) {
    runningTotal += trade.profit;
    if (runningTotal > peak) peak = runningTotal;
    const drawdown = peak - runningTotal;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  let currentStreak: { type: 'WIN' | 'LOSS'; count: number } = { type: 'WIN', count: 0 };
  if (history.length > 0) {
    const lastOutcome = history[history.length - 1].actualOutcome;
    if (lastOutcome === 'WIN' || lastOutcome === 'LOSS') {
      let count = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].actualOutcome === lastOutcome) {
          count++;
        } else {
          break;
        }
      }
      currentStreak = { type: lastOutcome, count };
    }
  }

  const roi = (totalProfit / bankroll) * 100;
  return { winRate, averageProfit, maxDrawdown, currentStreak, roi };
};

interface PredictionCenterProps {
  prediction: PredictionData;
  gameState: GameStateData;
  timing: TimingData;
  strategy: StrategyData;
  insights: HistoricalInsights;
  onTradeExecuted?: (trade: PaperTrade) => void;
}

export function PredictionCenter({ 
  prediction, 
  gameState, 
  timing, 
  strategy, 
  insights,
  onTradeExecuted 
}: PredictionCenterProps) {
  const [bot, setBot] = useState<PaperTradingBotType>({
    settings: {
      enabled: false,
      minConfidence: 0.7,
      maxBetSize: 0.1,
      riskLevel: 'MODERATE',
      autoExitThreshold: 0.3,
      minExpectedValue: 0.15
    },
    currentTrade: null,
    tradeHistory: [],
    totalProfit: 0,
    totalTrades: 0,
    winRate: 0,
    averageProfit: 0,
    maxDrawdown: 0,
    currentStreak: { type: 'WIN', count: 0 },
    bankroll: 1.0,
    roi: 0
  });

  const [showSettings, setShowSettings] = useState(false);
  const [lastDecision, setLastDecision] = useState<{
    action: 'BET' | 'HOLD' | 'EXIT';
    reason: string;
    timestamp: number;
  } | null>(null);
  const [lastTradeGameId, setLastTradeGameId] = useState<string | null>(null);
  const [tradeCooldown, setTradeCooldown] = useState<boolean>(false);
  
  // === PREDICTION TRACKING STATE ===
  const [trackingData, setTrackingData] = useState<TrackingData>({
    predictions: {
      active: {},
      completed: []
    },
    outcomes: [],
    metrics: {
      totalPredictions: 0,
      withinWindowCount: 0,
      withinWindowRate: 0,
      averageTicksEarly: 0,
      falsePositiveRate: 0,
      optimalRangeCount: 0,
      optimalRangeRate: 0,
      lastUpdated: Date.now()
    }
  });
  
  // === ADVANCED PREDICTION SYSTEMS STATE ===
  const [advancedPredictions, setAdvancedPredictions] = useState<AdvancedPredictionState>({
    volatilityHistory: [],
    gameHistory: [],
    currentVolatilitySignal: { signal: 'NORMAL', confidence: 0.5 },
    currentTreasuryPrediction: {
      riskLevel: 'NORMAL',
      instarhugProbability: 0.1,
      recommendation: 'NORMAL_OPERATION'
    }
  });

  const getZoneColor = () => {
    switch (prediction.zone.name) {
      case 'EXCELLENT': return 'bg-crypto-green text-white border-crypto-green';
      case 'STRONG': return 'bg-crypto-green/80 text-white border-crypto-green';
      case 'OPPORTUNITY': return 'bg-accent-blue text-white border-accent-blue';
      case 'CAUTION': return 'bg-yellow-600 text-white border-yellow-600';
      case 'AVOID': return 'bg-alert-red text-white border-alert-red';
      default: return 'bg-gray-600 text-white border-gray-600';
    }
  };

  const getBotStatusColor = () => {
    if (!bot.settings.enabled) return 'text-gray-400';
    if (bot.currentTrade) return 'text-accent-blue';
    return 'text-crypto-green';
  };

  const getBotStatusIcon = () => {
    if (!bot.settings.enabled) return <Pause className="h-4 w-4" />;
    if (bot.currentTrade) return <Activity className="h-4 w-4" />;
    return <Play className="h-4 w-4" />;
  };

  // ===== ADVANCED BOT STRATEGY FUNCTIONS =====
  
  // Priority 1: Zone-Based Strategy Selection
  const getStrategyForZone = (zone: string, bankroll: number) => {
    switch(zone) {
      case 'AVOID': return null; // Never bet
      case 'CAUTION': return 'conservative'; 
      case 'OPPORTUNITY': return 'moderate';
      case 'STRONG': return 'aggressive';
      case 'EXCELLENT': return 'aggressive_plus';
      case 'CERTAINTY': return 'mathematical_certainty';
      default: return null;
    }
  };

  // Priority 1: Timing Reliability Compensation
  const getAdjustedConfidence = (baseConfidence: number, timing: TimingData) => {
    const reliabilityPenalty = (1 - timing.reliability) * 0.2; // Up to 20% penalty
    return Math.max(0.1, baseConfidence - reliabilityPenalty);
  };

  // Priority 2: Bankroll Tier System
  const getBankrollTier = (bankroll: number) => {
    if (bankroll < 0.5) return 'TIER_1'; // Conservative
    if (bankroll < 2.0) return 'TIER_2'; // Moderate  
    if (bankroll < 10.0) return 'TIER_3'; // Aggressive
    return 'TIER_4'; // Mathematical Certainty
  };

  // Priority 2: Zone-Optimized Bet Sizing
  const getZoneBetMultiplier = (zone: string): number => {
    const multipliers: Record<string, number> = {
      'OPPORTUNITY': 1.0,
      'STRONG': 2.0,
      'EXCELLENT': 3.0,
      'CERTAINTY': 5.0
    };
    return multipliers[zone] || 0;
  };

  // Priority 2: Loss Recovery Logic
  const calculateRecoveryBet = (consecutiveLosses: number, baseAmount: number) => {
    if (consecutiveLosses === 0) return baseAmount;
    // Conservative progression: 1x, 1.5x, 2x, 3x max
    const progression = [1, 1.5, 2, 3];
    const multiplier = progression[Math.min(consecutiveLosses, 3)];
    return baseAmount * multiplier;
  };

  // Priority 3: Market Condition Adaptation
  const adjustForMarketConditions = (baseProbability: number, gameState: GameStateData) => {
    let adjusted = baseProbability;
    
    // High tick count = more dangerous
    if (gameState.tickCount > 800) adjusted += 0.05;
    
    // High price volatility = more unpredictable (if available)
    // Note: gameState.priceVolatility might not exist, using price as proxy
    const recentVolatility = gameState.price > 3.0 ? 0.15 : 0.05;
    if (recentVolatility > 0.1) adjusted += 0.03;
    
    return Math.min(0.95, adjusted);
  };

  // Priority 3: Confidence-Based Position Sizing
  const getConfidenceAdjustedSize = (baseSize: number, confidence: number) => {
    // Scale bet size with confidence: 50% confidence = 50% size
    const confidenceMultiplier = Math.max(0.1, confidence);
    return baseSize * confidenceMultiplier;
  };

  // Priority 4: Gap Risk Management
  const shouldAvoidGapRisk = (currentTick: number, timing: TimingData) => {
    // Avoid betting during high variance periods
    const expectedGap = timing.variance > 500; // High variance = gap risk
    return expectedGap; // Simplified - avoid high variance periods
  };

  // Get consecutive losses count from current streak
  const getConsecutiveLosses = () => {
    return bot.currentStreak.type === 'LOSS' ? bot.currentStreak.count : 0;
  };

  // ===== ADVANCED PREDICTION SYSTEMS =====
  
  // Priority 1: Volatility Spike Early Warning System
  const updateVolatilityAnalysis = (currentPrice: number, prices: number[]) => {
    const NORMAL_VOLATILITY = 0.147;
    const DANGER_VOLATILITY = 0.262;
    
    // Calculate current volatility
    const recentPrices = prices.slice(-10); // Last 10 prices
    if (recentPrices.length < 5) return;
    
    const volatility = calculateVolatility(recentPrices);
    
    setAdvancedPredictions(prev => {
      const newVolatilityHistory = [...prev.volatilityHistory, volatility];
      // Keep rolling window of last 10 measurements
      if (newVolatilityHistory.length > 10) {
        newVolatilityHistory.shift();
      }
      
      // Detect volatility spike
      const avgVol = newVolatilityHistory.reduce((a, b) => a + b, 0) / newVolatilityHistory.length;
      const spikeRatio = volatility / NORMAL_VOLATILITY;
      const trendRatio = volatility / avgVol;
      
      let volatilitySignal: VolatilitySignal;
      
      if (spikeRatio > 1.5 && trendRatio > 1.3) {
        volatilitySignal = {
          signal: 'IMMINENT_RUG_WARNING',
          confidence: Math.min(0.95, spikeRatio / 1.78), // Based on 78% research
          recommendedAction: 'IMMEDIATE_EXIT',
          timeWindow: '1-5_ticks'
        };
      } else if (spikeRatio > 1.2) {
        volatilitySignal = {
          signal: 'DANGER_ZONE',
          confidence: spikeRatio / 1.5,
          recommendedAction: 'CAUTION',
          timeWindow: '5-15_ticks'
        };
      } else {
        volatilitySignal = { signal: 'NORMAL', confidence: 0.5 };
      }
      
      return {
        ...prev,
        volatilityHistory: newVolatilityHistory,
        currentVolatilitySignal: volatilitySignal
      };
    });
  };
  
  const calculateVolatility = (prices: number[]): number => {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  };
  
  // Priority 2: Meta-Algorithm Treasury Predictor
  const updateTreasuryAnalysis = () => {
    const HIGH_PAYOUT_THRESHOLD = 50; // >50x multiplier
    
    setAdvancedPredictions(prev => {
      const recentGames = prev.gameHistory.slice(-10);
      const highPayoutGames = recentGames.filter(g => g.peakMultiplier > HIGH_PAYOUT_THRESHOLD);
      
      let treasuryPrediction: TreasuryPrediction;
      
      if (highPayoutGames.length > 0) {
        const lastHighPayout = highPayoutGames[highPayoutGames.length - 1];
        const gamesSinceHighPayout = recentGames.length - recentGames.indexOf(lastHighPayout) - 1;
        
        // 84% chance of instarhug after high payout (from research)
        if (gamesSinceHighPayout === 0) {
          treasuryPrediction = {
            riskLevel: 'EXTREMELY_HIGH',
            instarhugProbability: 0.84,
            recommendation: 'AVOID_EARLY_GAME',
            reason: 'Treasury protection mode likely active'
          };
        } else if (gamesSinceHighPayout <= 2) {
          treasuryPrediction = {
            riskLevel: 'HIGH',
            instarhugProbability: 0.6,
            recommendation: 'LATE_ENTRY_ONLY',
            reason: 'Recent high payout detected'
          };
        } else {
          treasuryPrediction = {
            riskLevel: 'MODERATE',
            instarhugProbability: 0.3,
            recommendation: 'NORMAL_OPERATION'
          };
        }
      } else {
        // Analyze treasury state indicators
        const shortGameRatio = recentGames.filter(g => g.duration < 30).length / Math.max(recentGames.length, 1);
        const treasuryStress = shortGameRatio > 0.6 ? 0.3 : 0.1;
        
        treasuryPrediction = {
          riskLevel: treasuryStress > 0.25 ? 'HIGH' : 'NORMAL',
          instarhugProbability: treasuryStress,
          recommendation: treasuryStress > 0.25 ? 'LATE_ENTRY_ONLY' : 'NORMAL_OPERATION'
        };
      }
      
      return {
        ...prev,
        currentTreasuryPrediction: treasuryPrediction
      };
    });
  };
  
  const addGameResult = (gameResult: GameResult) => {
    setAdvancedPredictions(prev => {
      const newGameHistory = [...prev.gameHistory, gameResult];
      // Keep rolling 100-game window (per meta-algorithm research)
      if (newGameHistory.length > 100) {
        newGameHistory.shift();
      }
      
      return {
        ...prev,
        gameHistory: newGameHistory
      };
    });
  };
  
  // ===== ADVANCED PREDICTION SYSTEM UPDATES =====
  
  // Update volatility analysis when game state changes
  useEffect(() => {
    if (gameState.price && typeof gameState.price === 'number' && gameState.active) {
      // Build mock prices array (in real implementation, this would come from actual price history)
      const mockPrices = Array.from({length: 10}, (_, i) => {
        const variance = 0.05; // 5% variance
        return gameState.price * (0.95 + Math.random() * variance * 2);
      });
      updateVolatilityAnalysis(gameState.price, mockPrices);
    }
  }, [gameState.price, gameState.active, gameState.tickCount]);
  
  // Update treasury analysis when game history changes
  useEffect(() => {
    updateTreasuryAnalysis();
  }, [advancedPredictions.gameHistory.length]);
  
  // ===== PREDICTION TRACKING SYSTEM =====
  
  const logPrediction = (gameId: string, currentTick: number, strategy: string) => {
    const predictionId = `${gameId}_tick_${currentTick}`;
    const adjustedConfidence = getAdjustedConfidence(prediction.confidence, timing);
    
    const predictionRecord: PredictionRecord = {
      predictionId,
      gameId,
      predictionTick: currentTick,
      predictedEndWindow: {
        start: currentTick,
        end: currentTick + 40
      },
      gameState: {
        currentMultiplier: gameState.price,
        volatility: timing.variance / 1000, // Convert to reasonable scale
        ticksSinceStart: currentTick,
        timestamp: Date.now()
      },
      confidence: adjustedConfidence,
      triggerReason: `${strategy}_strategy`,
      strategy,
      zone: prediction.zone.name
    };
    
    setTrackingData(prev => ({
      ...prev,
      predictions: {
        ...prev.predictions,
        active: {
          ...prev.predictions.active,
          [gameId]: predictionRecord
        }
      },
      metrics: {
        ...prev.metrics,
        totalPredictions: prev.metrics.totalPredictions + 1,
        lastUpdated: Date.now()
      }
    }));
    
    return predictionId;
  };
  
  const recordGameEnd = (gameId: string, endTick: number) => {
    const activePrediction = trackingData.predictions.active[gameId];
    if (!activePrediction) return;
    
    const windowEnd = activePrediction.predictedEndWindow.end;
    const withinWindow = endTick <= windowEnd;
    const ticksEarly = windowEnd - endTick;
    
    // Categorize accuracy
    let accuracy: OutcomeRecord['accuracy'];
    if (!withinWindow) {
      if (endTick > windowEnd + 60) {
        accuracy = 'false_positive'; // Game went way longer
      } else {
        accuracy = 'late_miss'; // Just missed the window
      }
    } else {
      if (Math.abs(ticksEarly) <= 5) {
        accuracy = 'on_time';
      } else {
        accuracy = 'early_accurate';
      }
    }
    
    const outcome: OutcomeRecord = {
      predictionId: activePrediction.predictionId,
      gameId,
      actualEndTick: endTick,
      withinWindow,
      ticksEarly,
      accuracy,
      timestamp: Date.now()
    };
    
    // Update tracking data
    setTrackingData(prev => {
      const newOutcomes = [...prev.outcomes, outcome];
      const completedPredictions = [...prev.predictions.completed, activePrediction];
      const activeWithoutCurrent = { ...prev.predictions.active };
      delete activeWithoutCurrent[gameId];
      
      // Calculate new metrics
      const withinWindowCount = newOutcomes.filter(o => o.withinWindow).length;
      const optimalRangeCount = newOutcomes.filter(o => o.withinWindow && o.ticksEarly >= 10 && o.ticksEarly <= 30).length;
      const falsePositiveCount = newOutcomes.filter(o => o.accuracy === 'false_positive').length;
      
      const avgTicksEarly = newOutcomes.length > 0 
        ? newOutcomes.reduce((sum, o) => sum + o.ticksEarly, 0) / newOutcomes.length 
        : 0;
      
      return {
        predictions: {
          active: activeWithoutCurrent,
          completed: completedPredictions
        },
        outcomes: newOutcomes,
        metrics: {
          totalPredictions: prev.metrics.totalPredictions,
          withinWindowCount,
          withinWindowRate: prev.metrics.totalPredictions > 0 ? withinWindowCount / prev.metrics.totalPredictions : 0,
          averageTicksEarly: avgTicksEarly,
          falsePositiveRate: prev.metrics.totalPredictions > 0 ? falsePositiveCount / prev.metrics.totalPredictions : 0,
          optimalRangeCount,
          optimalRangeRate: prev.metrics.totalPredictions > 0 ? optimalRangeCount / prev.metrics.totalPredictions : 0,
          lastUpdated: Date.now()
        }
      };
    });
  };

  // Bot decision making logic with strict safeguards
  useEffect(() => {
    if (!bot.settings.enabled || !gameState.active || tradeCooldown) {
      return;
    }

    const currentGameId = gameState.gameId || `game_${Math.floor(Date.now() / 10000)}`;
    
    // Prevent multiple trades in the same game
    if (lastTradeGameId === currentGameId) {
      return;
    }

    // Only allow one trade per game, and only early in the game
    if (gameState.tickCount > 50 || bot.currentTrade) {
      return;
    }

    // ===== ADVANCED BOT DECISION LOGIC =====
    
    // Advanced prediction systems are updated in separate useEffects to prevent infinite loops
    
    // 1. CHECK ADVANCED PREDICTION WARNINGS
    if (advancedPredictions.currentVolatilitySignal.signal === 'IMMINENT_RUG_WARNING') {
      setLastDecision({
        action: 'HOLD',
        reason: `VOLATILITY SPIKE: ${advancedPredictions.currentVolatilitySignal.confidence.toFixed(2)} confidence`,
        timestamp: Date.now()
      });
      return;
    }
    
    if (advancedPredictions.currentTreasuryPrediction.riskLevel === 'EXTREMELY_HIGH' && gameState.tickCount < 100) {
      setLastDecision({
        action: 'HOLD',
        reason: `TREASURY RISK: ${advancedPredictions.currentTreasuryPrediction.reason}`,
        timestamp: Date.now()
      });
      return;
    }
    
    // 2. Zone-based strategy check (never bet on AVOID/CAUTION for conservative tiers)
    const strategy = getStrategyForZone(prediction.zone.name, bot.bankroll);
    if (!strategy) {
      setLastDecision({
        action: 'HOLD',
        reason: `Zone ${prediction.zone.name}: No strategy`,
        timestamp: Date.now()
      });
      return;
    }

    // 3. Timing reliability compensation
    let adjustedConfidence = getAdjustedConfidence(prediction.confidence, timing);
    
    // 4. Advanced prediction system adjustments
    if (advancedPredictions.currentVolatilitySignal.signal === 'DANGER_ZONE') {
      adjustedConfidence *= 0.7; // Reduce confidence during danger periods
    }
    
    if (advancedPredictions.currentTreasuryPrediction.riskLevel === 'HIGH') {
      adjustedConfidence *= 0.8; // Reduce confidence during treasury stress
    }
    
    // 5. Market condition adaptation
    const adjustedProbability = adjustForMarketConditions(prediction.rugProbability, gameState);
    
    // 6. Gap risk management
    if (shouldAvoidGapRisk(gameState.tickCount, timing)) {
      setLastDecision({
        action: 'HOLD',
        reason: 'Gap risk detected',
        timestamp: Date.now()
      });
      return;
    }

    // 7. Bankroll tier system
    const bankrollTier = getBankrollTier(bot.bankroll);
    
    // 8. Enhanced entry conditions based on tier and advanced predictions
    let tierMinConfidence = {
      'TIER_1': 0.8,  // Very conservative
      'TIER_2': 0.7,  // Conservative
      'TIER_3': 0.6,  // Aggressive
      'TIER_4': 0.5   // Mathematical certainty
    }[bankrollTier] || 0.8;
    
    // Increase confidence requirements during high-risk periods
    if (advancedPredictions.currentTreasuryPrediction.riskLevel === 'HIGH') {
      tierMinConfidence += 0.1;
    }
    
    const shouldEnterTrade = adjustedConfidence >= tierMinConfidence &&
      prediction.expectedValue >= bot.settings.minExpectedValue &&
      adjustedProbability <= 0.85 && // Don't bet if rug probability too high
      gameState.tickCount >= 10 && // Wait at least 10 ticks
      gameState.tickCount <= 100; // Don't bet too late

    if (shouldEnterTrade) {
      // Set cooldown immediately to prevent rapid firing
      setTradeCooldown(true);
      setLastTradeGameId(currentGameId);
      
      // 7. Advanced bet sizing calculation
      const baseBetSize = bot.settings.maxBetSize * 0.1; // Start with 10% of max
      const zoneMultiplier = getZoneBetMultiplier(prediction.zone.name);
      const consecutiveLosses = getConsecutiveLosses();
      
      // Apply zone multiplier
      const zoneBetAmount = baseBetSize * zoneMultiplier;
      
      // Apply confidence scaling
      const confidenceAdjustedAmount = getConfidenceAdjustedSize(zoneBetAmount, adjustedConfidence);
      
      // Apply loss recovery for Tier 3+ only
      const recoveryAmount = bankrollTier === 'TIER_3' || bankrollTier === 'TIER_4' 
        ? calculateRecoveryBet(consecutiveLosses, confidenceAdjustedAmount)
        : confidenceAdjustedAmount;
      
      // Final bet amount (ensure within limits)
      const betAmount = Math.min(
        bot.settings.maxBetSize,
        Math.max(0.001, recoveryAmount) // Minimum 0.001 SOL
      );
      
      // 8. LOG PREDICTION FOR TRACKING SYSTEM
      const predictionId = logPrediction(currentGameId, gameState.tickCount, strategy || 'unknown');

      const newTrade: PaperTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gameId: currentGameId,
        startTick: gameState.tickCount,
        endTick: gameState.tickCount + 40,  // 40-tick window like real side bets
        betAmount,
        payout: betAmount * 5,  // 5:1 payout like real side bets
        probability: prediction.rugProbability,
        expectedValue: prediction.expectedValue,
        actualOutcome: 'PENDING',
        profit: 0,
        confidence: prediction.confidence,
        zone: prediction.zone.name,
        xPayout: 5,
        timestamp: new Date()
      };

      setBot(prev => ({
        ...prev,
        currentTrade: newTrade
      }));

      setLastDecision({
        action: 'BET',
        reason: `${strategy.toUpperCase()} | ${prediction.zone.name} | EV: ${prediction.expectedValue.toFixed(3)} | Conf: ${(adjustedConfidence * 100).toFixed(0)}% | ${bankrollTier}`,
        timestamp: Date.now()
      });

      if (onTradeExecuted) {
        onTradeExecuted(newTrade);
      }

      // Clear cooldown after 2 seconds
      setTimeout(() => setTradeCooldown(false), 2000);
    } else {
      // Log why we didn't trade
      const reasons = [];
      if (adjustedConfidence < tierMinConfidence) reasons.push(`Conf: ${(adjustedConfidence * 100).toFixed(0)}% < ${(tierMinConfidence * 100).toFixed(0)}%`);
      if (prediction.expectedValue < bot.settings.minExpectedValue) reasons.push(`EV: ${prediction.expectedValue.toFixed(3)} < ${bot.settings.minExpectedValue}`);
      if (adjustedProbability > 0.85) reasons.push(`RugProb: ${(adjustedProbability * 100).toFixed(0)}% > 85%`);
      if (gameState.tickCount < 10) reasons.push('Too early');
      if (gameState.tickCount > 100) reasons.push('Too late');
      
      setLastDecision({
        action: 'HOLD',
        reason: `${strategy?.toUpperCase() || 'NO_STRAT'} | ${reasons.join(' | ')}`,
        timestamp: Date.now()
      });
    }
  }, [bot.settings.enabled, gameState.active, gameState.gameId, gameState.tickCount,
      prediction.confidence, prediction.expectedValue, prediction.zone.name,
      bot.currentTrade, tradeCooldown, lastTradeGameId, timing.reliability, timing.variance,
      bot.bankroll, bot.currentStreak, advancedPredictions.currentVolatilitySignal,
      advancedPredictions.currentTreasuryPrediction]);

  // Handle game end - only run once per game end
  useEffect(() => {
    if (!gameState.active && bot.currentTrade) {
      const currentTrade = bot.currentTrade;
      const currentGameId = gameState.gameId || currentTrade.gameId;
      
      // RECORD GAME END FOR PREDICTION TRACKING
      recordGameEnd(currentGameId, gameState.tickCount);
      
      // ADD TO ADVANCED PREDICTION GAME HISTORY
      const gameResult: GameResult = {
        id: currentGameId,
        duration: gameState.tickCount,
        peakMultiplier: gameState.peakPrice || gameState.price,
        endTick: gameState.tickCount,
        timestamp: Date.now()
      };
      addGameResult(gameResult);
      
      // Clear current trade immediately to prevent duplicate processing
      setBot(prev => ({ ...prev, currentTrade: null }));
      
      // Side bet wins if game reaches endTick (40 ticks after startTick)
      const isWin = gameState.tickCount >= currentTrade.endTick;
      const profit = isWin ? currentTrade.payout - currentTrade.betAmount : -currentTrade.betAmount;

      const completedTrade = {
        ...currentTrade,
        actualOutcome: isWin ? 'WIN' as const : 'LOSS' as const,
        profit
      };

      // Update bot stats
      setTimeout(() => {
        setBot(prev => {
          const newHistory = [...prev.tradeHistory, completedTrade];
          const newTotalProfit = prev.totalProfit + profit;
          const stats = calculateTradeStats(newHistory, newTotalProfit, prev.bankroll);
          return {
            ...prev,
            tradeHistory: newHistory,
            totalProfit: newTotalProfit,
            totalTrades: prev.totalTrades + 1,
            winRate: stats.winRate,
            averageProfit: stats.averageProfit,
            maxDrawdown: stats.maxDrawdown,
            currentStreak: stats.currentStreak,
            roi: stats.roi
          };
        });
      }, 100);

      setLastDecision({
        action: 'HOLD',
        reason: `Game ended - ${isWin ? 'WIN' : 'LOSS'} (${profit.toFixed(3)} SOL)`,
        timestamp: Date.now()
      });
      
      // Reset trade cooldown for next game
      setTradeCooldown(false);
      setLastTradeGameId(null);
    }
  }, [gameState.active, bot.currentTrade?.id]);


  const toggleBot = () => {
    setBot(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        enabled: !prev.settings.enabled
      }
    }));
    
    // Reset state when toggling
    setTradeCooldown(false);
    setLastTradeGameId(null);
  };

  return (
    <div className="space-y-6">
      {/* Main Prediction Zone with Bot Integration */}
      <Card className={`border-2 ${getZoneColor()}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center text-white">
              <Zap className="h-6 w-6 mr-2" />
              {prediction.zone.name} ZONE
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-white border-white font-mono text-lg px-3 py-1">
                {(prediction.rugProbability * 100).toFixed(0)}% RUG
              </Badge>
              <Badge variant="outline" className="text-white border-white font-mono text-lg px-3 py-1">
                EV: {prediction.expectedValue.toFixed(3)}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Main Recommendation */}
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-white mb-2">
              {prediction.recommendation}
            </div>
            <div className="text-white/80 text-lg">
              {prediction.zone.description}
            </div>
          </div>

          {/* Optimal Windows */}
          {insights.optimalBetTiming.length > 0 && (
            <div className="bg-white/10 p-4 rounded-lg mb-4">
              <div className="text-sm font-semibold text-white mb-2 flex items-center">
                <Target className="h-4 w-4 mr-1" />
                Optimal Windows
              </div>
              <div className="grid grid-cols-3 gap-2">
                {insights.optimalBetTiming.slice(0, 3).map((window, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-white/80">Tick {window.tick}+</div>
                    <div className="text-sm font-mono text-white">
                      +{window.expectedValue.toFixed(2)} EV
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bot Controls */}
          <div className="bg-dark-bg p-4 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Bot className="h-5 w-5 mr-2 text-crypto-green" />
                <span className="font-semibold text-white">Paper Trading Bot</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge 
                  variant="outline" 
                  className={`${getBotStatusColor()} border-current flex items-center`}
                >
                  {getBotStatusIcon()}
                  <span className="ml-1">
                    {bot.settings.enabled ? (bot.currentTrade ? 'ACTIVE' : 'MONITORING') : 'PAUSED'}
                  </span>
                </Badge>
                <Switch checked={bot.settings.enabled} onCheckedChange={toggleBot} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bot Status & P&L */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-lg font-mono font-bold ${bot.totalProfit >= 0 ? 'text-crypto-green' : 'text-alert-red'}`}>
                  {bot.totalProfit >= 0 ? '+' : ''}{bot.totalProfit.toFixed(3)}
                </div>
                <div className="text-xs text-gray-400">P&L (SOL)</div>
              </div>
              <div>
                <div className="text-lg font-mono font-bold text-white">
                  {bot.totalTrades}
                </div>
                <div className="text-xs text-gray-400">Trades</div>
              </div>
              <div>
                <div className="text-lg font-mono font-bold text-white">
                  {bot.totalTrades > 0 ? (bot.winRate * 100).toFixed(0) : 0}%
                </div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
            </div>

            {/* Current Trade */}
            {bot.currentTrade && (
              <div className="mt-3 bg-accent-blue/20 p-3 rounded border border-accent-blue">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-accent-blue">Active Position</span>
                  <span className="text-xs font-mono text-white">
                    {bot.currentTrade.betAmount.toFixed(3)} SOL | T{bot.currentTrade.startTick}-{bot.currentTrade.endTick}
                  </span>
                </div>
              </div>
            )}

            {/* Enhanced Decision Display */}
            {bot.settings.enabled && (
              <div className="mt-3 space-y-2">
                {/* Current Status */}
                <div className="bg-gray-700/50 p-2 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">
                      {bot.currentTrade ? 'Position Active' : 
                       gameState.active ? 'Monitoring...' : 'Waiting for next game'}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        bot.currentTrade ? 'text-accent-blue border-accent-blue' :
                        'text-crypto-green border-crypto-green'
                      }`}
                    >
                      {bot.currentTrade ? 'ACTIVE' : 'SCANNING'}
                    </Badge>
                  </div>
                </div>
                
                {/* Strategy Information */}
                <div className="bg-gray-800/50 p-2 rounded text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-400">Tier:</span>
                      <span className="ml-1 text-white font-mono">
                        {getBankrollTier(bot.bankroll)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Strategy:</span>
                      <span className="ml-1 text-white font-mono">
                        {getStrategyForZone(prediction.zone.name, bot.bankroll) || 'NONE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Adj. Conf:</span>
                      <span className="ml-1 text-white font-mono">
                        {(getAdjustedConfidence(prediction.confidence, timing) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Streak:</span>
                      <span className={`ml-1 font-mono ${
                        bot.currentStreak.type === 'WIN' ? 'text-crypto-green' : 'text-alert-red'
                      }`}>
                        {bot.currentStreak.count}{bot.currentStreak.type === 'WIN' ? 'W' : 'L'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Last Decision Details */}
                {lastDecision && (
                  <div className="bg-dark-bg/50 p-2 rounded">
                    <div className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold ${
                          lastDecision.action === 'BET' ? 'text-crypto-green' :
                          lastDecision.action === 'HOLD' ? 'text-yellow-500' :
                          'text-alert-red'
                        }`}>
                          {lastDecision.action}
                        </span>
                        <span className="text-gray-400 font-mono">
                          {new Date(lastDecision.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-300 font-mono text-xs break-all">
                        {lastDecision.reason}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bot Settings */}
          {showSettings && (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 mt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Min Confidence: {(bot.settings.minConfidence * 100).toFixed(0)}%
                  </label>
                  <Slider
                    value={[bot.settings.minConfidence]}
                    onValueChange={([value]) => 
                      setBot(prev => ({
                        ...prev,
                        settings: { ...prev.settings, minConfidence: value }
                      }))
                    }
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Max Bet Size: {bot.settings.maxBetSize.toFixed(3)} SOL
                  </label>
                  <Slider
                    value={[bot.settings.maxBetSize]}
                    onValueChange={([value]) => 
                      setBot(prev => ({
                        ...prev,
                        settings: { ...prev.settings, maxBetSize: value }
                      }))
                    }
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Prediction Warnings */}
      {(advancedPredictions.currentVolatilitySignal.signal !== 'NORMAL' || 
        advancedPredictions.currentTreasuryPrediction.riskLevel !== 'NORMAL') && (
        <Card className="bg-alert-red/20 border-alert-red border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-alert-red flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Advanced Risk Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Volatility Warning */}
            {advancedPredictions.currentVolatilitySignal.signal !== 'NORMAL' && (
              <div className="bg-alert-red/30 p-2 rounded mb-2">
                <div className="text-sm font-semibold text-white">
                  {advancedPredictions.currentVolatilitySignal.signal.replace('_', ' ')}
                </div>
                <div className="text-xs text-white/80">
                  Confidence: {(advancedPredictions.currentVolatilitySignal.confidence * 100).toFixed(0)}%
                  {advancedPredictions.currentVolatilitySignal.timeWindow && 
                    ` | Window: ${advancedPredictions.currentVolatilitySignal.timeWindow}`
                  }
                </div>
                {advancedPredictions.currentVolatilitySignal.recommendedAction && (
                  <div className="text-xs font-bold text-yellow-300">
                    → {advancedPredictions.currentVolatilitySignal.recommendedAction}
                  </div>
                )}
              </div>
            )}
            
            {/* Treasury Warning */}
            {advancedPredictions.currentTreasuryPrediction.riskLevel !== 'NORMAL' && (
              <div className="bg-yellow-600/30 p-2 rounded">
                <div className="text-sm font-semibold text-white">
                  Treasury Risk: {advancedPredictions.currentTreasuryPrediction.riskLevel}
                </div>
                <div className="text-xs text-white/80">
                  Instarhug Probability: {(advancedPredictions.currentTreasuryPrediction.instarhugProbability * 100).toFixed(0)}%
                </div>
                <div className="text-xs font-bold text-yellow-300">
                  → {advancedPredictions.currentTreasuryPrediction.recommendation.replace('_', ' ')}
                </div>
                {advancedPredictions.currentTreasuryPrediction.reason && (
                  <div className="text-xs text-white/60 mt-1">
                    {advancedPredictions.currentTreasuryPrediction.reason}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Timing and Confidence Indicators */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card-bg border-gray-600">
          <CardContent className="p-4 text-center">
            <div className="text-lg font-mono font-bold text-crypto-green mb-1">
              {timing.currentRate.toFixed(1)}ms
            </div>
            <div className="text-xs text-gray-400">Current Rate</div>
            <div className="text-xs text-gray-300 mt-1">
              Reliability: {(timing.reliability * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg border-gray-600">
          <CardContent className="p-4 text-center">
            <div className="text-lg font-mono font-bold text-accent-blue mb-1">
              {(prediction.confidence * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Confidence</div>
            <div className="text-xs text-gray-300 mt-1">
              Model: {(insights.modelConfidence * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg border-gray-600">
          <CardContent className="p-4 text-center">
            <div className="text-lg font-mono font-bold text-white mb-1">
              {insights.totalGamesAnalyzed}
            </div>
            <div className="text-xs text-gray-400">Games Analyzed</div>
            <div className="text-xs text-gray-300 mt-1">
              Avg: {Math.round(insights.avgGameLength)} ticks
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prediction Tracking Metrics */}
      {trackingData.metrics.totalPredictions > 0 && (
        <Card className="bg-card-bg border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-accent-blue flex items-center">
              <Brain className="h-4 w-4 mr-1" />
              40-Tick Prediction Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center mb-3">
              <div>
                <div className={`text-lg font-mono font-bold ${
                  trackingData.metrics.withinWindowRate >= 0.6 ? 'text-crypto-green' :
                  trackingData.metrics.withinWindowRate >= 0.4 ? 'text-yellow-500' :
                  'text-alert-red'
                }`}>
                  {(trackingData.metrics.withinWindowRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">Within Window</div>
              </div>
              <div>
                <div className="text-lg font-mono font-bold text-white">
                  {trackingData.metrics.averageTicksEarly.toFixed(1)}
                </div>
                <div className="text-xs text-gray-400">Avg Ticks Early</div>
              </div>
              <div>
                <div className={`text-sm font-mono font-bold ${
                  trackingData.metrics.optimalRangeRate >= 0.3 ? 'text-crypto-green' : 'text-gray-400'
                }`}>
                  {(trackingData.metrics.optimalRangeRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">Optimal Range</div>
              </div>
              <div>
                <div className={`text-sm font-mono font-bold ${
                  trackingData.metrics.falsePositiveRate <= 0.2 ? 'text-crypto-green' : 'text-alert-red'
                }`}>
                  {(trackingData.metrics.falsePositiveRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">False Positive</div>
              </div>
            </div>
            
            {/* Active Predictions */}
            {Object.keys(trackingData.predictions.active).length > 0 && (
              <div className="bg-accent-blue/10 p-2 rounded border border-accent-blue/30">
                <div className="text-xs text-accent-blue font-semibold mb-1">
                  Active Predictions: {Object.keys(trackingData.predictions.active).length}
                </div>
                {Object.values(trackingData.predictions.active).slice(0, 2).map(pred => (
                  <div key={pred.predictionId} className="text-xs text-gray-300 font-mono">
                    T{pred.predictionTick}-{pred.predictedEndWindow.end} | {pred.zone} | {pred.strategy}
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-xs text-gray-500 mt-2">
              Total Predictions: {trackingData.metrics.totalPredictions} | 
              Completed: {trackingData.outcomes.length}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Trades */}
      {bot.tradeHistory.length > 0 && (
        <Card className="bg-card-bg border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-crypto-green">Recent Paper Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {bot.tradeHistory.slice(-5).reverse().map((trade) => (
                <div key={trade.id} className="flex items-center justify-between bg-dark-bg p-2 rounded text-xs">
                  <div className="flex items-center space-x-2">
                    {trade.actualOutcome === 'WIN' ? (
                      <CheckCircle className="h-3 w-3 text-crypto-green" />
                    ) : (
                      <XCircle className="h-3 w-3 text-alert-red" />
                    )}
                    <span className="font-mono text-gray-400">T{trade.startTick}-{trade.endTick}</span>
                    <span className="text-gray-300">{trade.zone}</span>
                  </div>
                  <div className={`font-mono font-bold ${
                    trade.profit >= 0 ? 'text-crypto-green' : 'text-alert-red'
                  }`}>
                    {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}