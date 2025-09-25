export interface Stats {
  totalChannels: number;
  activeStreams: number;
  errorRate: number;
  lastImport?: string;
  bandwidth?: string;
}

export interface ActivityLog {
  id: string;
  channelId?: string;
  channelName?: string;
  action: string;
  details?: string;
  userIp?: string;
  timestamp: string;
  status: 'info' | 'warning' | 'error' | 'success';
}
