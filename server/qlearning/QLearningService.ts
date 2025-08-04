import { QLearningAgent, type QLearningDecision } from './QLearningAgent';
import { storage } from '../storage';
import { type SideBet } from '@shared/schema';
import { type GameState, type TimingData } from '../types/qlearning';

export class QLearningService {
  private agent: QLearningAgent;
  private isTraining: boolean = true;
  private currentGameId: string | null = null;
  private activeBets: Map<string, SideBet> = new Map(); // gameId -> bet

  constructor() {
    this.agent = new QLearningAgent();
  }

  // Initialize the service
  public async initialize(): Promise<void> {
    console.log('🤖 Q-Learning Service initialized');
  }

  // Get AI recommendation for current game state
  public async getRecommendation(
    gameState: GameState, 
    timing: TimingData, 
    bankroll: number = 1.0
  ): Promise<QLearningDecision & { isLearning: boolean }> {
    const decision = await this.agent.makeDecision(gameState, timing, bankroll);
    
    return {
      ...decision,
      isLearning: this.isTraining
    };
  }

  // Execute a side bet based on Q-learning decision
  public async executeBet(
    gameId: string,
    decision: QLearningDecision,
    gameState: GameState
  ): Promise<SideBet | null> {
    if (decision.action === 'HOLD' || !decision.betAmount) {
      return null;
    }

    const startTick = gameState.tickCount || 0;
    const endTick = startTick + 40;
    
    // Create side bet record
    const sideBet: SideBet = await storage.saveSideBet({
      gameId,
      playerId: 'qlearning-bot',
      startTick,
      endTick,
      betAmount: decision.betAmount,
      payout: decision.betAmount * 5,
      actualOutcome: 'PENDING',
      rugTick: null,
      confidence: decision.confidence,
      recommendation: decision.action,
      gameState: gameState,
      resolvedAt: null
    });

    // Track active bet
    this.activeBets.set(gameId, sideBet);

    // Record in Q-learning episode if training
    if (this.isTraining && gameId === this.currentGameId) {
      // State-action pairs are recorded during the decision making process
      // and tracked in the training episode for learning updates
    }

    console.log(`🎯 Q-Learning Bot placed ${decision.action}: ${decision.betAmount} SOL (${decision.confidence.toFixed(2)} confidence)`);

    return sideBet;
  }

  // Start new game episode for learning
  public async startGame(gameId: string): Promise<void> {
    this.currentGameId = gameId;
    
    if (this.isTraining) {
      await this.agent.startEpisode(gameId);
      console.log(`🎮 Started Q-learning episode for game ${gameId}`);
    }
  }

  // End game and resolve bets
  public async endGame(gameId: string, finalTick: number): Promise<void> {
    const activeBet = this.activeBets.get(gameId);
    
    if (activeBet) {
      // Determine if bet won or lost
      const won = finalTick >= activeBet.startTick && finalTick <= activeBet.endTick;
      const outcome = won ? 'WIN' : 'LOSS';
      const profit = won ? (activeBet.payout - activeBet.betAmount) : -activeBet.betAmount;
      
      // Update bet in database
      await storage.updateSideBet(activeBet.id, {
        actualOutcome: outcome,
        rugTick: finalTick,
        profit,
        resolvedAt: new Date()
      });

      // Q-learning episode completion
      if (this.isTraining && gameId === this.currentGameId) {
        await this.agent.endEpisode(outcome, profit);
      }

      // Clean up
      this.activeBets.delete(gameId);
      
      console.log(`🏁 Game ${gameId} ended: ${outcome} (Profit: ${profit.toFixed(4)} SOL)`);
    }

    this.currentGameId = null;
  }

  // Record tick data for adaptive timing
  public recordTick(tick: number, timestamp: number): void {
    this.agent.recordTick(tick, timestamp);
  }

  // Get current Q-learning statistics
  public async getStats(): Promise<{
    isTraining: boolean;
    stats: any;
    activeBets: number;
    recentPerformance: any;
  }> {
    const stats = await this.agent.getStats();
    const recentPerformance = await this.getRecentPerformance();
    
    return {
      isTraining: this.isTraining,
      stats,
      activeBets: this.activeBets.size,
      recentPerformance
    };
  }

  // Get recent performance metrics
  private async getRecentPerformance(): Promise<any> {
    try {
      const metrics = await storage.getPerformanceMetrics('WIN_RATE', 10);
      const sideBets = await storage.getSideBets();
      
      const recent = sideBets
        .filter(bet => bet.actualOutcome !== 'PENDING')
        .slice(-50); // Last 50 resolved bets
      
      if (recent.length === 0) {
        return { winRate: 0, totalProfit: 0, totalBets: 0, avgProfit: 0 };
      }
      
      const wins = recent.filter(bet => bet.actualOutcome === 'WIN').length;
      const totalProfit = recent.reduce((sum, bet) => sum + bet.profit, 0);
      
      return {
        winRate: wins / recent.length,
        totalProfit,
        totalBets: recent.length,
        avgProfit: totalProfit / recent.length
      };
    } catch (error) {
      console.warn('Failed to get recent performance:', error);
      return { winRate: 0, totalProfit: 0, totalBets: 0, avgProfit: 0 };
    }
  }

  // Toggle training mode
  public setTraining(enabled: boolean): void {
    this.isTraining = enabled;
    console.log(`🎓 Q-Learning training ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // Force learning from manual outcomes (for testing)
  public async forceLearning(gameId: string, outcome: 'WIN' | 'LOSS', reward: number): Promise<void> {
    if (this.currentGameId === gameId) {
      await this.agent.endEpisode(outcome, reward);
      console.log(`🧠 Forced learning: ${outcome} with reward ${reward}`);
    }
  }

  // Get historical Q-learning analytics
  public async getAnalytics(): Promise<any> {
    try {
      const episodes = await storage.getTrainingEpisodes(100);
      const qStates = await storage.getQStates(50);
      const sideBets = await storage.getSideBets();
      
      // Calculate learning progress
      const totalEpisodes = episodes.length;
      const avgEpisodeReward = episodes.length > 0 
        ? episodes.reduce((sum, ep) => sum + ep.totalReward, 0) / episodes.length 
        : 0;
      
      // Recent performance trend
      const recentEpisodes = episodes.slice(-20);
      const recentAvgReward = recentEpisodes.length > 0
        ? recentEpisodes.reduce((sum, ep) => sum + ep.totalReward, 0) / recentEpisodes.length
        : 0;
      
      // State space exploration
      const totalStates = qStates.length;
      const avgVisitCount = qStates.length > 0
        ? qStates.reduce((sum, state) => sum + state.visitCount, 0) / qStates.length
        : 0;
      
      return {
        learning: {
          totalEpisodes,
          avgEpisodeReward: Number(avgEpisodeReward.toFixed(4)),
          recentAvgReward: Number(recentAvgReward.toFixed(4)),
          improvementTrend: recentAvgReward > avgEpisodeReward ? 'IMPROVING' : 'STABLE'
        },
        exploration: {
          totalStates,
          avgVisitCount: Number(avgVisitCount.toFixed(2)),
          explorationHealth: avgVisitCount > 5 ? 'GOOD' : 'NEEDS_MORE_DATA'
        },
        performance: await this.getRecentPerformance()
      };
    } catch (error) {
      console.warn('Failed to get Q-learning analytics:', error);
      return {
        learning: { totalEpisodes: 0, avgEpisodeReward: 0, recentAvgReward: 0, improvementTrend: 'UNKNOWN' },
        exploration: { totalStates: 0, avgVisitCount: 0, explorationHealth: 'UNKNOWN' },
        performance: { winRate: 0, totalProfit: 0, totalBets: 0, avgProfit: 0 }
      };
    }
  }
}

// Singleton instance
export const qLearningService = new QLearningService();