import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingDown,
  Package,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';

interface InventoryAlert {
  id: string;
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'REORDER_POINT';
  threshold: number;
  currentValue: number;
  isResolved: boolean;
  createdAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    quantity: number;
    lowStockAlert: number;
  };
}

interface Analytics {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  totalAlerts: number;
  recentMovements: number;
  movementsByType: {
    type: string;
    count: number;
  }[];
}

interface RestockRecommendation {
  productId: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  lowStockThreshold: number;
  alertType: string;
  recommendedOrderQty: number;
}

const alertTypeColors: Record<string, any> = {
  LOW_STOCK: 'default',
  OUT_OF_STOCK: 'destructive',
  REORDER_POINT: 'secondary',
};

const alertTypeIcons: Record<string, any> = {
  LOW_STOCK: AlertTriangle,
  OUT_OF_STOCK: AlertCircle,
  REORDER_POINT: TrendingDown,
};

const formatAlertType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function InventoryAlertsPage() {
  const queryClient = useQueryClient();
  const [alertTypeFilter, setAlertTypeFilter] = useState('');

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['inventory-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/analytics');
      return data.data as Analytics;
    },
  });

  // Fetch active alerts
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['inventory-alerts', alertTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (alertTypeFilter) params.append('alertType', alertTypeFilter);

      const { data } = await api.get(`/inventory/alerts?${params.toString()}`);
      return data.data as InventoryAlert[];
    },
  });

  // Fetch restock recommendations
  const { data: restockData } = useQuery({
    queryKey: ['restock-recommendations'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/restock-recommendations');
      return data.data as RestockRecommendation[];
    },
  });

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await api.post(`/inventory/alerts/${alertId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-analytics'] });
      toast.success('Alert resolved successfully');
    },
    onError: () => {
      toast.error('Failed to resolve alert');
    },
  });

  // Run inventory check mutation
  const runCheckMutation = useMutation({
    mutationFn: async () => {
      await api.post('/inventory/check');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-analytics'] });
      toast.success('Inventory check completed');
    },
    onError: () => {
      toast.error('Failed to run inventory check');
    },
  });

  const alerts = alertsData || [];
  const analytics = analyticsData || {
    totalProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    totalAlerts: 0,
    recentMovements: 0,
    movementsByType: [],
  };
  const restockRecommendations = restockData || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Alerts</h1>
          <p className="text-muted-foreground mt-2">
            Monitor stock levels and manage inventory alerts
          </p>
        </div>
        <Button
          onClick={() => runCheckMutation.mutate()}
          disabled={runCheckMutation.isPending}
        >
          {runCheckMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Inventory Check
            </>
          )}
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products with inventory tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {analytics.outOfStock}
            </div>
            <p className="text-xs text-muted-foreground">
              Products with zero inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {analytics.lowStock}
            </div>
            <p className="text-xs text-muted-foreground">
              Products below threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Unresolved inventory alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={alertTypeFilter}
          onValueChange={(value) => setAlertTypeFilter(value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Alert Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Alert Types</SelectItem>
            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
            <SelectItem value="REORDER_POINT">Reorder Point</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>
            Inventory alerts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-12 w-12 text-green-500" />
                      <p className="text-muted-foreground">
                        {alertTypeFilter
                          ? 'No alerts found for this filter'
                          : 'No active alerts - all inventory levels are healthy!'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => {
                  const Icon = alertTypeIcons[alert.alertType];
                  return (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge variant={alertTypeColors[alert.alertType]}>
                          <Icon className="mr-1 h-3 w-3" />
                          {formatAlertType(alert.alertType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {alert.product.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {alert.product.sku}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span
                          className={
                            alert.currentValue === 0
                              ? 'text-destructive'
                              : alert.currentValue <= alert.threshold
                              ? 'text-yellow-600'
                              : ''
                          }
                        >
                          {alert.currentValue}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {alert.threshold}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveAlertMutation.mutate(alert.id)}
                          disabled={resolveAlertMutation.isPending}
                        >
                          {resolveAlertMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Resolve
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Restock Recommendations */}
      {restockRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Restock Recommendations</CardTitle>
            <CardDescription>
              Suggested products to reorder based on current stock levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead className="text-right">Recommended Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restockRecommendations.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          item.currentStock === 0
                            ? 'text-destructive font-medium'
                            : 'text-yellow-600 font-medium'
                        }
                      >
                        {item.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.lowStockThreshold}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-medium text-green-600">
                          {item.recommendedOrderQty}
                        </span>
                        <Button variant="ghost" size="icon" title="Add to order">
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
