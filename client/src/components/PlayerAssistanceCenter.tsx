import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { 
  PredictionData, 
  GameStateData, 
  TimingData,
  StrategyData,
  PaperTrade,
  PaperTradingBot as PaperTradingBotType,
  HistoricalInsights,
  VolatilitySignal,
  TreasuryRiskLevel,
  ConnectionStatus
} from '../types/gameState';
import { apiRequest } from '@/lib/queryClient';

interface QLearningRecommendation {
  action: 'BET_SMALL' | 'BET_MEDIUM' | 'BET_LARGE' | 'HOLD';
  confidence: number;
  expectedValue: number;
  qValue: number;
  reasoning: string;
  betAmount?: number;
  isLearning: boolean;
}

interface QLearningStats {
  isTraining: boolean;
  stats: {
    episodeNumber: number;
    explorationRate: number;
    recentWinRate: number;
    totalStates: number;
    totalQValues: number;
  };
  activeBets: number;
  recentPerformance: {
    winRate: number;
    totalProfit: number;
    totalBets: number;
    avgProfit: number;
  };
}

interface PlayerAssistanceCenterProps {
  prediction: PredictionData;
  gameState: GameStateData;
  timing: TimingData;
  strategy: StrategyData;
  insights: HistoricalInsights;
  connectionStatus: ConnectionStatus;
  onTradeExecuted?: (trade: PaperTrade) => void;
}

export function PlayerAssistanceCenter({ 
  prediction, 
  gameState, 
  timing, 
  strategy, 
  insights,
  connectionStatus,
  onTradeExecuted 
}: PlayerAssistanceCenterProps) {
  // Bot state - now supporting multi-bet per game
  const [bot, setBot] = useState<PaperTradingBotType>({
    settings: {
      enabled: false,
      minConfidence: 0.65,
      maxBetSize: 0.1,
      riskLevel: 'MODERATE',
      autoExitThreshold: 0.3,
      minExpectedValue: 0.1
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

  // Q-Learning state
  const [qLearning, setQLearning] = useState<{
    recommendation: QLearningRecommendation | null;
    stats: QLearningStats | null;
    analytics: any;
    isEnabled: boolean;
    lastUpdate: Date | null;
  }>({
    recommendation: null,
    stats: null,
    analytics: null,
    isEnabled: true,
    lastUpdate: null
  });

  // Dev menu state
  const [showDevMenu, setShowDevMenu] = useState(false);

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

  // Get Q-Learning recommendation
  const getQLearningRecommendation = async () => {
    // Only operate with real WebSocket data - no simulated data allowed
    if (!qLearning.isEnabled || !gameState.active || 
        connectionStatus.status !== 'CONNECTED' || 
        !gameState.gameId || !gameState.timestamp) return;

    try {
      const response = await apiRequest('/api/qlearning/recommendation', {
        method: 'POST',
        body: {
          gameState,
          timing,
          bankroll: bot.bankroll
        }
      });
      
      setQLearning(prev => ({
        ...prev,
        recommendation: response,
        lastUpdate: new Date()
      }));
    } catch (error) {
      console.warn('Failed to get Q-learning recommendation:', error);
    }
  };

  // Enhanced opportunity evaluation with Q-Learning fusion
  const evaluateCurrentOpportunity = () => {
    // Only evaluate opportunities with real WebSocket data
    if (!gameState.active || gameState.tickCount < 1 || 
        connectionStatus.status !== 'CONNECTED' || 
        !gameState.gameId || !gameState.timestamp) {
      setCurrentOpportunity(null);
      return;
    }

    const currentTick = gameState.tickCount;
    const startTick = currentTick;
    const endTick = currentTick + 40;

    // Use base prediction probability
    let enhancedProbability = prediction.rugProbability;
    let enhancedExpectedValue = (enhancedProbability * 4) - 1;
    let enhancedBetAmount = 0;
    let enhancedReason = '';

    // Fuse with Q-Learning recommendation if available
    if (qLearning.recommendation && qLearning.isEnabled) {
      const qRec = qLearning.recommendation;
      
      // Weight Q-learning by confidence and learning state
      const qWeight = qRec.isLearning ? qRec.confidence * 0.7 : qRec.confidence * 0.4;
      const predWeight = 1 - qWeight;
      
      // Blend probabilities and expected values
      if (qRec.action !== 'HOLD') {
        enhancedProbability = (enhancedProbability * predWeight) + (qRec.confidence * qWeight);
        enhancedExpectedValue = (enhancedExpectedValue * predWeight) + (qRec.expectedValue * qWeight);
        enhancedBetAmount = qRec.betAmount || 0;
        enhancedReason = `🤖 AI Enhanced: ${qRec.reasoning} (Q: ${qRec.qValue.toFixed(3)})`;
      }
    }
    
    // Determine recommendation
    let recommendation: 'STRONG_BUY' | 'BUY' | 'AVOID' | 'STRONG_AVOID' = 'AVOID';
    let reason = enhancedReason || `Traditional analysis (${Math.round(enhancedProbability * 100)}% chance)`;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
    
    if (enhancedProbability > 0.75 && enhancedExpectedValue > 0.5) {
      recommendation = 'STRONG_BUY';
      riskLevel = 'LOW';
    } else if (enhancedProbability > 0.55 && enhancedExpectedValue > 0.15) {
      recommendation = 'BUY';
      riskLevel = enhancedProbability > 0.65 ? 'LOW' : 'MEDIUM';
    } else if (enhancedProbability < 0.35) {
      recommendation = 'STRONG_AVOID';
      riskLevel = 'HIGH';
    } else {
      recommendation = 'AVOID';
      riskLevel = 'MEDIUM';
    }

    // Use Q-learning bet amount if available, otherwise Kelly criterion
    let safeBetAmount = enhancedBetAmount;
    if (!safeBetAmount) {
      const kellyFraction = (enhancedProbability * 5 - 1) / 4;
      safeBetAmount = Math.max(0.001, Math.min(0.1, kellyFraction * bot.bankroll * 0.25));
    }

    setCurrentOpportunity({
      available: true,
      startTick,
      endTick,
      rugProbability: enhancedProbability,
      expectedValue: enhancedExpectedValue,
      confidence: enhancedProbability,
      recommendation,
      reason,
      riskLevel,
      betAmount: safeBetAmount
    });
  };

  // Enhanced bot decision system
  const evaluateBotDecision = () => {
    if (!bot.settings.enabled || !currentOpportunity || !gameState.active) return;
    
    const { recommendation, expectedValue, confidence, betAmount } = currentOpportunity;
    const { totalCost } = getCurrentGameTotals();
    
    // Progressive betting strategy - limit total game exposure
    const maxGameExposure = bot.settings.maxBetSize * 3;
    if (totalCost >= maxGameExposure) return;
    
    // Check if we already have a bet covering this tick range
    const currentTick = gameState.tickCount;
    const overlappingBet = currentGameBets.find(bet => 
      bet.actualOutcome === 'PENDING' && 
      currentTick >= bet.startTick && 
      currentTick <= bet.endTick - 10
    );
    
    if (overlappingBet) return;

    // Bot uses sophisticated analysis for multi-bet decisions
    if (recommendation === 'STRONG_BUY' && confidence >= bot.settings.minConfidence && expectedValue >= bot.settings.minExpectedValue) {
      executePaperTrade('BET', betAmount, 'Strong buy signal from enhanced prediction system');
    } else if (recommendation === 'BUY' && confidence >= bot.settings.minConfidence * 0.9 && expectedValue >= bot.settings.minExpectedValue * 0.8) {
      executePaperTrade('BET', betAmount * 0.7, 'Buy signal from enhanced prediction system');
    }
  };

  const executePaperTrade = (action: 'BET' | 'HOLD', amount: number, reason: string) => {
    if (!currentOpportunity || !gameState.active) return;
    
    const actualStartTick = gameState.tickCount;
    const actualEndTick = actualStartTick + 40;

    const trade: PaperTrade = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gameId: gameState.gameId || `game_${gameState.tickCount}`,
      startTick: actualStartTick,
      endTick: actualEndTick,
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
    
    // Keep legacy currentTrade for compatibility
    setBot(prev => ({
      ...prev,
      currentTrade: trade
    }));

    onTradeExecuted?.(trade);
  };

  // Check if current trades should be resolved
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

  // Initialize Q-learning game tracking
  useEffect(() => {
    // Only start Q-learning episodes with real WebSocket data
    if (gameState.gameId && gameState.gameId !== currentGameId && 
        connectionStatus.status === 'CONNECTED' && 
        gameState.timestamp) {
      // Start new Q-learning episode
      apiRequest('/api/qlearning/start-game', {
        method: 'POST',
        body: { gameId: gameState.gameId }
      }).catch(console.warn);
      setCurrentGameId(gameState.gameId);
    }
  }, [gameState.gameId, currentGameId, connectionStatus.status]);

  // Record tick updates for Q-learning - only with real WebSocket data
  useEffect(() => {
    // Only operate with real WebSocket data - no simulated data allowed
    if (gameState.active && gameState.tickCount && 
        connectionStatus.status === 'CONNECTED' && 
        gameState.gameId && gameState.timestamp) {
      apiRequest('/api/qlearning/record-tick', {
        method: 'POST',
        body: { tick: gameState.tickCount, timestamp: Date.now() }
      }).catch(console.warn);
    }
  }, [gameState.tickCount, connectionStatus.status]);

  // End Q-learning episode when game ends - only with real data
  useEffect(() => {
    if (!gameState.active && currentGameId && 
        connectionStatus.status === 'CONNECTED') {
      apiRequest('/api/qlearning/end-game', {
        method: 'POST',
        body: { gameId: currentGameId, finalTick: gameState.tickCount || 0 }
      }).catch(console.warn);
      setCurrentGameId(null);
    }
  }, [gameState.active, currentGameId, gameState.tickCount, connectionStatus.status]);

  // Load Q-learning stats and analytics periodically
  useEffect(() => {
    const loadQLearningData = async () => {
      try {
        const [stats, analytics] = await Promise.all([
          apiRequest('/api/qlearning/stats'),
          apiRequest('/api/qlearning/analytics')
        ]);
        setQLearning(prev => ({ ...prev, stats, analytics }));
      } catch (error) {
        console.warn('Failed to load Q-learning data:', error);
      }
    };

    loadQLearningData();
    const interval = setInterval(loadQLearningData, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Update Q-learning recommendation when game state changes
  useEffect(() => {
    if (gameState.active) {
      getQLearningRecommendation();
    }
  }, [gameState.tickCount, gameState.active, qLearning.isEnabled]);

  // Update opportunities when game state changes
  useEffect(() => {
    evaluateCurrentOpportunity();
  }, [gameState.tickCount, gameState.price, gameState.active, timing.reliability, qLearning.recommendation]);

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
      profit: bot.totalProfit,
      accuracy: Math.round(winRate * 100),
      streak: currentStreak
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* RACING GAME HUD - Game Status Bar */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="text-center">
              <div className="text-4xl font-black text-white">
                {gameState.active ? gameState.tickCount : '⏸️'}
              </div>
              <div className="text-sm text-gray-400 font-bold">TICK</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-yellow-500">
                {gameState.price?.toFixed(2) || '1.00'}x
              </div>
              <div className="text-sm text-gray-400 font-bold">PRICE</div>
            </div>
          </div>
          
          {/* Silent Bot Status with Q-Learning Indicator */}
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${
              bot.settings.enabled ? 'bg-crypto-green animate-pulse' : 'bg-gray-500'
            }`}></div>
            <span className="text-lg font-bold text-white">
              {bot.settings.enabled ? '🤖 BOT ACTIVE' : '😴 BOT OFF'}
            </span>
            {qLearning.isEnabled && (
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  qLearning.stats?.isTraining ? 'bg-blue-500' : 'bg-green-500'
                }`}></div>
                <span className="text-sm text-blue-400 font-bold">
                  {qLearning.stats?.isTraining ? 'AI LEARNING' : 'AI READY'}
                </span>
                <button
                  onClick={() => setShowDevMenu(!showDevMenu)}
                  className="text-xs bg-blue-600/20 border border-blue-500 px-2 py-1 rounded text-blue-300 hover:bg-blue-600/40 transition-colors"
                >
                  DEV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GIANT RECOMMENDATION - Traffic Light Style */}
      {gameState.active ? (
        <div className={`rounded-xl p-8 border-4 text-center ${
          currentOpportunity?.recommendation === 'STRONG_BUY' ? 'bg-crypto-green/20 border-crypto-green' :
          currentOpportunity?.recommendation === 'BUY' ? 'bg-crypto-green/10 border-crypto-green/60' :
          currentOpportunity?.recommendation === 'AVOID' ? 'bg-yellow-600/20 border-yellow-600' :
          'bg-red-600/20 border-red-600'
        }`}>
          <div className="text-6xl font-black mb-4">
            {currentOpportunity?.recommendation === 'STRONG_BUY' ? '🚀 BUY NOW!' :
             currentOpportunity?.recommendation === 'BUY' ? '✅ BUY' :
             currentOpportunity?.recommendation === 'AVOID' ? '⚠️ AVOID' :
             '🛑 STRONG AVOID'}
            {qLearning.recommendation && qLearning.isEnabled && (
              <span className="text-2xl ml-4">🤖</span>
            )}
          </div>
          
          {currentOpportunity && (
            <div className="text-2xl font-bold text-white mb-4">
              {Math.round(currentOpportunity.rugProbability * 100)}% chance • {currentOpportunity.betAmount.toFixed(3)} SOL bet
            </div>
          )}
          
          <div className="text-xl text-gray-300 font-medium">
            {currentOpportunity?.reason || 'Analyzing game patterns...'}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 border-2 border-gray-600 rounded-xl p-8 text-center">
          <div className="text-5xl font-black text-gray-400 mb-2">⏳ GAME PAUSED</div>
          <div className="text-xl text-gray-500 font-bold">Next game starting soon...</div>
        </div>
      )}

      {/* MONEY STATUS - Fuel Gauge Style */}
      {currentGameBets.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-500/20 border-4 border-red-500 rounded-xl p-6 text-center">
            <div className="text-4xl font-black text-red-400">
              -{getCurrentGameTotals().totalCost.toFixed(3)} SOL
            </div>
            <div className="text-xl text-gray-300 mt-2 font-bold">💸 SPENT THIS GAME</div>
          </div>
          
          <div className="bg-crypto-green/20 border-4 border-crypto-green rounded-xl p-6 text-center">
            <div className="text-4xl font-black text-crypto-green">
              +{getCurrentGameTotals().totalPotentialPayout.toFixed(3)} SOL
            </div>
            <div className="text-xl text-gray-300 mt-2 font-bold">🎯 POTENTIAL WIN</div>
          </div>
        </div>
      )}
      
      {/* Minimal Bot Controls - Bottom Bar */}
      <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Switch
              checked={bot.settings.enabled}
              onCheckedChange={(enabled) => setBot(prev => ({
                ...prev,
                settings: { ...prev.settings, enabled }
              }))}
            />
            <span className="text-xl font-bold text-white">
              {bot.settings.enabled ? '🤖 BOT HELPING YOU' : '😴 BOT SLEEPING'}
            </span>
            {getCurrentGameTotals().activeBetsCount > 0 && (
              <span className="text-lg font-bold text-accent-blue">
                • {getCurrentGameTotals().activeBetsCount} ACTIVE BETS
              </span>
            )}
          </div>
          
          {bot.tradeHistory.length > 0 && (
            <div className="text-right">
              <div className={`text-2xl font-black ${
                bot.totalProfit >= 0 ? 'text-crypto-green' : 'text-red-400'
              }`}>
                {bot.totalProfit > 0 ? '+' : ''}{bot.totalProfit.toFixed(3)} SOL
              </div>
              <div className="text-sm text-gray-400 font-bold">
                {stats.winRate}% win rate • {bot.tradeHistory.length} total bets
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Q-Learning Dev Menu */}
      {showDevMenu && qLearning.isEnabled && (
        <div className="bg-blue-900/30 border-2 border-blue-500 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-blue-300">🤖 Q-Learning Analytics</h3>
            <button
              onClick={() => setShowDevMenu(false)}
              className="text-blue-400 hover:text-blue-200 font-bold"
            >
              ✕
            </button>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-800/40 rounded-lg p-4">
              <h4 className="text-lg font-bold text-blue-200 mb-3">🎯 Current Performance</h4>
              {qLearning.stats ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Training:</span>
                    <span className={qLearning.stats.isTraining ? 'text-green-400' : 'text-yellow-400'}>
                      {qLearning.stats.isTraining ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Episode:</span>
                    <span className="text-white font-bold">{qLearning.stats.stats.episodeNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Exploration Rate:</span>
                    <span className="text-blue-300">{(qLearning.stats.stats.explorationRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">States Learned:</span>
                    <span className="text-purple-300">{qLearning.stats.stats.totalStates}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Q-Values:</span>
                    <span className="text-cyan-300">{qLearning.stats.stats.totalQValues}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Active Bets:</span>
                    <span className="text-yellow-300">{qLearning.stats.activeBets}</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">Loading stats...</div>
              )}
            </div>

            <div className="bg-green-800/40 rounded-lg p-4">
              <h4 className="text-lg font-bold text-green-200 mb-3">📊 Recent Performance</h4>
              {qLearning.stats?.recentPerformance ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Win Rate:</span>
                    <span className={`font-bold ${
                      qLearning.stats.recentPerformance.winRate > 0.5 ? 'text-green-400' : 
                      qLearning.stats.recentPerformance.winRate > 0.3 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {(qLearning.stats.recentPerformance.winRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Profit:</span>
                    <span className={`font-bold ${
                      qLearning.stats.recentPerformance.totalProfit > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {qLearning.stats.recentPerformance.totalProfit.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Bets:</span>
                    <span className="text-white">{qLearning.stats.recentPerformance.totalBets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Avg Profit/Bet:</span>
                    <span className={`font-bold ${
                      qLearning.stats.recentPerformance.avgProfit > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {qLearning.stats.recentPerformance.avgProfit.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No performance data yet</div>
              )}
            </div>
          </div>

          {/* Learning Progress */}
          {qLearning.analytics && (
            <div className="bg-purple-800/40 rounded-lg p-4">
              <h4 className="text-lg font-bold text-purple-200 mb-3">🧠 Learning Progress</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {qLearning.analytics.learning?.totalEpisodes || 0}
                  </div>
                  <div className="text-purple-300">Total Episodes</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    (qLearning.analytics.learning?.avgEpisodeReward || 0) > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(qLearning.analytics.learning?.avgEpisodeReward || 0).toFixed(3)}
                  </div>
                  <div className="text-purple-300">Avg Episode Reward</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    qLearning.analytics.learning?.improvementTrend === 'IMPROVING' ? 'text-green-400' : 
                    qLearning.analytics.learning?.improvementTrend === 'STABLE' ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {qLearning.analytics.learning?.improvementTrend || 'UNKNOWN'}
                  </div>
                  <div className="text-purple-300">Learning Trend</div>
                </div>
              </div>
              
              {qLearning.analytics.exploration && (
                <div className="mt-4 pt-4 border-t border-purple-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-200">State Space Exploration:</span>
                    <span className={`font-bold ${
                      qLearning.analytics.exploration.explorationHealth === 'GOOD' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {qLearning.analytics.exploration.explorationHealth}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {qLearning.analytics.exploration.totalStates} states, {qLearning.analytics.exploration.avgVisitCount.toFixed(1)} avg visits
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Recommendation Debug */}
          {qLearning.recommendation && (
            <div className="bg-cyan-800/40 rounded-lg p-4">
              <h4 className="text-lg font-bold text-cyan-200 mb-3">🎯 Current AI Recommendation</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">Action:</span>
                    <span className="font-bold text-white">{qLearning.recommendation.action}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">Confidence:</span>
                    <span className="text-cyan-300">{(qLearning.recommendation.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">Q-Value:</span>
                    <span className={`font-bold ${
                      qLearning.recommendation.qValue > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {qLearning.recommendation.qValue.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">Expected Value:</span>
                    <span className={`font-bold ${
                      qLearning.recommendation.expectedValue > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {qLearning.recommendation.expectedValue.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">Bet Amount:</span>
                    <span className="text-yellow-300">{qLearning.recommendation.betAmount?.toFixed(4) || '0'} SOL</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">Learning:</span>
                    <span className={qLearning.recommendation.isLearning ? 'text-green-400' : 'text-gray-400'}>
                      {qLearning.recommendation.isLearning ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-black/20 rounded text-xs text-gray-300">
                <strong>Reasoning:</strong> {qLearning.recommendation.reasoning}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => {
                apiRequest('/api/qlearning/training', {
                  method: 'POST',
                  body: { enabled: !qLearning.stats?.isTraining }
                }).then(() => {
                  // Reload stats after toggle
                  setTimeout(() => {
                    apiRequest('/api/qlearning/stats').then(stats => {
                      setQLearning(prev => ({ ...prev, stats }));
                    }).catch(console.warn);
                  }, 500);
                }).catch(console.warn);
              }}
              className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
                qLearning.stats?.isTraining 
                  ? 'bg-red-600/20 border border-red-500 text-red-300 hover:bg-red-600/40'
                  : 'bg-green-600/20 border border-green-500 text-green-300 hover:bg-green-600/40'
              }`}
            >
              {qLearning.stats?.isTraining ? 'PAUSE TRAINING' : 'START TRAINING'}
            </button>
            
            <button
              onClick={() => {
                // Force reload all Q-learning data
                Promise.all([
                  apiRequest('/api/qlearning/stats'),
                  apiRequest('/api/qlearning/analytics')
                ]).then(([stats, analytics]) => {
                  setQLearning(prev => ({ ...prev, stats, analytics }));
                }).catch(console.warn);
              }}
              className="px-3 py-1 rounded text-sm font-bold bg-blue-600/20 border border-blue-500 text-blue-300 hover:bg-blue-600/40 transition-colors"
            >
              REFRESH DATA
            </button>
          </div>
        </div>
      )}

    </div>
  );
}