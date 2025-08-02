import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
