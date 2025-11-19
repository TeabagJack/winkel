import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Mail,
  ShoppingCart,
  Package,
  AlertTriangle,
  Megaphone,
  Newspaper,
  Loader2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface EmailPreferences {
  id: string;
  userId: string;
  orderConfirmation: boolean;
  orderShipped: boolean;
  orderDelivered: boolean;
  lowStockAlert: boolean;
  promotions: boolean;
  newsletter: boolean;
  createdAt: string;
  updatedAt: string;
}

const preferenceOptions = [
  {
    key: 'orderConfirmation',
    label: 'Order Confirmation',
    description: 'Receive confirmation emails when you place an order',
    icon: ShoppingCart,
  },
  {
    key: 'orderShipped',
    label: 'Order Shipped',
    description: 'Get notified when your order has been shipped',
    icon: Package,
  },
  {
    key: 'orderDelivered',
    label: 'Order Delivered',
    description: 'Receive alerts when your order has been delivered',
    icon: Package,
  },
  {
    key: 'lowStockAlert',
    label: 'Low Stock Alerts',
    description: 'Get notified when products are running low on stock (Admin only)',
    icon: AlertTriangle,
  },
  {
    key: 'promotions',
    label: 'Promotions & Offers',
    description: 'Receive emails about special offers and promotions',
    icon: Megaphone,
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    description: 'Subscribe to our newsletter with product updates and news',
    icon: Newspaper,
  },
];

export default function EmailPreferencesPage() {
  const queryClient = useQueryClient();
  const [localPreferences, setLocalPreferences] = useState<Partial<EmailPreferences>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current preferences
  const { data, isLoading } = useQuery({
    queryKey: ['email-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/email/preferences');
      return data.data as EmailPreferences;
    },
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (data) {
      setLocalPreferences(data);
      setHasChanges(false);
    }
  }, [data]);

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (preferences: Partial<EmailPreferences>) => {
      await api.put('/email/preferences', preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
      toast.success('Email preferences updated successfully');
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to update email preferences');
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    setLocalPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const updates = {
      orderConfirmation: localPreferences.orderConfirmation,
      orderShipped: localPreferences.orderShipped,
      orderDelivered: localPreferences.orderDelivered,
      lowStockAlert: localPreferences.lowStockAlert,
      promotions: localPreferences.promotions,
      newsletter: localPreferences.newsletter,
    };
    updateMutation.mutate(updates);
  };

  const handleReset = () => {
    if (data) {
      setLocalPreferences(data);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Preferences</h1>
          <p className="text-muted-foreground mt-2">
            Manage your email notification settings
          </p>
        </div>
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {preferenceOptions.map((option, index) => {
            const Icon = option.icon;
            const isEnabled = localPreferences[option.key as keyof EmailPreferences] as boolean;

            return (
              <div key={option.key}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{option.label}</p>
                        {option.key === 'lowStockAlert' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled ?? true}
                    onCheckedChange={(checked) => handleToggle(option.key, checked)}
                  />
                </div>
                {index < preferenceOptions.length - 1 && (
                  <Separator className="mt-6" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Summary</CardTitle>
          <CardDescription>
            You will receive the following types of emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {preferenceOptions
              .filter((option) => localPreferences[option.key as keyof EmailPreferences])
              .map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.key}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            {preferenceOptions.filter(
              (option) => localPreferences[option.key as keyof EmailPreferences]
            ).length === 0 && (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No email notifications enabled
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 sticky bottom-6 bg-background p-4 border rounded-lg shadow-lg">
          <p className="text-sm text-muted-foreground mr-auto">
            You have unsaved changes
          </p>
          <Button variant="outline" onClick={handleReset}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
