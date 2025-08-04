import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  TrendingUp, 
  Brain, 
  BarChart3,
  Target,
  DollarSign
} from 'lucide-react';
import { 
  AnalyticsData, 
  MarketData, 
  HistoricalInsights,
  BankrollStrategy,
  RecentPrediction
} from '../types/gameState';

interface AnalyticsSidebarProps {
  analytics: AnalyticsData;
  market: MarketData;
  insights: HistoricalInsights;
  bankrollStrategy: BankrollStrategy;
  recentPredictions: RecentPrediction[];
}

export function AnalyticsSidebar({ 
  analytics, 
  market, 
  insights, 
  bankrollStrategy,
  recentPredictions 
}: AnalyticsSidebarProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence < 0.3) return 'text-alert-red';
    if (confidence < 0.7) return 'text-yellow-500';
    return 'text-crypto-green';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence < 0.3) return 'LEARNING';
    if (confidence < 0.7) return 'DEVELOPING';
    return 'CONFIDENT';
  };

  return (
    <div className="space-y-4">
      {/* Model Intelligence */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center text-crypto-green">
            <Brain className="h-4 w-4 mr-2" />
            Deep Learning Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-3">
            <div className={`text-2xl font-mono font-bold mb-1 ${getConfidenceColor(insights.modelConfidence)}`}>
              {(insights.modelConfidence * 100).toFixed(0)}%
            </div>
            <Badge variant="outline" className={`text-xs ${getConfidenceColor(insights.modelConfidence)} border-current`}>
              {getConfidenceLabel(insights.modelConfidence)}
            </Badge>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Games:</span>
              <span className="font-mono text-crypto-green">
                {insights.totalGamesAnalyzed}
              </span>
            </div>
            <Progress 
              value={(insights.totalGamesAnalyzed / 1000) * 100} 
              className="h-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center text-crypto-green">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-crypto-green mb-1">
                {(analytics.accuracy * 100).toFixed(0)}%
              </div>
              <div className="text-gray-400">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-white mb-1">
                {analytics.recent10}
              </div>
              <div className="text-gray-400">Recent</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-accent-blue mb-1">
                {analytics.brierScore.toFixed(2)}
              </div>
              <div className="text-gray-400">Brier Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-mono font-bold text-crypto-green mb-1">
                {analytics.totalBets}
              </div>
              <div className="text-gray-400">Total Bets</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Patterns */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center text-crypto-green">
            <TrendingUp className="h-4 w-4 mr-2" />
            Market Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Length:</span>
              <span className="font-mono text-white">{Math.round(insights.avgGameLength)} ticks</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Peak Multi:</span>
              <span className="font-mono text-alert-red">{insights.avgPeakMultiplier.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Early Rug:</span>
              <span className="font-mono text-alert-red">{(insights.shortGameRate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Long Game:</span>
              <span className="font-mono text-crypto-green">{(insights.longGameRate * 100).toFixed(0)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bankroll Strategy */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center text-crypto-green">
            <DollarSign className="h-4 w-4 mr-2" />
            Bankroll Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-3">
            <div className="text-lg font-mono font-bold text-crypto-green">
              {bankrollStrategy.recommendedBankroll.toFixed(3)} SOL
            </div>
            <div className="text-xs text-gray-400">Recommended</div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-sm font-mono text-alert-red">
                {bankrollStrategy.maxConsecutiveLosses}
              </div>
              <div className="text-gray-400">Max Losses</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-mono text-crypto-green">
                {(bankrollStrategy.profitProbability * 100).toFixed(0)}%
              </div>
              <div className="text-gray-400">Profit Prob</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Predictions */}
      {recentPredictions.length > 0 && (
        <Card className="bg-card-bg border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center text-crypto-green">
              <Target className="h-4 w-4 mr-2" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentPredictions.slice(-3).map((pred, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-400">T{pred.startTick}</span>
                  <Badge 
                    variant="outline" 
                    className={pred.result === 'WIN' ? 'text-crypto-green border-crypto-green' : 'text-alert-red border-alert-red'}
                  >
                    {pred.result}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}