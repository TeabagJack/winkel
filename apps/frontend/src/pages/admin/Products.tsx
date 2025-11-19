import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdvancedFilters } from '@/components/search/AdvancedFilters';
import { FilterChips, ActiveFilter } from '@/components/search/FilterChips';
import { useSearch } from '@/hooks/useSearch';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Loader2, Package, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);

  // Use the search hook
  const {
    products,
    pagination,
    isLoading,
    filters,
    activeFilterCount,
    updateFilter,
    clearFilters,
    clearFilter,
    setPage,
  } = useSearch();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      toast({
        title: 'Product deleted',
        description: 'Product has been successfully deleted',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete product',
      });
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string, quantity: number) => {
    if (status === 'ACTIVE' && quantity > 0) {
      return <Badge className="bg-green-500 text-white">Active</Badge>;
    }
    if (status === 'OUT_OF_STOCK' || quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (status === 'INACTIVE') {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  // Build active filters for chips
  const activeFilters: ActiveFilter[] = [];
  if (filters.search) {
    activeFilters.push({ key: 'search', label: 'Search', value: filters.search });
  }
  if (filters.categoryId) {
    activeFilters.push({ key: 'categoryId', label: 'Category', value: 'Selected' });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const displayValue = `${filters.minPrice ? formatCurrency(filters.minPrice) : '0'} - ${
      filters.maxPrice ? formatCurrency(filters.maxPrice) : '∞'
    }`;
    activeFilters.push({ key: 'price', label: 'Price', value: '', displayValue });
  }
  if (filters.inStock !== undefined) {
    activeFilters.push({
      key: 'inStock',
      label: 'Stock',
      value: filters.inStock ? 'In Stock' : 'Out of Stock',
    });
  }
  if (filters.isFeatured) {
    activeFilters.push({ key: 'isFeatured', label: 'Featured', value: 'Yes' });
  }

  const handleRemoveFilter = (key: string) => {
    if (key === 'price') {
      updateFilter('minPrice', undefined);
      updateFilter('maxPrice', undefined);
    } else {
      clearFilter(key as any);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-2">
            Manage your product catalog and inventory
          </p>
        </div>
        <Button onClick={() => navigate('/admin/products/new')} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedFilters
                filters={filters}
                onFilterChange={updateFilter}
                searchQuery={filters.search}
              />
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Card className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Catalog</CardTitle>
                  <CardDescription>{pagination.total || 0} products total</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showFilters ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={filters.search || ''}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {activeFilters.length > 0 && (
                <FilterChips
                  filters={activeFilters}
                  onRemove={handleRemoveFilter}
                  onClearAll={clearFilters}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !products?.length ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No products found</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {activeFilterCount > 0
                    ? 'Try adjusting your filters'
                    : 'Get started by adding your first product'}
                </p>
                {activeFilterCount > 0 ? (
                  <Button onClick={clearFilters} variant="outline" className="mt-4">
                    Clear all filters
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/admin/products/new')} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.images?.[0] ? (
                                <img
                                  src={product.images[0].url}
                                  alt={product.name}
                                  className="h-10 w-10 rounded-md object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{product.name}</div>
                                {product.isFeatured && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    Featured
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>{product.category?.name || '-'}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(Number(product.basePrice))}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                product.quantity === 0
                                  ? 'text-destructive font-medium'
                                  : product.quantity < (product.lowStockAlert || 10)
                                  ? 'text-yellow-600 font-medium'
                                  : ''
                              }
                            >
                              {product.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(product.status, product.quantity)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/admin/products/${product.id}`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(product.id, product.name)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, pagination.page - 1))}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
