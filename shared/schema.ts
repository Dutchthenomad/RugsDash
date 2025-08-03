import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, timestamp, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const gameStates = pgTable("game_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: text("game_id").notNull(),
  tickCount: integer("tick_count").notNull().default(0),
  price: real("price").notNull().default(1.0),
  active: boolean("active").notNull().default(false),
  cooldownTimer: integer("cooldown_timer").notNull().default(0),
  peakPrice: real("peak_price").notNull().default(1.0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const gameHistory = pgTable("game_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: text("game_id").notNull().unique(),
  finalTick: integer("final_tick").notNull(),
  peakPrice: real("peak_price").notNull(),
  finalPrice: real("final_price").notNull(),
  duration: integer("duration").notNull(), // in milliseconds
  rugTick: integer("rug_tick").notNull(), // tick when game ended
  priceHistory: text("price_history").notNull(), // JSON array
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
});

export const marketPatterns = pgTable("market_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tickRange: text("tick_range").notNull(), // e.g., "100-150"
  avgDuration: real("avg_duration").notNull(),
  rugProbability: real("rug_probability").notNull(),
  sampleSize: integer("sample_size").notNull(),
  confidence: real("confidence").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: text("game_id").notNull(),
  tickCount: integer("tick_count").notNull(),
  rugProbability: real("rug_probability").notNull(),
  expectedValue: real("expected_value").notNull(),
  confidence: real("confidence").notNull(),
  zone: text("zone").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const predictionResults = pgTable("prediction_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  predictionId: varchar("prediction_id").notNull(),
  actual: boolean("actual").notNull(),
  correct: boolean("correct").notNull(),
  profit: real("profit").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// =============================================================================
// Q-LEARNING & REINFORCEMENT LEARNING TABLES
// =============================================================================

// Side bet tracking with detailed outcomes
export const sideBets = pgTable("side_bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: text("game_id").notNull(),
  playerId: text("player_id").notNull(), // 'bot' for our bot
  startTick: integer("start_tick").notNull(),
  endTick: integer("end_tick").notNull(),
  betAmount: real("bet_amount").notNull(),
  payout: real("payout").notNull(),
  actualOutcome: varchar("actual_outcome", { length: 10 }).notNull(), // 'WIN', 'LOSS', 'PENDING'
  profit: real("profit").notNull().default(0),
  rugTick: integer("rug_tick"), // Actual tick when game rugged (null if game ongoing)
  confidence: real("confidence").notNull(),
  recommendation: varchar("recommendation", { length: 20 }).notNull(),
  gameState: json("game_state"), // Game state when bet was placed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  gameIdIdx: index("sidebets_game_id_idx").on(table.gameId),
  playerIdIdx: index("sidebets_player_id_idx").on(table.playerId),
  outcomeIdx: index("sidebets_outcome_idx").on(table.actualOutcome),
}));

// Q-Learning states: Game situation encoded as features
export const qStates = pgTable("q_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stateHash: varchar("state_hash", { length: 64 }).notNull().unique(), // MD5/SHA hash of state features
  tickCount: integer("tick_count").notNull(),
  priceLevel: integer("price_level").notNull(), // Discretized price (e.g., 1-5)
  volatilityLevel: integer("volatility_level").notNull(), // Discretized volatility (e.g., 1-3)
  timingReliability: integer("timing_reliability").notNull(), // Discretized timing (e.g., 1-3)
  gamePhase: varchar("game_phase", { length: 20 }).notNull(), // 'EARLY', 'MID', 'LATE'
  recentPattern: varchar("recent_pattern", { length: 30 }), // 'RISING', 'FALLING', 'VOLATILE'
  features: json("features").notNull(), // Full feature vector as JSON
  visitCount: integer("visit_count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
}, (table) => ({
  tickCountIdx: index("qstates_tick_count_idx").on(table.tickCount),
  gamePhaseIdx: index("qstates_game_phase_idx").on(table.gamePhase),
}));

// Q-Learning actions: What the bot can do
export const qActions = pgTable("q_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionType: varchar("action_type", { length: 20 }).notNull(), // 'BET_SMALL', 'BET_MEDIUM', 'BET_LARGE', 'HOLD'
  betSizeMultiplier: real("bet_size_multiplier").notNull(), // 0.5, 1.0, 1.5, etc.
  description: text("description").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Q-Learning Q-Values: State-Action value function
export const qValues = pgTable("q_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stateId: varchar("state_id").notNull(),
  actionId: varchar("action_id").notNull(),
  qValue: real("q_value").notNull().default(0),
  visitCount: integer("visit_count").notNull().default(0),
  lastReward: real("last_reward"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  stateActionIdx: index("qvalues_state_action_idx").on(table.stateId, table.actionId),
  qValueIdx: index("qvalues_q_value_idx").on(table.qValue),
}));

// Training episodes: Complete state-action-reward sequences
export const trainingEpisodes = pgTable("training_episodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: text("game_id").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  stateSequence: json("state_sequence").notNull(), // Array of state IDs
  actionSequence: json("action_sequence").notNull(), // Array of action IDs
  rewardSequence: json("reward_sequence").notNull(), // Array of rewards
  totalReward: real("total_reward").notNull(),
  episodeLength: integer("episode_length").notNull(),
  finalOutcome: varchar("final_outcome", { length: 10 }).notNull(), // 'WIN', 'LOSS'
  explorationRate: real("exploration_rate").notNull(), // Epsilon value used
  learningRate: real("learning_rate").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  gameIdIdx: index("episodes_game_id_idx").on(table.gameId),
  episodeNumberIdx: index("episodes_episode_number_idx").on(table.episodeNumber),
}));

// Model parameters and hyperparameters
export const modelParameters = pgTable("model_parameters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parameterName: varchar("parameter_name", { length: 50 }).notNull().unique(),
  parameterValue: real("parameter_value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 30 }).notNull(), // 'Q_LEARNING', 'FEATURE_ENGINEERING', 'ENVIRONMENT'
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

// Performance metrics over time
export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: varchar("metric_type", { length: 30 }).notNull(), // 'WIN_RATE', 'PROFIT', 'ACCURACY', 'BRIER_SCORE'
  value: real("value").notNull(),
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  sampleSize: integer("sample_size").notNull(),
  modelVersion: varchar("model_version", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  metricTypeIdx: index("metrics_metric_type_idx").on(table.metricType),
  windowStartIdx: index("metrics_window_start_idx").on(table.windowStart),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).omit({
  id: true,
  timestamp: true,
});

export const insertGameHistorySchema = createInsertSchema(gameHistory).omit({
  id: true,
});

export const insertMarketPatternSchema = createInsertSchema(marketPatterns).omit({
  id: true,
  lastUpdated: true,
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  timestamp: true,
});

export const insertPredictionResultSchema = createInsertSchema(predictionResults).omit({
  id: true,
  timestamp: true,
});

// Q-Learning schema exports
export const insertSideBetSchema = createInsertSchema(sideBets).omit({
  id: true,
  createdAt: true,
});

export const insertQStateSchema = createInsertSchema(qStates).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertQActionSchema = createInsertSchema(qActions).omit({
  id: true,
});

export const insertQValueSchema = createInsertSchema(qValues).omit({
  id: true,
  updatedAt: true,
});

export const insertTrainingEpisodeSchema = createInsertSchema(trainingEpisodes).omit({
  id: true,
  createdAt: true,
});

export const insertModelParameterSchema = createInsertSchema(modelParameters).omit({
  id: true,
  updatedAt: true,
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
});

// Base types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type GameHistory = typeof gameHistory.$inferSelect;
export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type MarketPattern = typeof marketPatterns.$inferSelect;
export type InsertMarketPattern = z.infer<typeof insertMarketPatternSchema>;
export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type PredictionResult = typeof predictionResults.$inferSelect;
export type InsertPredictionResult = z.infer<typeof insertPredictionResultSchema>;

// Q-Learning types
export type SideBet = typeof sideBets.$inferSelect;
export type InsertSideBet = z.infer<typeof insertSideBetSchema>;
export type QState = typeof qStates.$inferSelect;
export type InsertQState = z.infer<typeof insertQStateSchema>;
export type QAction = typeof qActions.$inferSelect;
export type InsertQAction = z.infer<typeof insertQActionSchema>;
export type QValue = typeof qValues.$inferSelect;
export type InsertQValue = z.infer<typeof insertQValueSchema>;
export type TrainingEpisode = typeof trainingEpisodes.$inferSelect;
export type InsertTrainingEpisode = z.infer<typeof insertTrainingEpisodeSchema>;
export type ModelParameter = typeof modelParameters.$inferSelect;
export type InsertModelParameter = z.infer<typeof insertModelParameterSchema>;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
