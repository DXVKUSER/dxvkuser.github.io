import { type Channel, type InsertChannel, type ServerConfig, type InsertServerConfig, type StreamLog, type InsertStreamLog } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Channel management
  getChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: string, channel: Partial<InsertChannel>): Promise<Channel | undefined>;
  deleteChannel(id: string): Promise<boolean>;
  deleteAllChannels(): Promise<void>;
  getChannelsByGroup(groupTitle: string): Promise<Channel[]>;
  
  // Server configuration
  getServerConfig(): Promise<ServerConfig | undefined>;
  updateServerConfig(config: InsertServerConfig): Promise<ServerConfig>;
  
  // Stream logs
  getStreamLogs(limit?: number): Promise<StreamLog[]>;
  createStreamLog(log: InsertStreamLog): Promise<StreamLog>;
  
  // Stats
  getStats(): Promise<{
    totalChannels: number;
    activeStreams: number;
    errorRate: number;
    lastImport?: string;
  }>;
}

export class MemStorage implements IStorage {
  private channels: Map<string, Channel> = new Map();
  private serverConfig: ServerConfig | undefined;
  private streamLogs: Map<string, StreamLog> = new Map();
  private activeStreams: Set<string> = new Set();

  async getChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values()).sort((a, b) => 
      (a.groupTitle || "").localeCompare(b.groupTitle || "") || a.name.localeCompare(b.name)
    );
  }

  async getChannel(id: string): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = randomUUID();
    const channel: Channel = { 
      id,
      name: insertChannel.name,
      url: insertChannel.url,
      groupTitle: insertChannel.groupTitle || "",
      tvgId: insertChannel.tvgId || "",
      tvgLogo: insertChannel.tvgLogo || "",
      streamType: insertChannel.streamType || "live",
      categoryId: insertChannel.categoryId || "",
    };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannel(id: string, updateData: Partial<InsertChannel>): Promise<Channel | undefined> {
    const existing = this.channels.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updateData };
    this.channels.set(id, updated);
    return updated;
  }

  async deleteChannel(id: string): Promise<boolean> {
    return this.channels.delete(id);
  }

  async deleteAllChannels(): Promise<void> {
    this.channels.clear();
  }

  async getChannelsByGroup(groupTitle: string): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(
      channel => channel.groupTitle === groupTitle
    );
  }

  async getServerConfig(): Promise<ServerConfig | undefined> {
    return this.serverConfig;
  }

  async updateServerConfig(config: InsertServerConfig): Promise<ServerConfig> {
    const serverConfig: ServerConfig = {
      id: "main",
      server: config.server,
      username: config.username,
      password: config.password,
      channelCount: this.channels.size,
      lastImport: new Date().toISOString(),
      filterAdult: config.filterAdult ?? true,
    };
    this.serverConfig = serverConfig;
    return serverConfig;
  }

  async getStreamLogs(limit = 20): Promise<StreamLog[]> {
    const logs = Array.from(this.streamLogs.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs.slice(0, limit);
  }

  async createStreamLog(insertLog: InsertStreamLog): Promise<StreamLog> {
    const id = randomUUID();
    const log: StreamLog = {
      id,
      channelId: insertLog.channelId || null,
      channelName: insertLog.channelName || null,
      action: insertLog.action,
      details: insertLog.details || null,
      userIp: insertLog.userIp || null,
      timestamp: new Date().toISOString(),
      status: insertLog.status || "info",
    };
    this.streamLogs.set(id, log);
    return log;
  }

  async getStats(): Promise<{
    totalChannels: number;
    activeStreams: number;
    errorRate: number;
    lastImport?: string;
  }> {
    const recentLogs = await this.getStreamLogs(100);
    const errorLogs = recentLogs.filter(log => log.status === 'error');
    const errorRate = recentLogs.length > 0 ? (errorLogs.length / recentLogs.length) * 100 : 0;

    return {
      totalChannels: this.channels.size,
      activeStreams: this.activeStreams.size,
      errorRate: Math.round(errorRate * 10) / 10,
      lastImport: this.serverConfig?.lastImport || undefined,
    };
  }

  // Helper methods for stream management
  addActiveStream(channelId: string): void {
    this.activeStreams.add(channelId);
  }

  removeActiveStream(channelId: string): void {
    this.activeStreams.delete(channelId);
  }
}

export const storage = new MemStorage();
