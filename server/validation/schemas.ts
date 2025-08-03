import { z } from 'zod';

// Prediction endpoint schemas
export const createPredictionSchema = z.object({
  body: z.object({
    gameId: z.string().min(1),
    tickCount: z.number().int().min(0),
    rugProbability: z.number().min(0).max(1),
    expectedValue: z.number(),
    confidence: z.number().min(0).max(1),
    zone: z.string().min(1),
  }),
});

// Q-Learning schemas
export const qLearningRecommendationSchema = z.object({
  body: z.object({
    gameState: z.object({
      tickCount: z.number().int().min(0),
      price: z.number().positive(),
      active: z.boolean(),
      cooldownTimer: z.number().int().min(0),
      peakPrice: z.number().positive(),
      gameId: z.string().optional(),
      timestamp: z.number().optional(),
    }),
    timing: z.object({
      currentRate: z.number().positive(),
      reliability: z.number().min(0).max(1),
      variance: z.number().min(0),
      mean: z.number().positive(),
      median: z.number().positive(),
    }),
    bankroll: z.number().positive().default(1.0),
  }),
});

export const executeBetSchema = z.object({
  body: z.object({
    gameId: z.string().min(1),
    decision: z.object({
      action: z.enum(['BET_SMALL', 'BET_MEDIUM', 'BET_LARGE', 'HOLD']),
      betAmount: z.number().min(0).optional(),
      confidence: z.number().min(0).max(1),
      expectedValue: z.number(),
      reasoning: z.string(),
    }),
    gameState: z.object({
      tickCount: z.number().int().min(0),
      price: z.number().positive(),
      active: z.boolean(),
      cooldownTimer: z.number().int().min(0),
      peakPrice: z.number().positive(),
    }),
  }),
});

export const startGameSchema = z.object({
  body: z.object({
    gameId: z.string().min(1),
  }),
});

export const endGameSchema = z.object({
  body: z.object({
    gameId: z.string().min(1),
    finalTick: z.number().int().min(0),
  }),
});

export const recordTickSchema = z.object({
  body: z.object({
    tick: z.number().int().min(0),
    timestamp: z.number().positive(),
  }),
});

export const trainingToggleSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
  }),
});

// Type exports
export type CreatePredictionInput = z.infer<typeof createPredictionSchema>['body'];
export type QLearningRecommendationInput = z.infer<typeof qLearningRecommendationSchema>['body'];
export type ExecuteBetInput = z.infer<typeof executeBetSchema>['body'];
export type StartGameInput = z.infer<typeof startGameSchema>['body'];
export type EndGameInput = z.infer<typeof endGameSchema>['body'];
export type RecordTickInput = z.infer<typeof recordTickSchema>['body'];
export type TrainingToggleInput = z.infer<typeof trainingToggleSchema>['body'];