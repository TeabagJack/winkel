import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export interface ActiveFilter {
  key: string;
  label: string;
  value: any;
  displayValue?: string;
}

interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function FilterChips({ filters, onRemove, onClearAll, className }: FilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Active filters:</span>
        {filters.map((filter) => (
          <Badge key={filter.key} variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1">
            <span className="text-xs">
              {filter.label}: {filter.displayValue || formatFilterValue(filter.value)}
            </span>
            <button
              onClick={() => onRemove(filter.key)}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-sm p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {filters.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

function formatFilterValue(value: any): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return formatCurrency(value);
  }
  return String(value);
}
