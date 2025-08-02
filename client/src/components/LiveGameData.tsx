import { GameStateData } from '../types/gameState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Play, Pause, Clock } from 'lucide-react';

interface LiveGameDataProps {
  gameState: GameStateData;
}

export function LiveGameData({ gameState }: LiveGameDataProps) {
  const formatDuration = (ticks: number) => {
    const seconds = (ticks * 0.25).toFixed(2);
    return `${seconds}s`;
  };

  const getStatusBadge = () => {
    if (gameState.active) {
      return (
        <Badge className="bg-crypto-green text-dark-bg">
          <Play className="h-3 w-3 mr-1" />
          ACTIVE
        </Badge>
      );
    } else if (gameState.cooldownTimer > 0) {
      return (
        <Badge className="bg-yellow-500 text-dark-bg">
          <Pause className="h-3 w-3 mr-1" />
          COOLDOWN
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          WAITING
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card-bg border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center text-crypto-green">
            <Gamepad2 className="h-5 w-5 mr-2" />
            Live Game Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-crypto-green mb-1">
                {gameState.tickCount}
              </div>
              <div className="text-sm text-gray-400">Current Tick</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-white mb-1">
                {gameState.price.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Multiplier</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-alert-red mb-1">
                {(gameState.peakPrice || gameState.price).toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Peak Price</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-accent-blue mb-1">
                {formatDuration(gameState.tickCount)}
              </div>
              <div className="text-sm text-gray-400">Duration</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            {getStatusBadge()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
