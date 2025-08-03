import { useState, useEffect } from 'react';
import { WebSocketClient } from '../lib/websocketClient';
import { AdaptivePredictionEngine } from '../lib/predictionEngine';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { PlayerAssistanceCenter } from '../components/PlayerAssistanceCenter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Settings } from 'lucide-react';
import { 
  GameStateData, 
  ConnectionStatus as ConnectionStatusType,
  PredictionData,
  TimingData,
  AnalyticsData,
  MarketData,
  StrategyData,
  RecentPrediction,
  HistoricalInsights as HistoricalInsightsType,
  BankrollStrategy,
  PaperTrade
} from '../types/gameState';

export default function Dashboard() {
  // Core state
  const [wsClient] = useState(() => new WebSocketClient());
  const [predictionEngine] = useState(() => new AdaptivePredictionEngine());
  
  // Component state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>({
    status: 'DISCONNECTED',
    reconnectAttempts: 0
  });
  
  const [gameState, setGameState] = useState<GameStateData>({
    tickCount: 0,
    price: 1.0,
    active: false,
    cooldownTimer: 0,
    peakPrice: 1.0
  });
  
  const [prediction, setPrediction] = useState<PredictionData>({
    rugProbability: 0,
    expectedValue: 0,
    confidence: 0,
    zone: {
      name: 'AVOID',
      description: 'Waiting for data',
      recommendation: 'Please wait',
      color: 'text-gray-400',
      threshold: [0, 0.167]
    },
    recommendation: 'Please wait'
  });
  
  const [timing, setTiming] = useState<TimingData>({
    currentRate: 271.5,
    reliability: 0.94,
    variance: 12,
    mean: 271.5,
    median: 251.0
  });
  
  const [strategy, setStrategy] = useState<StrategyData>({
    recommendedBet: 0,
    riskLevel: 'MODERATE',
    maxProfit: 0,
    successRate: 0
  });
  
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([]);
  const [historicalInsights, setHistoricalInsights] = useState<HistoricalInsightsType>({
    totalGamesAnalyzed: 0,
    avgGameLength: 0,
    avgPeakMultiplier: 0,
    shortGameRate: 0,
    longGameRate: 0,
    modelConfidence: 0,
    optimalBetTiming: []
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize WebSocket connections
  useEffect(() => {
    wsClient.onConnectionChange(setConnectionStatus);
    wsClient.onGameState(handleGameStateUpdate);
    
    return () => {
      wsClient.disconnect();
    };
  }, [wsClient]);

  const handleGameStateUpdate = (newGameState: GameStateData) => {
    // Update peak price tracking
    const updatedGameState = {
      ...newGameState,
      peakPrice: Math.max(newGameState.peakPrice || newGameState.price, gameState.peakPrice || 1.0)
    };
    
    setGameState(updatedGameState);
    
    // Record tick in prediction engine
    predictionEngine.recordTick(updatedGameState);
    
    // Update predictions
    const currentPrediction = predictionEngine.getCurrentPrediction();
    setPrediction(currentPrediction);
    
    // Update timing data
    const currentTiming = predictionEngine.getTimingData();
    setTiming(currentTiming);
    
    // Update strategy based on current prediction
    updateStrategy(currentPrediction);
    
    // Update historical insights
    updateHistoricalInsights();
  };

  const updateStrategy = (currentPrediction: PredictionData) => {
    const kellyBet = predictionEngine.calculateKellyBetSize(currentPrediction.rugProbability, 1.0);
    const recommendedBet = Math.min(kellyBet, 0.5); // Cap at 0.5 SOL
    
    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'MODERATE';
    if (currentPrediction.rugProbability < 0.3) riskLevel = 'HIGH';
    else if (currentPrediction.rugProbability > 0.7) riskLevel = 'LOW';
    
    setStrategy({
      recommendedBet,
      riskLevel,
      maxProfit: recommendedBet * 4, // 5:1 payout = 4x profit
      successRate: currentPrediction.rugProbability * 100
    });
  };

  
  const updateHistoricalInsights = () => {
    const insights = predictionEngine.getHistoricalInsights();
    setHistoricalInsights(insights);
    
    // Insights updated for background processing
  };

  const handleReconnect = () => {
    wsClient.reconnect();
  };

  const handleTradeExecuted = (trade: PaperTrade) => {
    setPaperTrades(prev => [...prev, trade]);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Simplified Header */}
      <div className="bg-card-bg border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Essential Game Data */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className={`text-2xl font-mono font-bold ${gameState.active ? 'text-crypto-green' : 'text-gray-400'}`}>
                {gameState.price.toFixed(2)}x
              </div>
              <div className="text-xs text-gray-400">Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-accent-blue">
                {gameState.tickCount}
              </div>
              <div className="text-xs text-gray-400">Tick</div>
            </div>
            {!gameState.active && (
              <div className="text-center">
                <div className="text-xl font-mono font-bold text-yellow-500">
                  {gameState.cooldownTimer}s
                </div>
                <div className="text-xs text-gray-400">Next Game</div>
              </div>
            )}
            
            <ConnectionStatus 
              status={connectionStatus} 
              onReconnect={handleReconnect}
            />
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white"
            >
              <Settings className="h-4 w-4 mr-1" />
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
            <Badge 
              variant="outline" 
              className={`${gameState.active ? 'text-crypto-green border-crypto-green' : 'text-gray-400 border-gray-400'}`}
            >
              {gameState.active ? 'LIVE' : 'WAITING'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Player-Focused Main Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <PlayerAssistanceCenter 
            prediction={prediction}
            gameState={gameState}
            timing={timing}
            strategy={strategy}
            insights={historicalInsights}
            connectionStatus={connectionStatus}
            onTradeExecuted={handleTradeExecuted}
          />
          
          {/* Advanced View - Only shown when requested */}
          {showAdvanced && (
            <div className="mt-8 p-6 bg-card-bg border border-gray-700 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-accent-blue" />
                Advanced Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-dark-bg rounded border border-gray-700">
                  <div className="text-xl font-bold text-accent-blue">{Math.round(timing.reliability * 100)}%</div>
                  <div className="text-sm text-gray-400">Timing Reliability</div>
                </div>
                <div className="text-center p-4 bg-dark-bg rounded border border-gray-700">
                  <div className="text-xl font-bold text-crypto-green">{timing.currentRate.toFixed(0)}ms</div>
                  <div className="text-sm text-gray-400">Current Tick Rate</div>
                </div>
                <div className="text-center p-4 bg-dark-bg rounded border border-gray-700">
                  <div className="text-xl font-bold text-yellow-500">{historicalInsights.totalGamesAnalyzed}</div>
                  <div className="text-sm text-gray-400">Games Analyzed</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
