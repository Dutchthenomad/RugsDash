import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient } from '../lib/websocketClient';
import { AuthenticatedWebSocketClient } from '../lib/authenticatedWebSocket';
import { AdaptivePredictionEngine } from '../lib/predictionEngine';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { PlayerAssistanceCenter } from '../components/PlayerAssistanceCenter';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Settings, LogOut, User, Shield } from 'lucide-react';
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
  // Authentication context
  const { user, logout, accessToken, hasRole } = useAuth();
  
  // Core state - using useRef to prevent recreation
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const authWsClientRef = useRef<AuthenticatedWebSocketClient | null>(null);
  const predictionEngineRef = useRef<AdaptivePredictionEngine | null>(null);
  
  // Initialize once
  if (!wsClientRef.current) {
    wsClientRef.current = new WebSocketClient();
  }
  if (!authWsClientRef.current) {
    authWsClientRef.current = new AuthenticatedWebSocketClient();
  }
  if (!predictionEngineRef.current) {
    predictionEngineRef.current = new AdaptivePredictionEngine();
  }
  
  // Component state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>({
    status: 'DISCONNECTED',
    reconnectAttempts: 0
  });
  
  const [authConnectionStatus, setAuthConnectionStatus] = useState<ConnectionStatusType>({
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

  // Use callback to avoid closure issues
  const handleGameStateUpdate = useCallback((newGameState: GameStateData) => {
    // Update peak price tracking using functional update
    setGameState(prevState => {
      const updatedGameState = {
        ...newGameState,
        peakPrice: Math.max(
          newGameState.peakPrice || newGameState.price, 
          prevState.peakPrice || 1.0
        )
      };
      
      // Record tick in prediction engine
      if (predictionEngineRef.current) {
        predictionEngineRef.current.recordTick(updatedGameState);
        
        // Update predictions
        const currentPrediction = predictionEngineRef.current.getCurrentPrediction();
        setPrediction(currentPrediction);
        
        // Update timing data
        const currentTiming = predictionEngineRef.current.getTimingData();
        setTiming(currentTiming);
        
        // Update strategy based on current prediction
        updateStrategy(currentPrediction);
        
        // Update historical insights
        updateHistoricalInsights();
      }
      
      return updatedGameState;
    });
  }, []);

  const updateStrategy = useCallback((currentPrediction: PredictionData) => {
    if (!predictionEngineRef.current) return;
    
    const kellyBet = predictionEngineRef.current.calculateKellyBetSize(
      currentPrediction.rugProbability, 
      1.0
    );
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
  }, []);

  const updateHistoricalInsights = useCallback(() => {
    if (!predictionEngineRef.current) return;
    
    const insights = predictionEngineRef.current.getHistoricalInsights();
    setHistoricalInsights(insights);
  }, []);

  const handleReconnect = useCallback(() => {
    wsClientRef.current?.reconnect();
  }, []);

  const handleTradeExecuted = useCallback((trade: PaperTrade) => {
    setPaperTrades(prev => [...prev, trade]);
  }, []);

  // Initialize WebSocket connections with proper cleanup
  useEffect(() => {
    const wsClient = wsClientRef.current;
    const authWsClient = authWsClientRef.current;
    if (!wsClient || !authWsClient) return;

    // Set up rugs.fun WebSocket (external)
    wsClient.onConnectionChange(setConnectionStatus);
    wsClient.onGameState(handleGameStateUpdate);
    
    // Set up authenticated WebSocket (internal)
    if (accessToken) {
      authWsClient.setAccessToken(accessToken);
      authWsClient.onConnectionChange(setAuthConnectionStatus);
      authWsClient.onAuthenticated((user) => {
        console.log('Authenticated WebSocket connected for user:', user.username);
      });
      authWsClient.onErrorReceived((error) => {
        console.error('Authenticated WebSocket error:', error);
      });
      authWsClient.onMessageReceived((message) => {
        console.log('Authenticated WebSocket message:', message);
        // Handle internal messages here
      });
      authWsClient.connect();
    }
    
    // Cleanup function
    return () => {
      // Remove event handlers before disconnecting
      wsClient.onConnectionChange(() => {});
      wsClient.onGameState(() => {});
      wsClient.disconnect();
      
      authWsClient.destroy();
    };
  }, [handleGameStateUpdate, accessToken]);

  // Cleanup prediction engine on unmount
  useEffect(() => {
    return () => {
      // Clear any intervals or timers in prediction engine
      if (predictionEngineRef.current) {
        // Add cleanup method if needed in prediction engine
      }
    };
  }, []);

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
            {/* Auth Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                authConnectionStatus.status === 'CONNECTED' ? 'bg-green-500' : 
                authConnectionStatus.status === 'RECONNECTING' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-400">
                {authConnectionStatus.status === 'CONNECTED' ? 'Auth Connected' : 
                 authConnectionStatus.status === 'RECONNECTING' ? 'Auth Reconnecting' : 'Auth Disconnected'}
              </span>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-700/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white">{user?.username}</span>
                {hasRole('admin') && (
                  <div title="Admin">
                    <Shield className="h-3 w-3 text-yellow-500" />
                  </div>
                )}
              </div>
              <Badge 
                variant="outline" 
                className="text-xs text-blue-400 border-blue-400"
              >
                {user?.role}
              </Badge>
            </div>

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

            {/* Logout Button */}
            <Button 
              onClick={logout}
              variant="outline"
              size="sm"
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
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