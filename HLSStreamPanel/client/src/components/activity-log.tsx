import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActivityLog } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

export default function ActivityLogComponent() {
  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-400';
      case 'error': return 'bg-red-400';
      case 'warning': return 'bg-yellow-400';
      default: return 'bg-blue-400';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'started': return 'Channel stream started';
      case 'stopped': return 'Channel stream stopped';
      case 'error': return 'Stream error';
      case 'import': return 'Channel import';
      case 'filter': return 'Adult content filtered';
      default: return action;
    }
  };

  return (
    <Card className="border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Live server logs and streaming activity</p>
          </div>
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary/80 text-sm font-medium"
            data-testid="button-view-all-logs"
          >
            View All Logs
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="w-2 h-2 rounded-full bg-muted animate-pulse mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted/50 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No activity logs available</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-4" data-testid={`log-item-${log.id}`}>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(log.status)} mt-2 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{getActionLabel(log.action)}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {log.details || (log.channelName ? `${log.channelName}${log.userIp ? ` - User: ${log.userIp}` : ''}` : 'System activity')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
