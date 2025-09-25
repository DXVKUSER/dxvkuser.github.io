import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServerConfigSchema, insertStreamLogSchema } from "@shared/schema";
import { z } from "zod";
import axios from "axios";
import { createProxyMiddleware } from "http-proxy-middleware";

const ADULT_KEYWORDS = ["adulto", "sex", "pussy", "hard", "nude", "porn", "xxx", "erotico", "erótico", "sexo"];

export async function registerRoutes(app: Express): Promise<Server> {
  // Get server configuration
  app.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getServerConfig();
      res.json(config || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get server config" });
    }
  });

  // Update server configuration and import channels
  app.post("/api/config", async (req, res) => {
    try {
      const config = insertServerConfigSchema.parse(req.body);
      
      // Validate Xtream Codes connection
      const apiUrl = `${config.server}/player_api.php?username=${config.username}&password=${config.password}`;
      
      await storage.createStreamLog({
        action: "import",
        details: "Starting channel import",
        status: "info",
      });

      // Get live streams
      const streamsResponse = await axios.get(`${apiUrl}&action=get_live_streams`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
          'Accept': '*/*',
        },
      });

      if (!streamsResponse.data || !Array.isArray(streamsResponse.data)) {
        throw new Error("Invalid response from Xtream Codes server");
      }

      // Get categories
      let categories: Record<string, string> = {};
      try {
        const categoriesResponse = await axios.get(`${apiUrl}&action=get_live_categories`, {
          timeout: 5000,
          headers: {
            'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
            'Accept': '*/*',
          },
        });
        if (categoriesResponse.data && Array.isArray(categoriesResponse.data)) {
          categories = categoriesResponse.data.reduce((acc: Record<string, string>, cat: any) => {
            acc[cat.category_id] = cat.category_name || 'Uncategorized';
            return acc;
          }, {});
        }
      } catch (error) {
        console.warn("Failed to load categories:", error);
      }

      // Clear existing channels
      await storage.deleteAllChannels();

      // Import channels
      let importedCount = 0;
      let filteredCount = 0;

      for (const stream of streamsResponse.data) {
        if (stream.stream_type !== 'live' || !stream.stream_id) continue;

        const name = stream.name || `Channel ${stream.stream_id}`;
        const groupTitle = categories[stream.category_id] || 'Uncategorized';

        // Filter adult content if enabled
        if (config.filterAdult) {
          const isAdult = ADULT_KEYWORDS.some(keyword => 
            name.toLowerCase().includes(keyword) || 
            groupTitle.toLowerCase().includes(keyword)
          );
          if (isAdult) {
            filteredCount++;
            continue;
          }
        }

        await storage.createChannel({
          name,
          url: `${config.server}/live/${config.username}/${config.password}/${stream.stream_id}.m3u8`,
          groupTitle,
          tvgId: stream.tvg_id || "",
          tvgLogo: stream.stream_icon || "",
          streamType: "live",
          categoryId: stream.category_id || "",
        });

        importedCount++;
      }

      // Save configuration
      const savedConfig = await storage.updateServerConfig({
        ...config,
        channelCount: importedCount,
      });

      // Log completion
      await storage.createStreamLog({
        action: "import",
        details: `Import completed: ${importedCount} channels imported, ${filteredCount} filtered`,
        status: "success",
      });

      if (filteredCount > 0) {
        await storage.createStreamLog({
          action: "filter",
          details: `${filteredCount} adult channels filtered`,
          status: "info",
        });
      }

      res.json(savedConfig);
    } catch (error) {
      console.error("Import error:", error);
      await storage.createStreamLog({
        action: "import",
        details: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: "error",
      });
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to import channels" });
    }
  });

  // Get all channels
  app.get("/api/channels", async (req, res) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      res.status(500).json({ message: "Failed to get channels" });
    }
  });

  // Get channels by group
  app.get("/api/channels/group/:groupTitle", async (req, res) => {
    try {
      const { groupTitle } = req.params;
      const channels = await storage.getChannelsByGroup(decodeURIComponent(groupTitle));
      res.json(channels);
    } catch (error) {
      res.status(500).json({ message: "Failed to get channels by group" });
    }
  });

  // Generate M3U playlist
  app.get("/api/playlist/:type", async (req, res) => {
    try {
      const { type } = req.params; // 'all' or 'safe'
      const config = await storage.getServerConfig();
      const channels = await storage.getChannels();
      
      let filteredChannels = channels;
      if (type === 'safe') {
        filteredChannels = channels.filter(channel => {
          const isAdult = ADULT_KEYWORDS.some(keyword => 
            channel.name.toLowerCase().includes(keyword) || 
            channel.groupTitle.toLowerCase().includes(keyword)
          );
          return !isAdult;
        });
      }

      // Generate M3U content
      let m3uContent = '#EXTM3U';
      
      // Add EPG URL if available
      if (config?.server && config?.username && config?.password) {
        const serverUrl = new URL(config.server);
        const epgUrl = `http://${serverUrl.host}/xmltv.php?username=${config.username}&password=${config.password}`;
        m3uContent += ` x-tvg-url="${epgUrl}"`;
      }
      m3uContent += '\n';

      for (const channel of filteredChannels) {
        m3uContent += `#EXTINF:-1 tvg-id="${channel.tvgId}" tvg-name="${channel.name}" tvg-logo="${channel.tvgLogo}" group-title="${channel.groupTitle}",${channel.name}\n`;
        m3uContent += `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/stream/${channel.id}.m3u8\n`;
      }

      res.setHeader('Content-Type', 'audio/x-mpegurl');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_channels.m3u"`);
      res.send(m3uContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate playlist" });
    }
  });

  // HLS Proxy Stream
  app.get("/api/stream/:channelId.m3u8", async (req, res) => {
    try {
      const { channelId } = req.params;
      const channel = await storage.getChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      // Log stream start
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      await storage.createStreamLog({
        channelId,
        channelName: channel.name,
        action: "started",
        details: `Stream started for ${channel.name}`,
        userIp: clientIp,
        status: "success",
      });

      // Proxy the stream
      try {
        const response = await axios.get(channel.url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
            'Accept': '*/*',
            'Connection': 'keep-alive',
          },
        });

        // Rewrite playlist URLs to use our proxy
        let content = response.data;
        if (typeof content === 'string') {
          // Replace relative URLs with our proxy URLs
          content = content.replace(/^((?!#)[^\r\n]+)/gm, (match) => {
            if (match.startsWith('http')) {
              return `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/proxy?url=${encodeURIComponent(match)}`;
            }
            // Handle relative URLs
            const baseUrl = channel.url.substring(0, channel.url.lastIndexOf('/'));
            const fullUrl = `${baseUrl}/${match}`;
            return `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/proxy?url=${encodeURIComponent(fullUrl)}`;
          });
        }

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(content);
      } catch (streamError) {
        console.error("Stream error:", streamError);
        await storage.createStreamLog({
          channelId,
          channelName: channel.name,
          action: "error",
          details: `Stream error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`,
          userIp: clientIp,
          status: "error",
        });
        res.status(502).json({ message: "Failed to proxy stream" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generic proxy endpoint
  app.get("/api/proxy", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL parameter required" });
      }

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
          'Accept': '*/*',
          'Connection': 'keep-alive',
        },
        responseType: 'stream',
      });

      // Copy headers
      Object.keys(response.headers).forEach(key => {
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          res.setHeader(key, response.headers[key]);
        }
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      response.data.pipe(res);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(502).json({ message: "Proxy error" });
    }
  });

  // Get stream logs
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getStreamLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get logs" });
    }
  });

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Test endpoint to seed sample channels for testing
  app.post("/api/test/seed-channels", async (req, res) => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: "Only available in development" });
      }

      // Clear existing channels
      await storage.deleteAllChannels();

      // Create test channels
      const testChannels = [
        {
          name: "BBC News HD",
          url: "http://test-server.com/bbc-news.m3u8",
          groupTitle: "News",
          tvgLogo: "http://test-server.com/logos/bbc.png",
          tvgId: "bbc-news",
          streamType: "live",
          categoryId: "news"
        },
        {
          name: "ESPN Sports",
          url: "http://test-server.com/espn.m3u8",
          groupTitle: "Sports", 
          tvgLogo: "http://test-server.com/logos/espn.png",
          tvgId: "espn",
          streamType: "live",
          categoryId: "sports"
        },
        {
          name: "Discovery Channel",
          url: "http://test-server.com/discovery.m3u8",
          groupTitle: "Documentary",
          tvgLogo: "http://test-server.com/logos/discovery.png",
          tvgId: "discovery",
          streamType: "live", 
          categoryId: "documentary"
        },
        {
          name: "Adult Channel XXX",
          url: "http://test-server.com/adult.m3u8",
          groupTitle: "Adult Content",
          tvgLogo: "",
          tvgId: "adult-xxx",
          streamType: "live",
          categoryId: "adult"
        }
      ];

      const createdChannels = [];
      for (const channelData of testChannels) {
        const channel = await storage.createChannel(channelData);
        createdChannels.push(channel);
      }

      // Update server config to reflect the seeded data
      await storage.updateServerConfig({
        server: "http://test-server.com:8080",
        username: "test_user", 
        password: "test_password",
        filterAdult: true,
      });

      // Log successful seeding
      await storage.createStreamLog({
        action: "import",
        details: `Test data seeded: ${createdChannels.length} channels created`,
        status: "success",
      });

      res.json({ 
        message: "Test channels seeded successfully", 
        channels: createdChannels.length 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to seed test channels" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
