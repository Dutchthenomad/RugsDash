import { GameStateData, PredictionData, TimingData, PredictionZone } from '../types/gameState';

export class AdaptivePredictionEngine {
  private tickHistory: Array<{ tick: number; price: number; timestamp: number; interval: number }> = [];
  private rugProbabilities: number[] = [];
  private predictionResults: Array<{ predicted: number; actual: boolean; correct: boolean }> = [];
  
  // Empirical constants from the side bet mechanics document
  private readonly EMPIRICAL_BASELINE = {
    mean: 271.5,      // ms per tick
    median: 251.0,    // ms per tick
    stdDev: 295.3,    // ms
    cv: 1.09,         // coefficient of variation
    p5: 237,          // 5th percentile
    p95: 269          // 95th percentile
  };
  
  private readonly THEORETICAL_TICK_RATE = 250; // ms
  private lastTimestamp = 0;

  recordTick(gameState: GameStateData): void {
    const timestamp = Date.now();
    const interval = this.lastTimestamp ? timestamp - this.lastTimestamp : this.EMPIRICAL_BASELINE.mean;
    
    this.tickHistory.push({
      tick: gameState.tickCount,
      price: gameState.price,
      timestamp,
      interval
    });
    
    this.lastTimestamp = timestamp;
    
    // Maintain rolling window of 100 ticks
    if (this.tickHistory.length > 100) {
      this.tickHistory.shift();
    }
    
    // Calculate and store new probability
    const probability = this.calculateAdaptiveProbability(gameState.tickCount);
    this.rugProbabilities.push(probability);
    
    // Maintain rolling window of probabilities
    if (this.rugProbabilities.length > 100) {
      this.rugProbabilities.shift();
    }
  }

  calculateAdaptiveProbability(tickCount: number): number {
    // Base probability curve from empirical data analysis
    const baseProbabilities: Record<number, number> = {
      0: 0.15, 50: 0.32, 100: 0.50, 150: 0.58, 200: 0.74,
      250: 0.80, 300: 0.88, 400: 0.93, 500: 0.96, 600: 0.98
    };
    
    // Linear interpolation between points
    let baseProb = 0.98; // Default high probability for very late game
    const ticks = Object.keys(baseProbabilities).map(Number).sort((a, b) => a - b);
    
    for (let i = 0; i < ticks.length - 1; i++) {
      const tick1 = ticks[i];
      const tick2 = ticks[i + 1];
      
      if (tickCount >= tick1 && tickCount <= tick2) {
        const ratio = (tickCount - tick1) / (tick2 - tick1);
        baseProb = baseProbabilities[tick1] + (baseProbabilities[tick2] - baseProbabilities[tick1]) * ratio;
        break;
      } else if (tickCount < ticks[0]) {
        baseProb = baseProbabilities[ticks[0]];
        break;
      }
    }
    
    // Apply timing adjustments based on empirical vs theoretical
    const currentTickRate = this.getCurrentTickRate();
    const timingRatio = currentTickRate / this.THEORETICAL_TICK_RATE;
    const empiricalRatio = this.EMPIRICAL_BASELINE.mean / this.THEORETICAL_TICK_RATE;
    
    // Blend current observations with empirical baseline
    const reliability = this.getReliabilityScore();
    const blendedRatio = (timingRatio * reliability) + (empiricalRatio * (1 - reliability));
    
    // Adjust probability for actual window duration
    // Longer windows = higher chance of rug occurring within next 40 ticks
    const durationAdjustment = Math.pow(blendedRatio, 0.3); // Dampened adjustment
    
    return Math.min(baseProb * durationAdjustment, 0.98);
  }

  getCurrentTickRate(): number {
    if (this.tickHistory.length < 10) {
      return this.EMPIRICAL_BASELINE.mean;
    }
    
    const recent = this.tickHistory.slice(-20); // Last 20 ticks
    const avg = recent.reduce((sum, t) => sum + t.interval, 0) / recent.length;
    
    // Blend with empirical baseline for stability
    const blendWeight = Math.min(recent.length / 20, 1);
    return (avg * blendWeight) + (this.EMPIRICAL_BASELINE.mean * (1 - blendWeight));
  }

  getReliabilityScore(): number {
    if (this.tickHistory.length < 20) {
      return 1 - this.EMPIRICAL_BASELINE.cv; // Use empirical baseline
    }
    
    const intervals = this.tickHistory.slice(-50).map(t => t.interval);
    const mean = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
    const cv = Math.sqrt(variance) / mean;
    
    // Compare to empirical baseline
    const relativeReliability = this.EMPIRICAL_BASELINE.cv / cv;
    
    return Math.max(0, Math.min(1, relativeReliability));
  }

  getCurrentPrediction(): PredictionData {
    const currentProb = this.rugProbabilities[this.rugProbabilities.length - 1] || 0;
    const zone = this.getZoneForProbability(currentProb);
    
    // Calculate Expected Value (EV = (p * 4) - 1 for 5:1 payout)
    const expectedValue = (currentProb * 4) - 1;
    
    return {
      rugProbability: currentProb,
      expectedValue,
      confidence: this.getReliabilityScore(),
      zone,
      recommendation: zone.recommendation
    };
  }

  getZoneForProbability(probability: number): PredictionZone {
    if (probability < 0.167) {
      return {
        name: 'AVOID',
        description: 'Negative EV, high risk',
        recommendation: 'Do not bet',
        color: 'text-alert-red',
        threshold: [0, 0.167]
      };
    }
    if (probability < 0.25) {
      return {
        name: 'CAUTION',
        description: 'Marginal EV, proceed carefully',
        recommendation: 'Small bets only',
        color: 'text-yellow-500',
        threshold: [0.167, 0.25]
      };
    }
    if (probability < 0.50) {
      return {
        name: 'OPPORTUNITY',
        description: 'Positive EV, reasonable risk',
        recommendation: 'Standard betting',
        color: 'text-crypto-green',
        threshold: [0.25, 0.50]
      };
    }
    if (probability < 0.75) {
      return {
        name: 'STRONG',
        description: 'Good EV, favorable odds',
        recommendation: 'Increased bet size',
        color: 'text-crypto-green',
        threshold: [0.50, 0.75]
      };
    }
    if (probability < 0.90) {
      return {
        name: 'EXCELLENT',
        description: 'High EV, low risk',
        recommendation: 'Aggressive betting',
        color: 'text-green-400',
        threshold: [0.75, 0.90]
      };
    }
    return {
      name: 'CERTAINTY',
      description: 'Near-guaranteed success',
      recommendation: 'Maximum bet size',
      color: 'text-green-300',
      threshold: [0.90, 1.0]
    };
  }

  getTimingData(): TimingData {
    return {
      currentRate: this.getCurrentTickRate(),
      reliability: this.getReliabilityScore(),
      variance: this.calculateVariance(),
      mean: this.EMPIRICAL_BASELINE.mean,
      median: this.EMPIRICAL_BASELINE.median
    };
  }

  private calculateVariance(): number {
    if (this.tickHistory.length < 10) {
      return this.EMPIRICAL_BASELINE.stdDev;
    }
    
    const intervals = this.tickHistory.slice(-20).map(t => t.interval);
    const mean = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
    
    return Math.sqrt(variance);
  }

  calculateKellyBetSize(probability: number, bankroll: number = 1.0): number {
    // Kelly criterion: f = (bp - q) / b
    // where b = odds (4 for 5:1 payout), p = probability, q = 1-p
    const b = 4; // Net odds for 5:1 payout
    const p = probability;
    const q = 1 - p;
    
    const kellyFraction = Math.max(0, (b * p - q) / b);
    
    // Conservative Kelly with max 20% of bankroll
    return Math.min(kellyFraction * bankroll * 0.5, bankroll * 0.2);
  }

  recordPredictionResult(predicted: number, actual: boolean): void {
    const correct = (predicted > 0.5) === actual;
    this.predictionResults.push({ predicted, actual, correct });
    
    // Maintain rolling window
    if (this.predictionResults.length > 100) {
      this.predictionResults.shift();
    }
  }

  getAccuracy(): number {
    if (this.predictionResults.length === 0) return 0;
    
    const correct = this.predictionResults.filter(r => r.correct).length;
    return correct / this.predictionResults.length;
  }

  getBrierScore(): number {
    if (this.predictionResults.length === 0) return 0;
    
    const sum = this.predictionResults.reduce((acc, result) => {
      const actualValue = result.actual ? 1 : 0;
      return acc + Math.pow(result.predicted - actualValue, 2);
    }, 0);
    
    return sum / this.predictionResults.length;
  }
}
