import { io, Socket } from 'socket.io-client';
import { GameStateData, ConnectionStatus } from '../types/gameState';
import { GameSimulator } from './gameSimulator';

export class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5; // Reduced attempts for faster fallback
  private reconnectDelay = 2000;
  private simulator: GameSimulator | null = null;
  private useSimulator = false;
  
  private onGameStateUpdate?: (data: GameStateData) => void;
  private onConnectionStatusChange?: (status: ConnectionStatus) => void;

  constructor() {
    this.connect();
  }

  private connect(): void {
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
      this.fallbackToSimulator();
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to rugs.fun backend');
      this.reconnectAttempts = 0;
      this.handleConnectionStatus('CONNECTED');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from backend:', reason);
      this.handleConnectionStatus('DISCONNECTED');
      
      // Attempt to reconnect if not a manual disconnect
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.handleConnectionStatus('ERROR', error.message);
      this.attemptReconnect();
    });

    // Listen for game state updates from rugs.fun
    this.socket.on('gameStateUpdate', (data: any) => {
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
    this.socket.on('sideBetUpdate', (data: any) => {
      console.log('Side bet update:', data);
    });

    this.socket.on('gameEnd', (data: any) => {
      console.log('Game ended:', data);
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached, falling back to simulator');
      this.handleConnectionStatus('ERROR', 'Max reconnection attempts reached');
      this.fallbackToSimulator();
      return;
    }

    this.reconnectAttempts++;
    this.handleConnectionStatus('RECONNECTING');
    
    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private fallbackToSimulator(): void {
    console.log('🎮 Falling back to game simulator');
    this.useSimulator = true;
    
    if (!this.simulator) {
      this.simulator = new GameSimulator();
      this.simulator.onGameState((gameState: GameStateData) => {
        if (this.onGameStateUpdate) {
          this.onGameStateUpdate(gameState);
        }
      });
    }
    
    this.handleConnectionStatus('CONNECTED', 'Using game simulator');
  }

  private handleConnectionStatus(status: ConnectionStatus['status'], message?: string): void {
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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.simulator) {
      this.simulator.stop();
      this.simulator = null;
    }
    this.useSimulator = false;
  }

  public isConnected(): boolean {
    return this.socket?.connected || this.useSimulator || false;
  }

  // Method to manually trigger reconnection
  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.useSimulator = false;
    this.connect();
  }
}
