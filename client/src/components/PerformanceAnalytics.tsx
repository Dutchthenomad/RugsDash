import { AnalyticsData, MarketData, RecentPrediction } from '../types/gameState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, History } from 'lucide-react';

interface PerformanceAnalyticsProps {
  analytics: AnalyticsData;
  market: MarketData;
  recentPredictions: RecentPrediction[];
}

export function PerformanceAnalytics({ analytics, market, recentPredictions }: PerformanceAnalyticsProps) {
  return (
    <div className="space-y-6">
      {/* Accuracy Tracking */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <Target className="h-5 w-5 mr-2" />
            Prediction Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-4xl font-mono font-bold text-crypto-green mb-2">
              {(analytics.accuracy * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">Overall Accuracy</div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Last 10 Games:</span>
              <span className="font-mono text-crypto-green">{analytics.recent10}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Confidence Score:</span>
              <span className="font-mono text-accent-blue">
                {(analytics.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Brier Score:</span>
              <span className="font-mono text-crypto-green">
                {analytics.brierScore.toFixed(3)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Analysis */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <TrendingUp className="h-5 w-5 mr-2" />
            Market Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Game Length:</span>
              <span className="font-mono text-white">{Math.round(market.avgLength)} ticks</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Early Rug Rate:</span>
              <span className="font-mono text-alert-red">
                {(market.earlyRugRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Late Game Rate:</span>
              <span className="font-mono text-crypto-green">
                {(market.lateGameRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Volatility Index:</span>
              <span className="font-mono text-yellow-500">
                {market.volatility.toFixed(3)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Predictions */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <History className="h-5 w-5 mr-2" />
            Recent Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentPredictions.length === 0 ? (
              <div className="text-center text-gray-400 py-4">
                No prediction results yet
              </div>
            ) : (
              recentPredictions.slice(0, 5).map((prediction, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                  <div>
                    <span className="text-sm font-mono">{prediction.gameId}</span>
                    <div className="text-xs text-gray-400">
                      Tick {prediction.startTick} → {prediction.endTick}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={prediction.result === 'WIN' ? 'default' : 'destructive'}
                      className={prediction.result === 'WIN' ? 'bg-crypto-green text-dark-bg' : 'bg-alert-red text-white'}
                    >
                      {prediction.result === 'WIN' ? '✓ WIN' : '✗ LOSS'}
                    </Badge>
                    <div className={`text-xs mt-1 ${
                      prediction.profit > 0 ? 'text-crypto-green' : 'text-alert-red'
                    }`}>
                      {prediction.profit > 0 ? '+' : ''}{prediction.profit.toFixed(2)} SOL
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
