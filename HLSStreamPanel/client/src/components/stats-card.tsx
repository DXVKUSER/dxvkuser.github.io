import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    label: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  icon: LucideIcon;
  iconColor: string;
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  iconColor 
}: StatsCardProps) {
  return (
    <Card className="p-6 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 ${iconColor} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {change && (
        <div className="mt-4 flex items-center text-sm">
          <span className={
            change.type === 'positive' ? 'text-green-400' :
            change.type === 'negative' ? 'text-red-400' :
            'text-blue-400'
          }>
            {change.type === 'positive' && '↑ '}
            {change.type === 'negative' && '↓ '}
            {change.value}
          </span>
          <span className="text-muted-foreground ml-2">{change.label}</span>
        </div>
      )}
    </Card>
  );
}
