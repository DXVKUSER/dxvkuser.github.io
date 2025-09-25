import { Link, useLocation } from "wouter";
import { 
  Monitor, 
  Radio, 
  Settings, 
  FileText 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { ServerConfig } from "@shared/schema";

export default function Sidebar() {
  const [location] = useLocation();
  
  const { data: config } = useQuery<ServerConfig>({
    queryKey: ["/api/config"],
  });

  const navigationItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: Monitor,
    },
    {
      path: "/channels",
      label: "Channels",
      icon: Radio,
    },
    {
      path: "/settings",
      label: "Settings",
      icon: Settings,
    },
    {
      path: "/logs",
      label: "Logs",
      icon: FileText,
    },
  ];

  const isOnline = config?.server;

  return (
    <div className="bg-card border-r border-border w-64 flex-shrink-0 sidebar-transition flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Monitor className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">HLS Proxy</h1>
            <p className="text-sm text-muted-foreground">Manager v2.0</p>
          </div>
        </div>
      </div>
      
      <nav className="px-6 space-y-2 flex-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link 
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              data-testid={`nav-link-${item.label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-6">
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className={cn(
              "status-indicator",
              isOnline ? "status-online" : "status-offline"
            )} />
            <span className="text-sm font-medium">Server Status</span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="server-status">
            {isOnline ? "Online - Port 5000" : "Offline - No Configuration"}
          </p>
        </div>
      </div>
    </div>
  );
}
