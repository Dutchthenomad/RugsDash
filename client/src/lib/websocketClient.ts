import { io, Socket } from 'socket.io-client';
import { GameStateData, ConnectionStatus } from '../types/gameState';
import { GameStateUpdateMessage, SideBetUpdateMessage, GameEndMessage } from '@shared/types/websocket';

export class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  
  private onGameStateUpdate?: (data: GameStateData) => void;
  private onConnectionStatusChange?: (status: ConnectionStatus) => void;

  constructor() {
    this.connect();
  }

  private connect(): void {
    // Don't connect if destroyed
    if (this.isDestroyed) return;
    
    try {
      // Connect to rugs.fun backend with required frontend version parameter
      this.socket = io('https://backend.rugs.fun?frontend-version=1.0', {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleConnectionStatus('ERROR', `Connection failed: ${error}`);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket || this.isDestroyed) return;

    this.socket.on('connect', () => {
      console.log('Connected to rugs.fun backend');
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
      this.handleConnectionStatus('CONNECTED');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from backend:', reason);
      this.handleConnectionStatus('DISCONNECTED');
      
      // Attempt to reconnect if not a manual disconnect and not destroyed
      if (reason !== 'io client disconnect' && !this.isDestroyed) {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.handleConnectionStatus('ERROR', error.message);
      if (!this.isDestroyed) {
        this.attemptReconnect();
      }
    });

    // Listen for game state updates from rugs.fun
    this.socket.on('gameStateUpdate', (data: GameStateUpdateMessage) => {
      if (this.isDestroyed) return;
      
      console.log('Received game state update:', data);
      
      // Transform the data to match our interface
      const gameState: GameStateData = {
        tickCount: data.tickCount || data.tick || 0,
        price: data.price || data.multiplier || 1.0,
        active: data.active !== undefined ? data.active : data.status === 'active',
        cooldownTimer: data.cooldownTimer || data.cooldown || 0,
        peakPrice: data.peakPrice || data.peak || data.price || 1.0,
        gameId: data.gameId || data.id,
        timestamp: data.timestamp || Date.now()
      };
      
      if (this.onGameStateUpdate) {
        this.onGameStateUpdate(gameState);
      }
    });

    // Listen for other potential events
    this.socket.on('sideBetUpdate', (data: SideBetUpdateMessage) => {
      if (!this.isDestroyed) {
        console.log('Side bet update:', data);
      }
    });

    this.socket.on('gameEnd', (data: GameEndMessage) => {
      if (!this.isDestroyed) {
        console.log('Game ended:', data);
      }
    });
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private attemptReconnect(): void {
    if (this.isDestroyed) {
      this.clearReconnectTimeout();
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.handleConnectionStatus('ERROR', 'Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.handleConnectionStatus('RECONNECTING');
    
    this.clearReconnectTimeout();
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isDestroyed) {
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private handleConnectionStatus(status: ConnectionStatus['status'], message?: string): void {
    if (this.isDestroyed) return;
    
    const connectionStatus: ConnectionStatus = {
      status,
      reconnectAttempts: this.reconnectAttempts,
      message
    };
    
    if (this.onConnectionStatusChange) {
      this.onConnectionStatusChange(connectionStatus);
    }
  }

  public onGameState(callback: (data: GameStateData) => void): void {
    this.onGameStateUpdate = callback;
  }

  public onConnectionChange(callback: (status: ConnectionStatus) => void): void {
    this.onConnectionStatusChange = callback;
  }

  public disconnect(): void {
    this.isDestroyed = true;
    this.clearReconnectTimeout();
    
    if (this.socket) {
      // Remove all listeners before disconnecting
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear callbacks
    this.onGameStateUpdate = undefined;
    this.onConnectionStatusChange = undefined;
  }

  public isConnected(): boolean {
    return !this.isDestroyed && (this.socket?.connected || false);
  }

  // Method to manually trigger reconnection
  public reconnect(): void {
    if (this.isDestroyed) return;
    
    this.disconnect();
    this.isDestroyed = false;
    this.reconnectAttempts = 0;
    this.connect();
  }
  
  // Destroy method for complete cleanup
  public destroy(): void {
    this.disconnect();
  }
}