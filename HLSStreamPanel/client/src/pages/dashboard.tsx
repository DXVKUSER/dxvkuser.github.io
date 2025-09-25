import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertServerConfigSchema, type ServerConfig } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Monitor, TrendingUp, AlertTriangle, Radio, Download } from "lucide-react";
import StatsCard from "@/components/stats-card";
import ActivityLogComponent from "@/components/activity-log";
import type { Stats } from "@/lib/types";
import { z } from "zod";

const configSchema = insertServerConfigSchema.extend({
  filterAdult: z.boolean().default(true),
});

type ConfigForm = z.infer<typeof configSchema>;

export default function Dashboard() {
  const { toast } = useToast();
  
  const { data: config, isLoading: configLoading } = useQuery<ServerConfig>({
    queryKey: ["/api/config"],
  });

  const { data: stats = {
    totalChannels: 0,
    activeStreams: 0,
    errorRate: 0,
  } as Stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      server: config?.server || "",
      username: config?.username || "",
      password: config?.password || "",
      filterAdult: config?.filterAdult ?? true,
    },
  });

  // Reset form when config loads
  React.useEffect(() => {
    if (config) {
      form.reset({
        server: config.server,
        username: config.username,
        password: config.password,
        filterAdult: config.filterAdult ?? true,
      });
    }
  }, [config, form]);

  const importMutation = useMutation({
    mutationFn: async (data: ConfigForm) => {
      return apiRequest("POST", "/api/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      toast({
        title: "Success",
        description: "Channels imported successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import channels",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConfigForm) => {
    importMutation.mutate(data);
  };

  const handleDownloadPlaylist = (type: 'all' | 'safe') => {
    const url = `/api/playlist/${type}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}_channels.m3u`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const publicUrl = window.location.origin + "/api/playlist/all";
  const safePublicUrl = window.location.origin + "/api/playlist/safe";

  const isConnected = Boolean(config?.server);

  return (
    <>
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage your Xtream Codes proxy server</p>
          </div>
        </div>
      </header>

      <main className="p-6 overflow-y-auto h-full">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Channels"
            value={statsLoading ? "..." : stats.totalChannels.toLocaleString()}
            change={stats.totalChannels > 0 ? {
              value: "12%",
              label: "from last import",
              type: "positive"
            } : undefined}
            icon={Radio}
            iconColor="bg-primary/10 text-primary"
          />

          <StatsCard
            title="Active Streams"
            value={statsLoading ? "..." : stats.activeStreams}
            change={{
              value: stats.activeStreams.toString(),
              label: "active now",
              type: "positive"
            }}
            icon={TrendingUp}
            iconColor="bg-green-500/10 text-green-400"
          />

          <StatsCard
            title="Bandwidth"
            value="142.3 MB/s"
            change={{
              value: "68%",
              label: "capacity used",
              type: "neutral"
            }}
            icon={Monitor}
            iconColor="bg-blue-500/10 text-blue-400"
          />

          <StatsCard
            title="Error Rate"
            value={statsLoading ? "..." : `${stats.errorRate}%`}
            change={{
              value: "2.1%",
              label: "improvement",
              type: "positive"
            }}
            icon={AlertTriangle}
            iconColor="bg-red-500/10 text-red-400"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Xtream Codes Configuration */}
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Xtream Codes Configuration</h3>
                  <p className="text-sm text-muted-foreground">Import channels from your Xtream Codes server</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`status-indicator ${isConnected ? 'status-online' : 'status-offline'}`} />
                  <span className="text-sm text-muted-foreground" data-testid="connection-status">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="server"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="http://servidor.com:8080" 
                            {...field} 
                            data-testid="input-server"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="your_username" 
                              {...field} 
                              data-testid="input-username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              data-testid="input-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="filterAdult"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-filter-adult"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Filter adult content</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={importMutation.isPending}
                    data-testid="button-import-channels"
                  >
                    {importMutation.isPending ? "Importing..." : "Import Channels"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Playlist Management */}
          <Card className="border border-border">
            <CardHeader>
              <h3 className="text-lg font-semibold">Playlist Management</h3>
              <p className="text-sm text-muted-foreground">Generate and download M3U playlists</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {importMutation.isPending && (
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Import Progress</span>
                    <span className="text-sm text-muted-foreground">In progress...</span>
                  </div>
                  <div className="progress-bar h-2">
                    <div className="progress-fill animate-pulse" style={{width: "68%"}} />
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Radio className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Complete Playlist</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-channel-count">
                        {stats.totalChannels.toLocaleString()} channels
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleDownloadPlaylist('all')}
                    disabled={!isConnected || stats.totalChannels === 0}
                    data-testid="button-download-complete"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <Radio className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Family Safe</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-safe-channel-count">
                        {Math.max(0, Math.floor(stats.totalChannels * 0.87)).toLocaleString()} channels
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleDownloadPlaylist('safe')}
                    disabled={!isConnected || stats.totalChannels === 0}
                    data-testid="button-download-safe"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-dashed border-border">
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">Public Access URLs</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Complete Playlist:</p>
                      <p className="text-xs text-muted-foreground break-all bg-background px-3 py-2 rounded" data-testid="text-public-url">
                        {publicUrl}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Family Safe Playlist:</p>
                      <p className="text-xs text-muted-foreground break-all bg-background px-3 py-2 rounded" data-testid="text-safe-public-url">
                        {safePublicUrl}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="mt-2 text-primary hover:text-primary/80 text-sm font-medium"
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      toast({ title: "Copied!", description: "URL copied to clipboard" });
                    }}
                    data-testid="button-copy-url"
                  >
                    Copy Complete URL
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <div className="mt-8">
          <ActivityLogComponent />
        </div>
      </main>
    </>
  );
}
