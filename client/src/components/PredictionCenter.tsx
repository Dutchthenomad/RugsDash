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
  HistoricalInsights
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

  // Bot decision making logic
  useEffect(() => {
    if (!bot.settings.enabled || !gameState.active) {
      if (!bot.currentTrade) {
        setLastDecision({
          action: 'HOLD',
          reason: 'Bot disabled or game inactive',
          timestamp: Date.now()
        });
      }
      return;
    }

    const shouldEnterTrade = !bot.currentTrade && 
      prediction.confidence >= bot.settings.minConfidence &&
      prediction.expectedValue >= bot.settings.minExpectedValue &&
      prediction.zone.name !== 'AVOID';

    const shouldExitTrade = bot.currentTrade && (
      prediction.rugProbability >= bot.settings.autoExitThreshold ||
      prediction.zone.name === 'AVOID'
    );

    if (shouldEnterTrade) {
      const betAmount = Math.min(
        bot.settings.maxBetSize,
        calculateOptimalBetSize(prediction.expectedValue, prediction.confidence)
      );

      const newTrade: PaperTrade = {
        id: `trade_${Date.now()}`,
        gameId: gameState.gameId || `game_${Date.now()}`,
        betTick: gameState.tickCount,
        exitTick: 0,
        betAmount,
        probability: prediction.rugProbability,
        expectedValue: prediction.expectedValue,
        actualOutcome: 'PENDING',
        profit: 0,
        confidence: prediction.confidence,
        zone: prediction.zone.name,
        timestamp: new Date()
      };

      setBot(prev => ({
        ...prev,
        currentTrade: newTrade
      }));

      setLastDecision({
        action: 'BET',
        reason: `EV: ${prediction.expectedValue.toFixed(3)}, Conf: ${(prediction.confidence * 100).toFixed(0)}%`,
        timestamp: Date.now()
      });

      if (onTradeExecuted) {
        onTradeExecuted(newTrade);
      }
    } else if (shouldExitTrade && bot.currentTrade) {
      const exitedTrade = {
        ...bot.currentTrade,
        exitTick: gameState.tickCount,
        actualOutcome: 'LOSS' as const,
        profit: -bot.currentTrade.betAmount
      };

      setBot(prev => {
        const newHistory = [...prev.tradeHistory, exitedTrade];
        const newTotalProfit = prev.totalProfit - exitedTrade.betAmount;
        const stats = calculateTradeStats(newHistory, newTotalProfit, prev.bankroll);
        return {
          ...prev,
          currentTrade: null,
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

      setLastDecision({
        action: 'EXIT',
        reason: `Risk too high: ${(prediction.rugProbability * 100).toFixed(0)}%`,
        timestamp: Date.now()
      });
    } else {
      setLastDecision({
        action: 'HOLD',
        reason: bot.currentTrade ? 'Monitoring position' : 'Waiting for signal',
        timestamp: Date.now()
      });
    }
  }, [prediction.confidence, prediction.expectedValue, prediction.rugProbability, prediction.zone.name, 
      gameState.active, gameState.tickCount, gameState.gameId, 
      bot.settings.enabled, bot.settings.minConfidence, bot.settings.minExpectedValue, bot.settings.autoExitThreshold, bot.settings.maxBetSize,
      bot.currentTrade?.id]);

  // Handle game end
  useEffect(() => {
    if (!gameState.active && bot.currentTrade) {
      const isWin = gameState.tickCount > bot.currentTrade.betTick + 20;
      const profit = isWin ? bot.currentTrade.betAmount * 4 : -bot.currentTrade.betAmount;

      const completedTrade = {
        ...bot.currentTrade,
        exitTick: gameState.tickCount,
        actualOutcome: isWin ? 'WIN' as const : 'LOSS' as const,
        profit
      };

      setBot(prev => {
        const newHistory = [...prev.tradeHistory, completedTrade];
        const newTotalProfit = prev.totalProfit + profit;
        const stats = calculateTradeStats(newHistory, newTotalProfit, prev.bankroll);
        return {
          ...prev,
          currentTrade: null,
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
    }
  }, [gameState.active, gameState.tickCount, bot.currentTrade?.id]);

  const calculateOptimalBetSize = (expectedValue: number, confidence: number): number => {
    const kelly = expectedValue * confidence * 0.2; // Conservative Kelly sizing
    return Math.min(kelly, bot.settings.maxBetSize);
  };

  const toggleBot = () => {
    setBot(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        enabled: !prev.settings.enabled
      }
    }));
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
                    {bot.currentTrade.betAmount.toFixed(3)} SOL @ Tick {bot.currentTrade.betTick}
                  </span>
                </div>
              </div>
            )}

            {/* Last Decision */}
            {lastDecision && (
              <div className="mt-3 bg-gray-700/50 p-2 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">{lastDecision.reason}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      lastDecision.action === 'BET' ? 'text-crypto-green border-crypto-green' :
                      lastDecision.action === 'EXIT' ? 'text-alert-red border-alert-red' :
                      'text-accent-blue border-accent-blue'
                    }`}
                  >
                    {lastDecision.action}
                  </Badge>
                </div>
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
                    <span className="font-mono text-gray-400">T{trade.betTick}</span>
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