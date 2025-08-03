import { GameStateData } from '../types/gameState';

export class GameSimulator {
  private gameId: string | null = null;
  private isActive = false;
  private tickCount = 0;
  private price = 1.0;
  private gameStartTime = 0;
  private cooldownTimer = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private cooldownIntervalId: NodeJS.Timeout | null = null;
  private callbacks: Array<(gameState: GameStateData) => void> = [];

  // Game configuration
  private readonly TICK_INTERVAL = 250; // 250ms per tick (matches empirical baseline)
  private readonly MIN_GAME_LENGTH = 50; // Minimum 50 ticks
  private readonly MAX_GAME_LENGTH = 800; // Maximum 800 ticks
  private readonly COOLDOWN_DURATION = 15; // 15 seconds between games

  constructor() {
    this.startNewGame();
  }

  onGameState(callback: (gameState: GameStateData) => void): void {
    this.callbacks.push(callback);
  }

  private generateGameId(): string {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 16);
    return `${timestamp}-${random}`;
  }

  private startNewGame(): void {
    if (this.isActive) return;

    this.gameId = this.generateGameId();
    this.isActive = true;
    this.tickCount = 0;
    this.price = 1.0;
    this.gameStartTime = Date.now();
    this.cooldownTimer = 0;

    console.log(`🎮 Starting simulated game: ${this.gameId}`);

    // Start the game loop
    this.intervalId = setInterval(() => {
      this.updateGameState();
    }, this.TICK_INTERVAL);
  }

  private updateGameState(): void {
    if (!this.isActive) return;

    this.tickCount++;
    
    // Realistic price progression (multiplier growth)
    // Price increases slower in early game, faster in late game with occasional volatility
    const baseGrowth = 0.002 + (this.tickCount * 0.000005); // Accelerating growth
    const volatility = (Math.random() - 0.5) * 0.01; // ±0.5% random volatility
    const growthRate = baseGrowth + volatility;
    
    this.price = Math.max(1.0, this.price * (1 + growthRate));

    // Determine if game should end (rug probability based on realistic distribution)
    const shouldRug = this.calculateRugProbability();
    
    if (shouldRug || this.tickCount >= this.MAX_GAME_LENGTH) {
      this.endGame();
      return;
    }

    // Emit current game state
    this.emitGameState();
  }

  private calculateRugProbability(): boolean {
    // Realistic rug probability curve based on empirical data
    const tick = this.tickCount;
    
    // Very low probability in early game
    if (tick < this.MIN_GAME_LENGTH) return false;
    
    // Progressive probability curve matching empirical baseline
    let rugChance = 0;
    if (tick < 100) rugChance = 0.003; // 0.3% per tick
    else if (tick < 200) rugChance = 0.008; // 0.8% per tick  
    else if (tick < 300) rugChance = 0.015; // 1.5% per tick
    else if (tick < 400) rugChance = 0.025; // 2.5% per tick
    else if (tick < 500) rugChance = 0.035; // 3.5% per tick
    else rugChance = 0.05; // 5% per tick for very late game
    
    return Math.random() < rugChance;
  }

  private endGame(): void {
    if (!this.isActive) return;

    console.log(`🏁 Game ${this.gameId} ended at tick ${this.tickCount} with price ${this.price.toFixed(2)}x`);
    
    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Emit final game state
    this.emitGameState();

    // Start cooldown period
    this.startCooldown();
  }

  private startCooldown(): void {
    this.cooldownTimer = this.COOLDOWN_DURATION;
    
    this.cooldownIntervalId = setInterval(() => {
      this.cooldownTimer--;
      this.emitGameState();
      
      if (this.cooldownTimer <= 0) {
        if (this.cooldownIntervalId) {
          clearInterval(this.cooldownIntervalId);
          this.cooldownIntervalId = null;
        }
        // Start next game after cooldown
        setTimeout(() => this.startNewGame(), 1000);
      }
    }, 1000);
  }

  private emitGameState(): void {
    const gameState: GameStateData = {
      gameId: this.gameId || undefined,
      tickCount: this.tickCount,
      price: this.price,
      active: this.isActive,
      cooldownTimer: this.cooldownTimer,
      peakPrice: this.price, // In simulation, current price is peak
      timestamp: Date.now()
    };

    this.callbacks.forEach(callback => {
      try {
        callback(gameState);
      } catch (error) {
        console.error('Error in game state callback:', error);
      }
    });
  }

  // Get current game state
  getCurrentState(): GameStateData {
    return {
      gameId: this.gameId || undefined,
      tickCount: this.tickCount,
      price: this.price,
      active: this.isActive,
      cooldownTimer: this.cooldownTimer,
      peakPrice: this.price,
      timestamp: Date.now()
    };
  }

  // Stop the simulator
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.cooldownIntervalId) {
      clearInterval(this.cooldownIntervalId);
      this.cooldownIntervalId = null;
    }
    this.isActive = false;
  }

  // Start the simulator
  start(): void {
    if (!this.isActive && this.cooldownTimer === 0) {
      this.startNewGame();
    }
  }
}