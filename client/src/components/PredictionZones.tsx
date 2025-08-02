import { PredictionData, StrategyData } from '../types/gameState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';

interface PredictionZonesProps {
  prediction: PredictionData;
  strategy: StrategyData;
}

export function PredictionZones({ prediction, strategy }: PredictionZonesProps) {
  const getZonePosition = () => {
    const probability = prediction.rugProbability;
    
    // Map probability to position on the zone bar (0-100%)
    if (probability < 0.167) return 10;  // AVOID
    if (probability < 0.25) return 25;   // CAUTION
    if (probability < 0.50) return 45;   // OPPORTUNITY
    if (probability < 0.75) return 65;   // STRONG
    if (probability < 0.90) return 85;   // EXCELLENT
    return 95;                           // CERTAINTY
  };

  const getRiskLevelColor = () => {
    switch (strategy.riskLevel) {
      case 'LOW': return 'text-crypto-green';
      case 'MODERATE': return 'text-yellow-500';
      case 'HIGH': return 'text-alert-red';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Zone */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <Target className="h-5 w-5 mr-2" />
            Prediction Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className={`text-3xl font-bold mb-2 ${prediction.zone.color}`}>
              {prediction.zone.name}
            </div>
            <div className="text-sm text-gray-400 mb-4">
              {prediction.zone.description}
            </div>
            <div className="px-4 py-2 bg-accent-blue text-white rounded-lg font-medium">
              {prediction.zone.recommendation}
            </div>
          </div>
          
          {/* Zone Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Avoid</span>
              <span>Caution</span>
              <span>Opportunity</span>
              <span>Excellent</span>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div className="bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-green-300 h-3 rounded-full" style={{ width: '100%' }} />
              </div>
              <div 
                className="absolute top-0 w-3 h-3 bg-white rounded-full border-2 border-dark-bg transform -translate-y-0 -translate-x-1/2"
                style={{ left: `${getZonePosition()}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Strategy */}
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <TrendingUp className="h-5 w-5 mr-2" />
            Statistical Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Recommended Bet:</span>
              <span className="font-mono font-bold text-crypto-green">
                {strategy.recommendedBet.toFixed(3)} SOL
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Risk Level:</span>
              <span className={`font-medium ${getRiskLevelColor()}`}>
                {strategy.riskLevel}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Max Profit:</span>
              <span className="font-mono font-bold text-crypto-green">
                {strategy.maxProfit.toFixed(3)} SOL
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Success Rate:</span>
              <span className="font-mono font-bold text-accent-blue">
                {strategy.successRate.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="w-full p-4 bg-accent-blue rounded-lg">
            <div className="flex items-center justify-center mb-2">
              {prediction.expectedValue > 0.5 ? (
                <TrendingUp className="h-5 w-5 text-crypto-green mr-2" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-alert-red mr-2" />
              )}
              <span className="font-semibold text-white">
                {prediction.expectedValue > 0.5 ? 'FAVORABLE WINDOW' : 'WAIT FOR BETTER ODDS'}
              </span>
            </div>
            <div className="text-center text-sm text-gray-200">
              Statistical confidence based on historical analysis
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
