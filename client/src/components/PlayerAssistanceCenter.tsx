import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Brain,
  Clock,
  DollarSign,
  Bot,
  Play,
  Pause
} from 'lucide-react';
import { 
  PredictionData, 
  GameStateData, 
  TimingData,
  StrategyData,
  PaperTrade,
  PaperTradingBot as PaperTradingBotType,
  HistoricalInsights,
  EnhancedPredictionData,
  VolatilitySignal,
  TreasuryRiskLevel,
  EvidenceBundle
} from '../types/gameState';

interface PlayerAssistanceCenterProps {
  prediction: PredictionData;
  gameState: GameStateData;
  timing: TimingData;
  strategy: StrategyData;
  insights: HistoricalInsights;
  onTradeExecuted?: (trade: PaperTrade) => void;
}

export function PlayerAssistanceCenter({ 
  prediction, 
  gameState, 
  timing, 
  strategy, 
  insights,
  onTradeExecuted 
}: PlayerAssistanceCenterProps) {
  // Enhanced prediction state
  const [enhancedPrediction, setEnhancedPrediction] = useState<EnhancedPredictionData | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [volatilityHistory, setVolatilityHistory] = useState<number[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  
  // Bot state - now supporting multi-bet per game
  const [bot, setBot] = useState<PaperTradingBotType>({
    settings: {
      enabled: false,
      minConfidence: 0.65, // Lower threshold for more opportunities
      maxBetSize: 0.1,
      riskLevel: 'MODERATE',
      autoExitThreshold: 0.3,
      minExpectedValue: 0.1 // Lower threshold for more bets
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

  // Multi-bet tracking for current game
  const [currentGameBets, setCurrentGameBets] = useState<PaperTrade[]>([]);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  // Reset bot state function
  const resetBotState = () => {
    setBot(prev => ({
      ...prev,
      currentTrade: null,
      tradeHistory: [],
      totalProfit: 0,
      totalTrades: 0,
      winRate: 0,
      averageProfit: 0,
      maxDrawdown: 0,
      currentStreak: { type: 'WIN', count: 0 }
    }));
    setCurrentGameBets([]);
    setCurrentGameId(null);
  };

  // Clear game bets when new game starts
  useEffect(() => {
    if (gameState.gameId && gameState.gameId !== currentGameId) {
      setCurrentGameBets([]);
      setCurrentGameId(gameState.gameId);
    }
  }, [gameState.gameId, currentGameId]);

  // Calculate current game totals
  const getCurrentGameTotals = () => {
    const totalCost = currentGameBets.reduce((sum, bet) => sum + bet.betAmount, 0);
    const totalPotentialPayout = currentGameBets.reduce((sum, bet) => sum + bet.payout, 0);
    const activeBets = currentGameBets.filter(bet => bet.actualOutcome === 'PENDING');
    
    return {
      totalCost,
      totalPotentialPayout,
      activeBetsCount: activeBets.length,
      totalBetsCount: currentGameBets.length
    };
  };

  // Current side bet opportunity state
  const [currentOpportunity, setCurrentOpportunity] = useState<{
    available: boolean;
    startTick: number;
    endTick: number;
    rugProbability: number;
    expectedValue: number;
    confidence: number;
    recommendation: 'STRONG_BUY' | 'BUY' | 'AVOID' | 'STRONG_AVOID';
    reason: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    betAmount: number;
  } | null>(null);

  // Constants from research
  const NORMAL_VOLATILITY = 0.147;
  const DANGER_VOLATILITY = 0.262;
  const THEORETICAL_TICK_RATE = 250;
  const EMPIRICAL_MEAN = 271.5;

  // Enhanced Prediction System Functions
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

  const updateVolatilityAnalysis = (currentPrice: number): VolatilitySignal => {
    // Update price history
    setPriceHistory(prev => {
      const newHistory = [...prev, currentPrice];
      if (newHistory.length > 10) {
        newHistory.shift();
      }
      return newHistory;
    });
    
    if (priceHistory.length < 3) {
      return { signal: 'NORMAL', confidence: 0.5 };
    }
    
    const volatility = calculateVolatility(priceHistory);
    
    // Update volatility history
    setVolatilityHistory(prev => {
      const newVolatilityHistory = [...prev, volatility];
      if (newVolatilityHistory.length > 10) {
        newVolatilityHistory.shift();
      }
      return newVolatilityHistory;
    });
    
    const spikeRatio = volatility / NORMAL_VOLATILITY;
    
    // Critical spike detected (based on 78% research finding)
    if (spikeRatio >= 1.78) {
      return {
        signal: 'IMMINENT_RUG_WARNING',
        confidence: Math.min(0.95, (spikeRatio - 1) / 0.78)
      };
    } else if (spikeRatio >= 1.4) {
      return {
        signal: 'ELEVATED_RISK', 
        confidence: Math.min(0.8, (spikeRatio - 1) / 0.4)
      };
    }
    
    return { signal: 'NORMAL', confidence: 0.5 };
  };

  const updateTreasuryAnalysis = (): TreasuryRiskLevel => {
    if (gameHistory.length < 2) return 'NORMAL';
    
    const lastGame = gameHistory[gameHistory.length - 1];
    const recentGames = gameHistory.slice(-5);
    
    // Check for high payout -> instarhug pattern (84% correlation from research)
    if (lastGame?.peakMultiplier > 50) {
      return 'EXTREMELY_HIGH';
    }
    
    // Check for treasury stress patterns
    const recentHighPayouts = recentGames.filter(g => g.peakMultiplier > 25).length;
    const recentInstarhugRatio = recentGames.filter(g => g.duration < 30).length / recentGames.length;
    
    if (recentHighPayouts >= 2) return 'HIGH';
    if (recentInstarhugRatio > 0.6) return 'ELEVATED';
    
    return 'NORMAL';
  };

  const calculateBayesianConfidence = (evidence: {
    baseProbability: number;
    volatilitySignal: VolatilitySignal;
    treasuryRisk: TreasuryRiskLevel;
    timing: TimingData;
  }): number => {
    let confidence = evidence.baseProbability;
    
    // Volatility spike evidence (high weight due to 78% research accuracy)
    if (evidence.volatilitySignal.signal === 'IMMINENT_RUG_WARNING') {
      confidence = Math.min(0.95, confidence + (evidence.volatilitySignal.confidence * 0.3));
    }
    
    // Treasury protection evidence (84% research accuracy)
    if (evidence.treasuryRisk === 'EXTREMELY_HIGH') {
      confidence = Math.min(0.95, confidence + 0.25);
    }
    
    // Timing reliability penalty
    const timingPenalty = (1 - evidence.timing.reliability) * 0.15;
    confidence = Math.max(0.1, confidence - timingPenalty);
    
    return confidence;
  };

  // Enhanced opportunity evaluation - replaces broken bot logic
  const evaluateCurrentOpportunity = () => {
    if (!gameState.active || gameState.tickCount < 1) {
      setCurrentOpportunity(null);
      return;
    }

    const currentTick = gameState.tickCount;
    const startTick = currentTick;
    const endTick = currentTick + 40;

    // Get volatility and treasury signals
    const volatilitySignal = updateVolatilityAnalysis(gameState.price);
    const treasuryRisk = updateTreasuryAnalysis();

    // Calculate enhanced probability using all evidence
    const evidence = {
      baseProbability: prediction.rugProbability,
      volatilitySignal,
      treasuryRisk,
      timing
    };

    const enhancedProbability = calculateBayesianConfidence(evidence);
    
    // Expected value calculation (5:1 payout)
    const expectedValue = (enhancedProbability * 4) - 1; // Net profit calculation
    
    // Determine recommendation based on enhanced analysis
    let recommendation: 'STRONG_BUY' | 'BUY' | 'AVOID' | 'STRONG_AVOID' = 'AVOID';
    let reason = '';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
    
    // Treasury protection override
    if (treasuryRisk === 'EXTREMELY_HIGH') {
      recommendation = 'STRONG_AVOID';
      reason = 'Treasury protection active - high instarhug risk';
      riskLevel = 'EXTREME';
    }
    // Volatility spike warning
    else if (volatilitySignal.signal === 'IMMINENT_RUG_WARNING') {
      recommendation = 'STRONG_BUY';
      reason = `Volatility spike detected (${Math.round(volatilitySignal.confidence * 100)}% confidence)`;
      riskLevel = 'LOW';
    }
    // High confidence mathematical edge
    else if (enhancedProbability > 0.75 && expectedValue > 0.5) {
      recommendation = 'STRONG_BUY';
      reason = `High probability + excellent value (${Math.round(enhancedProbability * 100)}% chance)`;
      riskLevel = 'LOW';
    }
    // Good probability with positive EV
    else if (enhancedProbability > 0.55 && expectedValue > 0.15) {
      recommendation = 'BUY';
      reason = `Positive expected value (${Math.round(enhancedProbability * 100)}% chance)`;
      riskLevel = enhancedProbability > 0.65 ? 'LOW' : 'MEDIUM';
    }
    // Low probability
    else if (enhancedProbability < 0.35) {
      recommendation = 'STRONG_AVOID';
      reason = `Low rug probability (${Math.round(enhancedProbability * 100)}% chance)`;
      riskLevel = 'HIGH';
    }
    // Marginal cases
    else {
      recommendation = 'AVOID';
      reason = `Insufficient edge (${Math.round(enhancedProbability * 100)}% chance)`;
      riskLevel = 'MEDIUM';
    }

    // Kelly criterion bet sizing
    const kellyFraction = (enhancedProbability * 5 - 1) / 4; // For 5:1 odds
    const safeBetAmount = Math.max(0.001, Math.min(0.1, kellyFraction * bot.bankroll * 0.25)); // 25% of Kelly for safety

    setCurrentOpportunity({
      available: true,
      startTick,
      endTick,
      rugProbability: enhancedProbability,
      expectedValue,
      confidence: enhancedProbability,
      recommendation,
      reason,
      riskLevel,
      betAmount: safeBetAmount
    });
  };

  // Enhanced bot decision system - now supporting multiple bets per game
  const evaluateBotDecision = () => {
    if (!bot.settings.enabled || !currentOpportunity || !gameState.active) return;
    
    const { recommendation, expectedValue, confidence, betAmount } = currentOpportunity;
    const { totalCost } = getCurrentGameTotals();
    
    // Progressive betting strategy - limit total game exposure
    const maxGameExposure = bot.settings.maxBetSize * 3; // Allow up to 3x max bet per game
    if (totalCost >= maxGameExposure) return;
    
    // Check if we already have a bet covering this tick range
    const currentTick = gameState.tickCount;
    const overlappingBet = currentGameBets.find(bet => 
      bet.actualOutcome === 'PENDING' && 
      currentTick >= bet.startTick && 
      currentTick <= bet.endTick - 10 // Allow new bet if more than 10 ticks from end
    );
    
    if (overlappingBet) return; // Don't double-bet on same window

    // Bot uses sophisticated analysis for multi-bet decisions
    if (recommendation === 'STRONG_BUY' && confidence >= bot.settings.minConfidence && expectedValue >= bot.settings.minExpectedValue) {
      executePaperTrade('BET', betAmount, 'Strong buy signal from enhanced prediction system');
    } else if (recommendation === 'BUY' && confidence >= bot.settings.minConfidence * 0.9 && expectedValue >= bot.settings.minExpectedValue * 0.8) {
      executePaperTrade('BET', betAmount * 0.7, 'Buy signal from enhanced prediction system');
    }
  };

  const executePaperTrade = (action: 'BET' | 'HOLD', amount: number, reason: string) => {
    if (!currentOpportunity || !gameState.active) return;
    
    // Place trade at CURRENT tick for next 40 ticks (real side bet behavior)
    const actualStartTick = gameState.tickCount;
    const actualEndTick = actualStartTick + 40;

    const trade: PaperTrade = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gameId: gameState.gameId || `game_${gameState.tickCount}`,
      startTick: actualStartTick,  // Current tick when bet is placed
      endTick: actualEndTick,      // Current tick + 40
      betAmount: amount,
      payout: amount * 5,
      xPayout: 5,
      probability: currentOpportunity.rugProbability,
      confidence: currentOpportunity.confidence,
      expectedValue: currentOpportunity.expectedValue,
      actualOutcome: 'PENDING',
      profit: 0,
      zone: prediction.zone.name,
      timestamp: new Date()
    };

    // Add to current game bets
    setCurrentGameBets(prev => [...prev, trade]);
    
    // Keep legacy currentTrade for compatibility (most recent bet)
    setBot(prev => ({
      ...prev,
      currentTrade: trade
    }));

    onTradeExecuted?.(trade);
  };

  // Check if current trades should be resolved - multi-bet logic
  useEffect(() => {
    if (currentGameBets.length > 0) {
      const updatedBets = [...currentGameBets];
      let hasUpdates = false;
      
      currentGameBets.forEach((bet, index) => {
        if (bet.actualOutcome === 'PENDING') {
          // Game still active - check if bet window expired
          if (gameState.active && gameState.tickCount > bet.endTick) {
            updatedBets[index] = {
              ...bet,
              actualOutcome: 'LOSS',
              profit: -bet.betAmount
            };
            hasUpdates = true;
          }
          // Game ended (rugged) - check if bet won
          else if (!gameState.active && gameState.tickCount <= bet.endTick) {
            updatedBets[index] = {
              ...bet,
              actualOutcome: 'WIN',
              profit: bet.payout - bet.betAmount
            };
            hasUpdates = true;
          }
          // Game ended (rugged) but after bet window
          else if (!gameState.active && gameState.tickCount > bet.endTick) {
            updatedBets[index] = {
              ...bet,
              actualOutcome: 'LOSS',
              profit: -bet.betAmount
            };
            hasUpdates = true;
          }
        }
      });
      
      if (hasUpdates) {
        setCurrentGameBets(updatedBets);
        
        // Update bot stats with resolved bets
        const resolvedBets = updatedBets.filter(bet => 
          bet.actualOutcome !== 'PENDING' && 
          !bot.tradeHistory.some(h => h.id === bet.id)
        );
        
        if (resolvedBets.length > 0) {
          setBot(prev => {
            const newTradeHistory = [...prev.tradeHistory, ...resolvedBets];
            const totalProfit = newTradeHistory.reduce((sum, t) => sum + t.profit, 0);
            
            return {
              ...prev,
              currentTrade: updatedBets.find(b => b.actualOutcome === 'PENDING') || null,
              tradeHistory: newTradeHistory,
              totalTrades: newTradeHistory.length,
              totalProfit
            };
          });
        }
      }
    }
  }, [gameState.tickCount, gameState.active, currentGameBets.length]);

  // Update opportunities when game state changes
  useEffect(() => {
    evaluateCurrentOpportunity();
  }, [gameState.tickCount, gameState.price, gameState.active, timing.reliability]);

  // Update bot decisions when opportunities change
  useEffect(() => {
    evaluateBotDecision();
  }, [currentOpportunity, bot.settings.enabled]);

  // Calculate performance stats
  const calculateStats = () => {
    if (bot.tradeHistory.length === 0) {
      return { winRate: 0, profit: 0, accuracy: 0, streak: 0 };
    }

    const wins = bot.tradeHistory.filter(t => t.actualOutcome === 'WIN').length;
    const winRate = wins / bot.tradeHistory.length;
    const totalProfit = bot.tradeHistory.reduce((sum, t) => sum + t.profit, 0);
    
    let currentStreak = 0;
    const lastOutcome = bot.tradeHistory[bot.tradeHistory.length - 1]?.actualOutcome;
    for (let i = bot.tradeHistory.length - 1; i >= 0; i--) {
      if (bot.tradeHistory[i].actualOutcome === lastOutcome) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      winRate: Math.round(winRate * 100),
      profit: totalProfit,
      accuracy: Math.round(winRate * 100),
      streak: currentStreak
    };
  };

  const stats = calculateStats();


  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'STRONG_BUY': return 'bg-crypto-green text-white border-crypto-green';
      case 'BUY': return 'bg-crypto-green/80 text-white border-crypto-green';
      case 'AVOID': return 'bg-yellow-600 text-white border-yellow-600';
      case 'STRONG_AVOID': return 'bg-alert-red text-white border-alert-red';
      default: return 'bg-gray-600 text-white border-gray-600';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-crypto-green';
      case 'MEDIUM': return 'text-yellow-500';
      case 'HIGH': return 'text-orange-500';
      case 'EXTREME': return 'text-alert-red';
      default: return 'text-gray-400';
    }
  };

  // Game status indicator but keep dashboard visible
  const gameStatusMessage = !gameState.active ? 
    "⏳ Waiting for next game - side bet opportunities will appear when game starts" : 
    null;

  return (
    <div className="space-y-6">
      {/* Multi-Bet Game Position Status - PROMINENT when active */}
      {currentGameBets.length > 0 && (
        <Card className="bg-gradient-to-r from-accent-blue/20 to-crypto-green/20 border-accent-blue border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Bot className="h-6 w-6 text-accent-blue" />
                  <span className="text-xl font-bold text-white">ACTIVE GAME POSITIONS</span>
                </div>
                <Badge className="bg-accent-blue text-white px-3 py-1 text-sm font-bold">
                  {getCurrentGameTotals().activeBetsCount} ACTIVE BETS
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-400">
                  -{getCurrentGameTotals().totalCost.toFixed(3)} SOL
                </div>
                <div className="text-sm text-gray-300">💸 Total Game Cost</div>
              </div>
            </div>
            
            {/* Game-level summary */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-dark-bg/50 rounded border border-red-500">
                <div className="text-xl font-bold text-red-400">
                  -{getCurrentGameTotals().totalCost.toFixed(3)} SOL
                </div>
                <div className="text-sm text-gray-300">💸 Total Cost</div>
              </div>
              <div className="text-center p-3 bg-dark-bg/50 rounded border border-crypto-green">
                <div className="text-xl font-bold text-crypto-green">
                  +{getCurrentGameTotals().totalPotentialPayout.toFixed(3)} SOL
                </div>
                <div className="text-sm text-gray-300">🎯 Potential Returns</div>
              </div>
              <div className="text-center p-3 bg-dark-bg/50 rounded border border-yellow-500">
                <div className="text-xl font-bold text-yellow-500">
                  +{(getCurrentGameTotals().totalPotentialPayout - getCurrentGameTotals().totalCost).toFixed(3)} SOL
                </div>
                <div className="text-sm text-gray-300">💰 Net Profit Potential</div>
              </div>
              <div className="text-center p-3 bg-dark-bg/50 rounded border border-accent-blue">
                <div className="text-xl font-bold text-accent-blue">
                  {getCurrentGameTotals().activeBetsCount}/{getCurrentGameTotals().totalBetsCount}
                </div>
                <div className="text-sm text-gray-300">📊 Active/Total Bets</div>
              </div>
            </div>
            
            {/* Individual active bets */}
            {getCurrentGameTotals().activeBetsCount > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-300 mb-2">🎯 Active Positions:</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {currentGameBets.filter(bet => bet.actualOutcome === 'PENDING').map((bet) => (
                    <div key={bet.id} className="flex justify-between items-center p-2 bg-dark-bg/30 rounded border border-gray-600">
                      <div className="flex items-center space-x-4">
                        <span className="text-red-400 font-bold text-sm">{bet.betAmount.toFixed(3)} SOL</span>
                        <span className="text-white text-sm">Ticks {bet.startTick}-{bet.endTick}</span>
                        <span className="text-yellow-500 text-sm font-bold">
                          {gameState.active ? Math.max(0, bet.endTick - gameState.tickCount) : '⚰️'} remaining
                        </span>
                      </div>
                      <div className="text-crypto-green font-bold text-sm">
                        → {bet.payout.toFixed(3)} SOL
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hero Section - Current Side Bet Opportunity */}
      <Card className="bg-card-bg border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center">
              <Target className="h-5 w-5 mr-2 text-accent-blue" />
              {gameState.active ? `Side Bet Opportunity - Tick ${gameState.tickCount}` : 'Game Between Rounds'}
            </CardTitle>
            {currentOpportunity && gameState.active && (
              <Badge className={getRecommendationColor(currentOpportunity.recommendation)}>
                {currentOpportunity.recommendation.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {gameStatusMessage && (
            <div className="text-center p-4 bg-dark-bg rounded-lg border border-gray-700 mb-4">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-lg text-gray-300">{gameStatusMessage}</div>
            </div>
          )}
          {currentOpportunity ? (
            <div className="space-y-4">
              {/* Main Opportunity Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-dark-bg rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-crypto-green">
                    {Math.round(currentOpportunity.rugProbability * 100)}%
                  </div>
                  <div className="text-sm text-gray-400">Rug Probability</div>
                  <div className="text-xs text-gray-500">Next 40 ticks (to #{currentOpportunity.endTick})</div>
                </div>
                
                <div className="text-center p-4 bg-dark-bg rounded-lg border border-gray-700">
                  <div className={`text-2xl font-bold ${currentOpportunity.expectedValue > 0 ? 'text-crypto-green' : 'text-alert-red'}`}>
                    {currentOpportunity.expectedValue > 0 ? '+' : ''}{currentOpportunity.expectedValue.toFixed(2)} SOL
                  </div>
                  <div className="text-sm text-gray-400">Expected Value</div>
                  <div className="text-xs text-gray-500">Per 1 SOL bet</div>
                </div>
                
                <div className="text-center p-4 bg-dark-bg rounded-lg border border-gray-700">
                  <div className={`text-2xl font-bold ${getRiskColor(currentOpportunity.riskLevel)}`}>
                    {currentOpportunity.riskLevel}
                  </div>
                  <div className="text-sm text-gray-400">Risk Level</div>
                  <div className="text-xs text-gray-500">Based on multiple factors</div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="p-4 bg-dark-bg rounded-lg border border-gray-700">
                <div className="flex items-start space-x-3">
                  <Brain className="h-5 w-5 text-accent-blue mt-0.5" />
                  <div>
                    <div className="font-medium text-white">Analysis</div>
                    <div className="text-sm text-gray-300">{currentOpportunity.reason}</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {currentOpportunity.recommendation.includes('BUY') && (
                <div className="text-center">
                  <Button 
                    size="lg" 
                    className={`${currentOpportunity.recommendation === 'STRONG_BUY' ? 'bg-crypto-green hover:bg-crypto-green/90' : 'bg-accent-blue hover:bg-accent-blue/90'} text-white px-8`}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Side Bet {currentOpportunity.betAmount.toFixed(3)} SOL
                  </Button>
                  <div className="text-xs text-gray-400 mt-2">
                    Potential payout: {(currentOpportunity.betAmount * 5).toFixed(3)} SOL
                  </div>
                </div>
              )}
            </div>
          ) : gameState.active ? (
            <div className="text-center text-gray-400">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <div>Evaluating opportunity...</div>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <div>No opportunities available - game not active</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Background Bot & Performance Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Paper Trading Bot Status */}
        <Card className="bg-card-bg border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <Bot className="h-4 w-4 mr-2 text-accent-blue" />
              Paper Trading Bot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto-Trading</span>
                <Switch
                  checked={bot.settings.enabled}
                  onCheckedChange={(enabled) => setBot(prev => ({
                    ...prev,
                    settings: { ...prev.settings, enabled }
                  }))}
                />
              </div>
              
              {bot.settings.enabled && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status:</span>
                    <span className={getCurrentGameTotals().activeBetsCount > 0 ? 'text-accent-blue font-bold' : 'text-crypto-green'}>
                      {getCurrentGameTotals().activeBetsCount > 0 ? `🎯 ${getCurrentGameTotals().activeBetsCount} ACTIVE BETS` : '👁️ MONITORING'}
                    </span>
                  </div>
                  {getCurrentGameTotals().activeBetsCount > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Game Cost:</span>
                        <span className="text-red-400 font-bold">-{getCurrentGameTotals().totalCost.toFixed(3)} SOL</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Potential:</span>
                        <span className="text-crypto-green font-bold">+{getCurrentGameTotals().totalPotentialPayout.toFixed(3)} SOL</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Tracker */}
        <Card className="bg-card-bg border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-crypto-green" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-crypto-green">{stats.winRate}%</div>
                <div className="text-xs text-gray-400">Accuracy</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${bot.totalProfit >= 0 ? 'text-crypto-green' : 'text-alert-red'}`}>
                  {bot.totalProfit > 0 ? '+' : ''}{bot.totalProfit.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">Total P&L (SOL)</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-accent-blue">{bot.tradeHistory.length}</div>
                <div className="text-xs text-gray-400">Total Bets</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-500">{stats.streak}</div>
                <div className="text-xs text-gray-400">Current Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}