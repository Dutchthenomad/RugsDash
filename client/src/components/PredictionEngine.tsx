import { PredictionData, TimingData } from '../types/gameState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain } from 'lucide-react';

interface PredictionEngineProps {
  prediction: PredictionData;
  timing: TimingData;
}

export function PredictionEngine({ prediction, timing }: PredictionEngineProps) {
  const probabilityPercent = prediction.rugProbability * 100;
  
  return (
    <Card className="bg-card-bg border-gray-600">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
          <Brain className="h-5 w-5 mr-2" />
          Adaptive Prediction Engine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Rug Probability */}
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-alert-red mb-2">
              {probabilityPercent.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400 mb-3">
              Rug Probability (50 ticks)
            </div>
            <Progress 
              value={probabilityPercent} 
              className="h-3 bg-gray-700"
            />
          </div>
          
          {/* Expected Value */}
          <div className="text-center">
            <div className={`text-4xl font-mono font-bold mb-2 ${
              prediction.expectedValue > 0 ? 'text-crypto-green' : 'text-alert-red'
            }`}>
              {prediction.expectedValue > 0 ? '+' : ''}{prediction.expectedValue.toFixed(2)}
            </div>
            <div className="text-sm text-gray-400 mb-2">
              Expected Value (SOL)
            </div>
            <div className="text-xs text-gray-500">
              Based on 0.1 SOL bet
            </div>
          </div>
        </div>

        {/* Timing Analysis */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-mono text-white mb-1">
              {Math.round(timing.currentRate)}ms
            </div>
            <div className="text-gray-400">Tick Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono text-crypto-green mb-1">
              {(timing.reliability * 100).toFixed(0)}%
            </div>
            <div className="text-gray-400">Reliability</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-mono text-accent-blue mb-1">
              ±{Math.round(timing.variance)}ms
            </div>
            <div className="text-gray-400">Variance</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
