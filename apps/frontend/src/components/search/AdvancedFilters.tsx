import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PriceRangeFilter } from './PriceRangeFilter';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export interface FilterState {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: any) => void;
  searchQuery?: string;
  className?: string;
}

export function AdvancedFilters({
  filters,
  onFilterChange,
  searchQuery,
  className,
}: AdvancedFiltersProps) {
  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.data;
    },
  });

  // Fetch facets for current search
  const { data: facetsData, isLoading: facetsLoading } = useQuery({
    queryKey: ['search-facets', searchQuery, filters.categoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      const { data } = await api.get(`/search/facets?${params}`);
      return data.data;
    },
  });

  const categories = categoriesData || [];
  const facets = facetsData || { categories: [], priceRanges: [], stockStatus: { inStock: 0, outOfStock: 0 } };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Categories */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Categories</Label>
          {facetsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {facets.categories.length > 0 ? (
                facets.categories.map((category: any) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between hover:bg-accent/50 rounded px-2 py-1.5 cursor-pointer"
                    onClick={() =>
                      onFilterChange('categoryId', filters.categoryId === category.id ? undefined : category.id)
                    }
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Checkbox
                        checked={filters.categoryId === category.id}
                        onCheckedChange={(checked) =>
                          onFilterChange('categoryId', checked ? category.id : undefined)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {category.count}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2">No categories found</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Price Range */}
        <PriceRangeFilter
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onApply={(min, max) => {
            onFilterChange('minPrice', min);
            onFilterChange('maxPrice', max);
          }}
        />

        <Separator />

        {/* Stock Status */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Availability</Label>
          <div className="space-y-2">
            <div
              className="flex items-center justify-between hover:bg-accent/50 rounded px-2 py-1.5 cursor-pointer"
              onClick={() => onFilterChange('inStock', filters.inStock === true ? undefined : true)}
            >
              <div className="flex items-center gap-2 flex-1">
                <Checkbox
                  checked={filters.inStock === true}
                  onCheckedChange={(checked) => onFilterChange('inStock', checked ? true : undefined)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm">In Stock</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {facets.stockStatus.inStock}
              </Badge>
            </div>
            <div
              className="flex items-center justify-between hover:bg-accent/50 rounded px-2 py-1.5 cursor-pointer"
              onClick={() => onFilterChange('inStock', filters.inStock === false ? undefined : false)}
            >
              <div className="flex items-center gap-2 flex-1">
                <Checkbox
                  checked={filters.inStock === false}
                  onCheckedChange={(checked) => onFilterChange('inStock', checked ? false : undefined)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm">Out of Stock</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {facets.stockStatus.outOfStock}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Featured */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Featured</Label>
          <div
            className="flex items-center gap-2 hover:bg-accent/50 rounded px-2 py-1.5 cursor-pointer"
            onClick={() => onFilterChange('isFeatured', filters.isFeatured ? undefined : true)}
          >
            <Checkbox
              checked={filters.isFeatured === true}
              onCheckedChange={(checked) => onFilterChange('isFeatured', checked ? true : undefined)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-sm">Featured Products Only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
