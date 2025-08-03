// WebSocket message types for rugs.fun integration

export interface GameStateUpdateMessage {
  tickCount?: number;
  tick?: number;
  price?: number;
  multiplier?: number;
  active?: boolean;
  status?: 'active' | 'inactive' | 'cooldown';
  cooldownTimer?: number;
  cooldown?: number;
  peakPrice?: number;
  peak?: number;
  gameId?: string;
  id?: string;
  timestamp?: number;
}

export interface SideBetUpdateMessage {
  betId: string;
  playerId: string;
  startTick: number;
  endTick: number;
  amount: number;
  status: 'pending' | 'won' | 'lost';
  timestamp: number;
}

export interface GameEndMessage {
  gameId: string;
  finalTick: number;
  finalPrice: number;
  duration: number;
  winners: number;
  losers: number;
  timestamp: number;
}