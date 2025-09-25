import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Radio, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import type { Channel } from "@shared/schema";

export default function Channels() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  // Group channels by category
  const channelGroups = useMemo(() => {
    const groups: Record<string, Channel[]> = {};
    channels.forEach(channel => {
      const group = channel.groupTitle || 'Uncategorized';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(channel);
    });
    return groups;
  }, [channels]);

  // Filter channels based on search term and selected group
  const filteredChannels = useMemo(() => {
    let filtered = channels;
    
    if (selectedGroup) {
      filtered = filtered.filter(channel => channel.groupTitle === selectedGroup);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(channel => 
        channel.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [channels, searchTerm, selectedGroup]);

  const handlePlayChannel = (channel: Channel) => {
    const streamUrl = `${window.location.origin}/api/stream/${channel.id}.m3u8`;
    window.open(streamUrl, '_blank');
  };

  return (
    <>
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Channels</h1>
            <p className="text-muted-foreground">
              Browse and manage your IPTV channels ({channels.length} total)
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 overflow-y-auto h-full">
        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-channels"
            />
          </div>

          {/* Group Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedGroup === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGroup(null)}
              data-testid="filter-all-groups"
            >
              All Groups ({channels.length})
            </Button>
            {Object.entries(channelGroups).map(([group, groupChannels]) => (
              <Button
                key={group}
                variant={selectedGroup === group ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGroup(group)}
                data-testid={`filter-group-${group.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {group} ({groupChannels.length})
              </Button>
            ))}
          </div>
        </div>

        {/* Channel List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted/50 rounded mb-2 w-2/3" />
                  <div className="h-6 bg-muted/30 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No channels found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedGroup 
                ? "Try adjusting your search or filter criteria"
                : "Import channels from your Xtream Codes server to get started"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredChannels.map((channel) => (
              <Card key={channel.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate" title={channel.name} data-testid={`channel-name-${channel.id}`}>
                        {channel.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`channel-group-${channel.id}`}>
                        {channel.groupTitle || 'Uncategorized'}
                      </p>
                    </div>
                    {channel.tvgLogo && (
                      <img 
                        src={channel.tvgLogo} 
                        alt={channel.name}
                        className="w-8 h-8 rounded object-cover ml-2 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <Badge variant="secondary" className="text-xs">
                      {channel.streamType || 'live'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handlePlayChannel(channel)}
                      data-testid={`button-play-${channel.id}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Stream
                    </Button>
                  </div>
                  
                  {channel.tvgId && (
                    <p className="text-xs text-muted-foreground mt-2">
                      EPG ID: {channel.tvgId}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
