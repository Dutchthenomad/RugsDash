import React, { useState, useEffect } from 'react';
import { WebSocketClient } from '../lib/websocketClient';
import { AdaptivePredictionEngine } from '../lib/predictionEngine';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { LiveGameData } from '../components/LiveGameData';
import { PredictionEngine } from '../components/PredictionEngine';
import { PredictionZones } from '../components/PredictionZones';
import { PerformanceAnalytics } from '../components/PerformanceAnalytics';
import { HistoricalInsights } from '../components/HistoricalInsights';
import { SessionStatsModal } from '../components/SessionStatsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
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
  BankrollStrategy
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
  
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    accuracy: 0,
    recent10: '0/0',
    confidence: 0,
    brierScore: 0,
    totalBets: 0,
    winRate: 0,
    totalProfit: 0
  });
  
  const [market, setMarket] = useState<MarketData>({
    avgLength: 284,
    earlyRugRate: 0.234,
    lateGameRate: 0.766,
    volatility: 0.234
  });
  
  const [strategy, setStrategy] = useState<StrategyData>({
    recommendedBet: 0,
    riskLevel: 'MODERATE',
    maxProfit: 0,
    successRate: 0
  });
  
  const [recentPredictions, setRecentPredictions] = useState<RecentPrediction[]>([]);
  const [historicalInsights, setHistoricalInsights] = useState<HistoricalInsightsType>({
    totalGamesAnalyzed: 0,
    avgGameLength: 0,
    avgPeakMultiplier: 0,
    shortGameRate: 0,
    longGameRate: 0,
    modelConfidence: 0,
    optimalBetTiming: []
  });
  const [bankrollStrategy, setBankrollStrategy] = useState<BankrollStrategy>({
    recommendedBankroll: 0.5,
    maxConsecutiveLosses: 8,
    expectedWinStreak: 3,
    profitProbability: 0.85,
    breakEvenPoint: 25
  });
  const [isSessionStatsOpen, setIsSessionStatsOpen] = useState(false);

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
    
    // Update analytics and historical insights
    updateAnalytics();
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

  const updateAnalytics = () => {
    const accuracy = predictionEngine.getAccuracy();
    const brierScore = predictionEngine.getBrierScore();
    
    setAnalytics(prev => ({
      ...prev,
      accuracy,
      brierScore,
      confidence: timing.reliability,
      recent10: `${Math.floor(accuracy * 10)}/10` // Simplified
    }));
  };
  
  const updateHistoricalInsights = () => {
    const insights = predictionEngine.getHistoricalInsights();
    setHistoricalInsights(insights);
    
    // Update bankroll strategy based on insights
    if (insights.totalGamesAnalyzed > 10) {
      const confidence = insights.modelConfidence;
      const avgLength = insights.avgGameLength;
      
      setBankrollStrategy({
        recommendedBankroll: Math.max(0.1, confidence * 0.8),
        maxConsecutiveLosses: Math.max(5, Math.floor(avgLength / 50)),
        expectedWinStreak: Math.max(2, Math.floor(insights.optimalBetTiming.length * 1.5)),
        profitProbability: Math.min(0.95, 0.7 + (confidence * 0.25)),
        breakEvenPoint: Math.max(10, Math.floor(50 - (confidence * 30)))
      });
    }
  };

  const handleReconnect = () => {
    wsClient.reconnect();
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="bg-card-bg border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-crypto-green flex items-center">
              <BarChart3 className="h-8 w-8 mr-2" />
              Rugs.fun Deep Analytics Engine
            </h1>
            <ConnectionStatus 
              status={connectionStatus} 
              onReconnect={handleReconnect}
            />
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setIsSessionStatsOpen(true)}
              variant="outline"
              className="border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Session Stats
            </Button>
            <div className="text-right">
              <div className="text-xs text-gray-400">Frontend Version</div>
              <Badge variant="outline" className="font-mono text-xs">1.0</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Live Game Data - Left Section */}
        <div className="lg:col-span-2 space-y-6">
          <LiveGameData gameState={gameState} />
          <PredictionEngine prediction={prediction} timing={timing} />
        </div>

        {/* Prediction Zones - Center Section */}
        <div>
          <PredictionZones prediction={prediction} strategy={strategy} />
        </div>

        {/* Historical Intelligence - Right Section */}
        <div>
          <HistoricalInsights 
            insights={historicalInsights}
            bankrollStrategy={bankrollStrategy}
          />
        </div>
      </div>
      
      {/* Performance Analytics - Bottom Section */}
      <div className="px-6 pb-6">
        <PerformanceAnalytics 
          analytics={analytics}
          market={market}
          recentPredictions={recentPredictions}
        />
      </div>

      {/* Session Stats Modal */}
      <SessionStatsModal 
        isOpen={isSessionStatsOpen}
        onClose={() => setIsSessionStatsOpen(false)}
        analytics={analytics}
      />
    </div>
  );
}
