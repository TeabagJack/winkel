import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface PriceRangeFilterProps {
  minPrice?: number;
  maxPrice?: number;
  onApply: (min?: number, max?: number) => void;
  className?: string;
}

export function PriceRangeFilter({
  minPrice,
  maxPrice,
  onApply,
  className,
}: PriceRangeFilterProps) {
  const [min, setMin] = useState<string>(minPrice?.toString() || '');
  const [max, setMax] = useState<string>(maxPrice?.toString() || '');

  useEffect(() => {
    setMin(minPrice?.toString() || '');
    setMax(maxPrice?.toString() || '');
  }, [minPrice, maxPrice]);

  const handleApply = () => {
    const minVal = min ? parseFloat(min) : undefined;
    const maxVal = max ? parseFloat(max) : undefined;

    if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
      // Swap if min > max
      onApply(maxVal, minVal);
    } else {
      onApply(minVal, maxVal);
    }
  };

  const handleClear = () => {
    setMin('');
    setMax('');
    onApply(undefined, undefined);
  };

  const hasValues = min || max;

  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-3 block">Price Range</Label>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="min-price" className="text-xs text-muted-foreground">
              Min
            </Label>
            <Input
              id="min-price"
              type="number"
              placeholder="0"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              min={0}
              step={0.01}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="max-price" className="text-xs text-muted-foreground">
              Max
            </Label>
            <Input
              id="max-price"
              type="number"
              placeholder="Any"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              min={0}
              step={0.01}
              className="mt-1"
            />
          </div>
        </div>

        {hasValues && (
          <div className="text-xs text-muted-foreground">
            {min && max
              ? `${formatCurrency(parseFloat(min))} - ${formatCurrency(parseFloat(max))}`
              : min
              ? `From ${formatCurrency(parseFloat(min))}`
              : max
              ? `Up to ${formatCurrency(parseFloat(max))}`
              : ''}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleApply} size="sm" className="flex-1">
            Apply
          </Button>
          {hasValues && (
            <Button onClick={handleClear} variant="outline" size="sm" className="flex-1">
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
