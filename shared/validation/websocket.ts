import { z } from 'zod';

// WebSocket message validation schemas
export const gameStateUpdateSchema = z.object({
  tickCount: z.number().int().min(0).optional(),
  tick: z.number().int().min(0).optional(),
  price: z.number().positive().optional(),
  multiplier: z.number().positive().optional(),
  active: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'cooldown']).optional(),
  cooldownTimer: z.number().int().min(0).optional(),
  cooldown: z.number().int().min(0).optional(),
  peakPrice: z.number().positive().optional(),
  peak: z.number().positive().optional(),
  gameId: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.number().positive().optional(),
});

export const sideBetUpdateSchema = z.object({
  betId: z.string(),
  playerId: z.string(),
  startTick: z.number().int().min(0),
  endTick: z.number().int().min(0),
  amount: z.number().positive(),
  status: z.enum(['pending', 'won', 'lost']),
  timestamp: z.number().positive(),
});

export const gameEndSchema = z.object({
  gameId: z.string(),
  finalTick: z.number().int().min(0),
  finalPrice: z.number().positive(),
  duration: z.number().positive(),
  winners: z.number().int().min(0),
  losers: z.number().int().min(0),
  timestamp: z.number().positive(),
});

// Internal WebSocket message types
export const internalWSMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscribe'),
    channel: z.string(),
  }),
  z.object({
    type: z.literal('unsubscribe'),
    channel: z.string(),
  }),
  z.object({
    type: z.literal('ping'),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('pong'),
    timestamp: z.number(),
  }),
]);

// Validation helper
export function validateWebSocketMessage<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Invalid message format' };
  }
}