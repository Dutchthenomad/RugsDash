import { ConnectionStatus } from '../types/gameState';

/**
 * AuthenticatedWebSocketClient
 * Manages secure WebSocket connections to our internal server with JWT authentication
 */
export class AuthenticatedWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private accessToken: string | null = null;
  
  private onConnectionStatusChange?: (status: ConnectionStatus) => void;
  private onMessage?: (data: any) => void;
  private onAuthSuccess?: (user: any) => void;
  private onError?: (error: string) => void;

  constructor(private wsUrl: string = 'ws://localhost:5000/ws') {
    // Don't connect automatically - wait for authentication
  }

  /**
   * Set access token for authentication
   */
  public setAccessToken(token: string | null): void {
    this.accessToken = token;
    
    // Reconnect with new token if currently connected
    if (this.ws && !this.isDestroyed) {
      this.reconnect();
    }
  }

  /**
   * Connect to WebSocket with authentication
   */
  public connect(): void {
    if (this.isDestroyed) return;
    
    if (!this.accessToken) {
      console.warn('Cannot connect to WebSocket: No access token provided');
      this.handleConnectionStatus('ERROR', 'Authentication token required');
      return;
    }

    try {
      // Create WebSocket URL with token as query parameter
      const url = new URL(this.wsUrl);
      url.searchParams.set('token', this.accessToken);
      
      this.ws = new WebSocket(url.toString());
      this.setupEventListeners();
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleConnectionStatus('ERROR', `Connection failed: ${error}`);
    }
  }

  private setupEventListeners(): void {
    if (!this.ws || this.isDestroyed) return;

    this.ws.onopen = () => {
      console.log('Connected to authenticated WebSocket server');
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
      this.handleConnectionStatus('CONNECTED');
    };

    this.ws.onmessage = (event) => {
      if (this.isDestroyed) return;
      
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'auth_success':
            console.log('WebSocket authentication successful:', data.user);
            if (this.onAuthSuccess) {
              this.onAuthSuccess(data.user);
            }
            break;
            
          case 'error':
            console.error('WebSocket error message:', data.message);
            if (this.onError) {
              this.onError(data.message);
            }
            break;
            
          default:
            // Forward other messages to the general handler
            if (this.onMessage) {
              this.onMessage(data);
            }
        }
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      
      switch (event.code) {
        case 1008: // Unauthorized
          console.error('WebSocket authentication failed: Unauthorized');
          this.handleConnectionStatus('ERROR', 'Authentication failed - Invalid token');
          // Don't attempt to reconnect on auth failure
          break;
          
        case 1011: // Authentication error
          console.error('WebSocket authentication error');
          this.handleConnectionStatus('ERROR', 'Authentication error');
          // Don't attempt to reconnect on auth error
          break;
          
        default:
          this.handleConnectionStatus('DISCONNECTED');
          // Attempt to reconnect for other disconnect reasons
          if (!this.isDestroyed) {
            this.attemptReconnect();
          }
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleConnectionStatus('ERROR', 'Connection error');
      if (!this.isDestroyed) {
        this.attemptReconnect();
      }
    };
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private attemptReconnect(): void {
    if (this.isDestroyed || !this.accessToken) {
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

  /**
   * Send message to WebSocket server
   */
  public send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Send game state update
   */
  public sendGameStateUpdate(gameData: any): boolean {
    return this.send({
      type: 'gameStateUpdate',
      ...gameData,
      timestamp: Date.now()
    });
  }

  /**
   * Send side bet update
   */
  public sendSideBetUpdate(betData: any): boolean {
    return this.send({
      type: 'sideBetUpdate',
      ...betData,
      timestamp: Date.now()
    });
  }

  /**
   * Send game end notification
   */
  public sendGameEnd(gameData: any): boolean {
    return this.send({
      type: 'gameEnd',
      ...gameData,
      timestamp: Date.now()
    });
  }

  /**
   * Register event handlers
   */
  public onConnectionChange(callback: (status: ConnectionStatus) => void): void {
    this.onConnectionStatusChange = callback;
  }

  public onMessageReceived(callback: (data: any) => void): void {
    this.onMessage = callback;
  }

  public onAuthenticated(callback: (user: any) => void): void {
    this.onAuthSuccess = callback;
  }

  public onErrorReceived(callback: (error: string) => void): void {
    this.onError = callback;
  }

  /**
   * Check connection status
   */
  public isConnected(): boolean {
    return !this.isDestroyed && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Manually trigger reconnection
   */
  public reconnect(): void {
    if (this.isDestroyed) return;
    
    this.disconnect();
    this.isDestroyed = false;
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Disconnect without reconnection
   */
  public disconnect(): void {
    this.clearReconnectTimeout();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.handleConnectionStatus('DISCONNECTED');
  }

  /**
   * Complete cleanup and destruction
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.clearReconnectTimeout();
    
    if (this.ws) {
      this.ws.close(1000, 'Client destroyed');
      this.ws = null;
    }
    
    // Clear callbacks
    this.onConnectionStatusChange = undefined;
    this.onMessage = undefined;
    this.onAuthSuccess = undefined;
    this.onError = undefined;
  }
}