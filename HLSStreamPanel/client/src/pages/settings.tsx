import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Server, Shield, Download, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { ServerConfig } from "@shared/schema";
import type { Stats } from "@/lib/types";

export default function Settings() {
  const { toast } = useToast();
  const [proxySettings, setProxySettings] = useState({
    enableProxy: true,
    maxRetries: 3,
    timeoutSeconds: 30,
    chunkSize: 16384,
  });

  const { data: config } = useQuery<ServerConfig>({
    queryKey: ["/api/config"],
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const clearChannelsMutation = useMutation({
    mutationFn: async () => {
      // We'll implement this endpoint if needed
      return apiRequest("DELETE", "/api/channels");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "All channels have been cleared",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear channels",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure your HLS proxy server settings</p>
          </div>
        </div>
      </header>

      <main className="p-6 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Server Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Server Configuration</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Current server settings and connection information
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Xtream Codes Server</Label>
                  <Input
                    value={config?.server || "Not configured"}
                    disabled
                    className="mt-1"
                    data-testid="input-configured-server"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Username</Label>
                  <Input
                    value={config?.username || "Not configured"}
                    disabled
                    className="mt-1"
                    data-testid="input-configured-username"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-muted-foreground">
                    {config?.server ? "Connected and configured" : "Not connected"}
                  </p>
                </div>
                <Badge variant={config?.server ? "default" : "secondary"} data-testid="badge-connection-status">
                  {config?.server ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Proxy Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Proxy Settings</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure HLS proxy behavior and performance settings
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable HLS Proxy</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable the HLS streaming proxy
                  </p>
                </div>
                <Switch
                  checked={proxySettings.enableProxy}
                  onCheckedChange={(checked) =>
                    setProxySettings(prev => ({ ...prev, enableProxy: checked }))
                  }
                  data-testid="switch-enable-proxy"
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    value={proxySettings.maxRetries}
                    onChange={(e) =>
                      setProxySettings(prev => ({
                        ...prev,
                        maxRetries: parseInt(e.target.value) || 3
                      }))
                    }
                    min="1"
                    max="10"
                    className="mt-1"
                    data-testid="input-max-retries"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of retry attempts for failed segments
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={proxySettings.timeoutSeconds}
                    onChange={(e) =>
                      setProxySettings(prev => ({
                        ...prev,
                        timeoutSeconds: parseInt(e.target.value) || 30
                      }))
                    }
                    min="5"
                    max="120"
                    className="mt-1"
                    data-testid="input-timeout"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Request timeout in seconds
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="chunkSize">Chunk Size (bytes)</Label>
                  <Input
                    id="chunkSize"
                    type="number"
                    value={proxySettings.chunkSize}
                    onChange={(e) =>
                      setProxySettings(prev => ({
                        ...prev,
                        chunkSize: parseInt(e.target.value) || 16384
                      }))
                    }
                    min="1024"
                    max="65536"
                    step="1024"
                    className="mt-1"
                    data-testid="input-chunk-size"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Data chunk size for streaming
                  </p>
                </div>
              </div>
              
              <Button className="w-full md:w-auto" data-testid="button-save-proxy-settings">
                Save Proxy Settings
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Security & Filtering</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Content filtering and security options
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Adult Content Filter</p>
                  <p className="text-sm text-muted-foreground">
                    Currently {config?.filterAdult ? "enabled" : "disabled"}
                  </p>
                </div>
                <Badge 
                  variant={config?.filterAdult ? "default" : "secondary"}
                  data-testid="badge-adult-filter-status"
                >
                  {config?.filterAdult ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Filtered keywords include: adult, sex, porn, xxx, and related terms.</p>
                <p>This setting can be changed when importing channels from the Dashboard.</p>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Data Management</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage your channel data and settings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="font-medium mb-1">Total Channels</p>
                  <p className="text-2xl font-bold" data-testid="text-total-channels">
                    {stats?.totalChannels || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Imported channels in database
                  </p>
                </div>
                
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="font-medium mb-1">Last Import</p>
                  <p className="text-lg font-bold" data-testid="text-last-import">
                    {stats?.lastImport 
                      ? new Date(stats.lastImport).toLocaleDateString()
                      : "Never"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Most recent channel import
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" data-testid="button-export-config">
                  <Download className="h-4 w-4 mr-2" />
                  Export Configuration
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={() => clearChannelsMutation.mutate()}
                  disabled={clearChannelsMutation.isPending || !stats?.totalChannels}
                  data-testid="button-clear-channels"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {clearChannelsMutation.isPending ? "Clearing..." : "Clear All Channels"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
