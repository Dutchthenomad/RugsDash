import { HistoricalInsights as HistoricalInsightsType, BankrollStrategy } from '../types/gameState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Database, TrendingUp, Brain, DollarSign, Clock, Target } from 'lucide-react';

interface HistoricalInsightsProps {
  insights: HistoricalInsightsType;
  bankrollStrategy: BankrollStrategy;
}

export function HistoricalInsights({ insights, bankrollStrategy }: HistoricalInsightsProps) {
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
    <div className="space-y-6">
      {/* Model Intelligence Status */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <Brain className="h-5 w-5 mr-2" />
            Deep Learning Model Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className={`text-4xl font-mono font-bold mb-2 ${getConfidenceColor(insights.modelConfidence)}`}>
              {(insights.modelConfidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-400 mb-3">Model Confidence</div>
            <Badge variant="outline" className={`${getConfidenceColor(insights.modelConfidence)} border-current`}>
              {getConfidenceLabel(insights.modelConfidence)}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center">
                <Database className="h-4 w-4 mr-1" />
                Games Analyzed:
              </span>
              <span className="font-mono text-crypto-green">
                {insights.totalGamesAnalyzed.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={(insights.totalGamesAnalyzed / 1000) * 100} 
              className="h-2 bg-gray-700"
            />
            <div className="text-xs text-gray-500 text-center">
              Target: 1,000 games for maximum confidence
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Patterns */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <TrendingUp className="h-5 w-5 mr-2" />
            Market Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-white mb-1">
                {Math.round(insights.avgGameLength)}
              </div>
              <div className="text-xs text-gray-400">Avg Game Length (ticks)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-alert-red mb-1">
                {insights.avgPeakMultiplier.toFixed(2)}x
              </div>
              <div className="text-xs text-gray-400">Avg Peak Multiplier</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Early Rug Rate (&lt;200 ticks):</span>
              <span className="font-mono text-alert-red">
                {(insights.shortGameRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Long Game Rate (&gt;400 ticks):</span>
              <span className="font-mono text-crypto-green">
                {(insights.longGameRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimal Betting Windows */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <Target className="h-5 w-5 mr-2" />
            Optimal Betting Windows
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.optimalBetTiming.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Analyzing patterns...
              <div className="text-xs mt-1">Need more data to identify optimal windows</div>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.optimalBetTiming.slice(0, 3).map((window, index) => (
                <div key={index} className="bg-dark-bg p-3 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-crypto-green">
                      Tick {window.tick}+ Window
                    </span>
                    <Badge variant="outline" className="text-crypto-green border-crypto-green">
                      +{window.expectedValue.toFixed(2)} EV
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Win Probability: {(window.probability * 100).toFixed(1)}%</span>
                    <span>Expected Value: {window.expectedValue > 0 ? '+' : ''}{window.expectedValue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bankroll Strategy */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <DollarSign className="h-5 w-5 mr-2" />
            Statistical Bankroll Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-dark-bg p-3 rounded-lg border border-crypto-green">
              <div className="text-center mb-2">
                <div className="text-2xl font-mono font-bold text-crypto-green">
                  {bankrollStrategy.recommendedBankroll.toFixed(3)} SOL
                </div>
                <div className="text-xs text-gray-400">Recommended Bankroll</div>
              </div>
              <div className="text-xs text-center text-gray-300">
                Calculated for 99.9% survival probability
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center">
                <div className="text-lg font-mono text-alert-red mb-1">
                  {bankrollStrategy.maxConsecutiveLosses}
                </div>
                <div className="text-gray-400">Max Consecutive Losses</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-mono text-crypto-green mb-1">
                  {bankrollStrategy.expectedWinStreak}
                </div>
                <div className="text-gray-400">Expected Win Streak</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Profit Probability:</span>
                <span className="font-mono text-crypto-green">
                  {(bankrollStrategy.profitProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Break Even Point:</span>
                <span className="font-mono text-accent-blue">
                  {bankrollStrategy.breakEvenPoint} games
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}