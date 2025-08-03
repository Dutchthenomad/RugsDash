import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
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
  Brain
} from 'lucide-react';
import { 
  PaperTradingBot as PaperTradingBotType, 
  PaperTrade, 
  BotSettings, 
  PredictionData, 
  GameStateData 
} from '../types/gameState';

// Helper function outside component to avoid recreation
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
  
  // Calculate drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningTotal = 0;
  
  for (const trade of history) {
    runningTotal += trade.profit;
    if (runningTotal > peak) peak = runningTotal;
    const drawdown = peak - runningTotal;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Calculate current streak
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

interface PaperTradingBotProps {
  prediction: PredictionData;
  gameState: GameStateData;
  onTradeExecuted?: (trade: PaperTrade) => void;
}

export function PaperTradingBot({ prediction, gameState, onTradeExecuted }: PaperTradingBotProps) {
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
      bot.currentTrade]);

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

  return (
    <div className="space-y-4">
      {/* Bot Status Header */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <div className="flex items-center text-crypto-green">
              <Bot className="h-5 w-5 mr-2" />
              Paper Trading Bot
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="outline" 
                className={`${getBotStatusColor()} border-current flex items-center`}
              >
                {getBotStatusIcon()}
                <span className="ml-1">
                  {bot.settings.enabled ? (bot.currentTrade ? 'ACTIVE' : 'MONITORING') : 'PAUSED'}
                </span>
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Bot Enabled</span>
            <Switch 
              checked={bot.settings.enabled} 
              onCheckedChange={toggleBot}
            />
          </div>

          {/* Current Decision */}
          {lastDecision && (
            <div className="bg-dark-bg p-3 rounded-lg border border-gray-700 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white flex items-center">
                  <Brain className="h-4 w-4 mr-2" />
                  Bot Decision
                </span>
                <Badge 
                  variant="outline" 
                  className={
                    lastDecision.action === 'BET' ? 'text-crypto-green border-crypto-green' :
                    lastDecision.action === 'EXIT' ? 'text-alert-red border-alert-red' :
                    'text-accent-blue border-accent-blue'
                  }
                >
                  {lastDecision.action}
                </Badge>
              </div>
              <div className="text-xs text-gray-400">{lastDecision.reason}</div>
            </div>
          )}

          {/* Current Trade */}
          {bot.currentTrade && (
            <div className="bg-accent-blue/10 p-3 rounded-lg border border-accent-blue mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-accent-blue">Active Position</span>
                <Badge variant="outline" className="text-accent-blue border-accent-blue">
                  Tick {bot.currentTrade.betTick}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Bet Amount:</span>
                  <span className="ml-1 font-mono text-white">{bot.currentTrade.betAmount.toFixed(3)} SOL</span>
                </div>
                <div>
                  <span className="text-gray-400">Zone:</span>
                  <span className="ml-1 font-mono text-crypto-green">{bot.currentTrade.zone}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bot Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className={`text-xl font-mono font-bold mb-1 ${bot.totalProfit >= 0 ? 'text-crypto-green' : 'text-alert-red'}`}>
                {bot.totalProfit >= 0 ? '+' : ''}{bot.totalProfit.toFixed(3)}
              </div>
              <div className="text-xs text-gray-400">Total P&L (SOL)</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-mono font-bold text-white mb-1">
                {bot.totalTrades}
              </div>
              <div className="text-xs text-gray-400">Total Trades</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bot Settings */}
      {showSettings && (
        <Card className="bg-card-bg border-gray-600">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-crypto-green flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Bot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
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
              <label className="text-sm text-gray-400 mb-2 block">
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

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Min Expected Value: {bot.settings.minExpectedValue.toFixed(3)}
              </label>
              <Slider
                value={[bot.settings.minExpectedValue]}
                onValueChange={([value]) => 
                  setBot(prev => ({
                    ...prev,
                    settings: { ...prev.settings, minExpectedValue: value }
                  }))
                }
                min={0.05}
                max={0.5}
                step={0.01}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Trades */}
      {bot.tradeHistory.length > 0 && (
        <Card className="bg-card-bg border-gray-600">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-crypto-green flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Recent Paper Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bot.tradeHistory.slice(-5).reverse().map((trade) => (
                <div key={trade.id} className="bg-dark-bg p-2 rounded border border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      {trade.actualOutcome === 'WIN' ? (
                        <CheckCircle className="h-4 w-4 text-crypto-green" />
                      ) : (
                        <XCircle className="h-4 w-4 text-alert-red" />
                      )}
                      <span className="text-xs font-mono text-gray-400">
                        Tick {trade.betTick}
                      </span>
                    </div>
                    <div className={`text-xs font-mono font-bold ${
                      trade.profit >= 0 ? 'text-crypto-green' : 'text-alert-red'
                    }`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(3)} SOL
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {trade.zone} • EV: {trade.expectedValue.toFixed(3)}
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