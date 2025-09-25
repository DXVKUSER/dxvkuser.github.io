import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const channels = pgTable("channels", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  groupTitle: text("group_title").notNull().default(""),
  tvgId: text("tvg_id").notNull().default(""),
  tvgLogo: text("tvg_logo").notNull().default(""),
  streamType: text("stream_type").notNull().default("live"),
  categoryId: text("category_id").notNull().default(""),
});

export const serverConfig = pgTable("server_config", {
  id: varchar("id").primaryKey().default("main"),
  server: text("server").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  channelCount: integer("channel_count").notNull().default(0),
  lastImport: text("last_import"),
  filterAdult: boolean("filter_adult").notNull().default(true),
});

export const streamLogs = pgTable("stream_logs", {
  id: varchar("id").primaryKey(),
  channelId: text("channel_id"),
  channelName: text("channel_name"),
  action: text("action").notNull(), // 'started', 'stopped', 'error', 'import', 'filter'
  details: text("details"),
  userIp: text("user_ip"),
  timestamp: text("timestamp").notNull(),
  status: text("status").notNull().default("info"), // 'info', 'warning', 'error', 'success'
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
});

export const insertServerConfigSchema = createInsertSchema(serverConfig).omit({
  id: true,
  lastImport: true,
});

export const insertStreamLogSchema = createInsertSchema(streamLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;

export type InsertServerConfig = z.infer<typeof insertServerConfigSchema>;
export type ServerConfig = typeof serverConfig.$inferSelect;

export type InsertStreamLog = z.infer<typeof insertStreamLogSchema>;
export type StreamLog = typeof streamLogs.$inferSelect;
