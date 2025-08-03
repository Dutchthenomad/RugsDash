import { describe, it, expect } from 'vitest';
import {
  createPredictionSchema,
  qLearningRecommendationSchema,
  executeBetSchema,
  startGameSchema,
  endGameSchema,
  recordTickSchema,
  trainingToggleSchema
} from './schemas';

describe('API Validation Schemas', () => {
  describe('createPredictionSchema', () => {
    it('should validate correct prediction data', () => {
      const validData = {
        body: {
          gameId: 'game123',
          tickCount: 100,
          rugProbability: 0.65,
          expectedValue: 1.25,
          confidence: 0.85,
          zone: 'HIGH_RISK'
        }
      };
      
      const result = createPredictionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid probability values', () => {
      const invalidData = {
        body: {
          gameId: 'game123',
          tickCount: 100,
          rugProbability: 1.5, // Invalid: > 1
          expectedValue: 1.25,
          confidence: 0.85,
          zone: 'HIGH_RISK'
        }
      };
      
      const result = createPredictionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should reject negative tick counts', () => {
      const invalidData = {
        body: {
          gameId: 'game123',
          tickCount: -5, // Invalid: negative
          rugProbability: 0.5,
          expectedValue: 1.25,
          confidence: 0.85,
          zone: 'HIGH_RISK'
        }
      };
      
      const result = createPredictionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('qLearningRecommendationSchema', () => {
    it('should validate complete game state and timing data', () => {
      const validData = {
        body: {
          gameState: {
            tickCount: 150,
            price: 2.5,
            active: true,
            cooldownTimer: 0,
            peakPrice: 2.8
          },
          timing: {
            currentRate: 250,
            reliability: 0.92,
            variance: 15,
            mean: 260,
            median: 255
          },
          bankroll: 10.5
        }
      };
      
      const result = qLearningRecommendationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should use default bankroll if not provided', () => {
      const validData = {
        body: {
          gameState: {
            tickCount: 150,
            price: 2.5,
            active: true,
            cooldownTimer: 0,
            peakPrice: 2.8
          },
          timing: {
            currentRate: 250,
            reliability: 0.92,
            variance: 15,
            mean: 260,
            median: 255
          }
        }
      };
      
      const result = qLearningRecommendationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.bankroll).toBe(1.0);
      }
    });
  });
  
  describe('executeBetSchema', () => {
    it('should validate bet execution with all decision types', () => {
      const actions = ['BET_SMALL', 'BET_MEDIUM', 'BET_LARGE', 'HOLD'];
      
      actions.forEach(action => {
        const validData = {
          body: {
            gameId: 'game123',
            decision: {
              action,
              betAmount: action === 'HOLD' ? undefined : 0.5,
              confidence: 0.75,
              expectedValue: 1.2,
              reasoning: 'Test reasoning'
            },
            gameState: {
              tickCount: 200,
              price: 3.2,
              active: true,
              cooldownTimer: 0,
              peakPrice: 3.5
            }
          }
        };
        
        const result = executeBetSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
    
    it('should reject invalid action types', () => {
      const invalidData = {
        body: {
          gameId: 'game123',
          decision: {
            action: 'INVALID_ACTION',
            confidence: 0.75,
            expectedValue: 1.2,
            reasoning: 'Test reasoning'
          },
          gameState: {
            tickCount: 200,
            price: 3.2,
            active: true,
            cooldownTimer: 0,
            peakPrice: 3.5
          }
        }
      };
      
      const result = executeBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Simple schemas', () => {
    it('should validate startGameSchema', () => {
      const validData = { body: { gameId: 'game123' } };
      const result = startGameSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should validate endGameSchema', () => {
      const validData = { body: { gameId: 'game123', finalTick: 500 } };
      const result = endGameSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should validate recordTickSchema', () => {
      const validData = { body: { tick: 250, timestamp: Date.now() } };
      const result = recordTickSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should validate trainingToggleSchema', () => {
      const validData = { body: { enabled: true } };
      const result = trainingToggleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});