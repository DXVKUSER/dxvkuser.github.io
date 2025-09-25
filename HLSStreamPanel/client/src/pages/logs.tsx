import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import type { StreamLog } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery<StreamLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.channelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      
      return matchesSearch && matchesStatus && matchesAction;
    });
  }, [logs, searchTerm, statusFilter, actionFilter]);

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default" as const,
      error: "destructive" as const,
      warning: "secondary" as const,
      info: "outline" as const,
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status}
      </Badge>
    );
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      started: "Stream Started",
      stopped: "Stream Stopped",
      error: "Stream Error",
      import: "Channel Import",
      filter: "Content Filter",
      connection: "Connection Event",
    };
    
    return labels[action] || action.charAt(0).toUpperCase() + action.slice(1);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
  };

  const handleExport = () => {
    const csvContent = [
      "Timestamp,Action,Channel,Details,User IP,Status",
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.action}","${log.channelName || ''}","${log.details || ''}","${log.userIp || ''}","${log.status}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hls_proxy_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  return (
    <>
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Activity Logs</h1>
            <p className="text-muted-foreground">
              View streaming activity and system events ({logs.length} total entries)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              data-testid="button-refresh-logs"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              data-testid="button-export-logs"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 overflow-y-auto h-full">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-logs"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger data-testid="select-action-filter">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {getActionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <Filter className="h-4 w-4 mr-2" />
                {filteredLogs.length} of {logs.length} entries
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-16 h-6 bg-muted animate-pulse rounded" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-3 bg-muted/50 animate-pulse rounded w-2/3" />
                    </div>
                    <div className="w-20 h-4 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No logs found</h3>
              <p className="text-muted-foreground">
                {logs.length === 0 
                  ? "No activity logs available yet. Start using the proxy to see logs here."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors" data-testid={`log-entry-${log.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusBadge(log.status)}
                          <h4 className="font-medium" data-testid={`log-action-${log.id}`}>
                            {getActionLabel(log.action)}
                          </h4>
                          <span className="text-sm text-muted-foreground" data-testid={`log-timestamp-${log.id}`}>
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        
                        {log.channelName && (
                          <p className="text-sm font-medium text-primary mb-1" data-testid={`log-channel-${log.id}`}>
                            {log.channelName}
                          </p>
                        )}
                        
                        {log.details && (
                          <p className="text-sm text-muted-foreground mb-2" data-testid={`log-details-${log.id}`}>
                            {log.details}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}</span>
                          {log.userIp && (
                            <span data-testid={`log-ip-${log.id}`}>IP: {log.userIp}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
