import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  DollarSign,
  Package,
  Calendar,
  User,
  Building2,
  Clock,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuoteItem {
  id: string;
  requestedQuantity: number;
  quotedQuantity: number | null;
  quotedUnitPrice: number | null;
  quotedTotalPrice: number | null;
  notes: string | null;
  product: {
    id: string;
    sku: string;
    name: string;
    basePrice: number;
    quantity: number;
    images: Array<{ url: string }>;
  };
}

interface QuoteHistory {
  id: string;
  action: string;
  userName: string | null;
  notes: string | null;
  createdAt: string;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  subtotal: number | null;
  taxAmount: number | null;
  shippingAmount: number | null;
  total: number | null;
  customerNotes: string | null;
  adminNotes: string | null;
  validUntil: string | null;
  acceptedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
  };
  items: QuoteItem[];
  history: QuoteHistory[];
}

export default function QuoteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Pricing state for review mode
  const [itemPricing, setItemPricing] = useState<Record<string, { quantity: number; price: number }>>({});
  const [taxAmount, setTaxAmount] = useState('0');
  const [shippingAmount, setShippingAmount] = useState('0');
  const [adminNotes, setAdminNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');

  // Fetch quote details
  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/${id}`);
      return data.data as Quote;
    },
    enabled: !!id,
  });

  // Initialize pricing when entering review mode
  const handleStartReview = () => {
    if (!quote) return;

    const pricing: Record<string, { quantity: number; price: number }> = {};
    quote.items.forEach((item) => {
      pricing[item.id] = {
        quantity: item.quotedQuantity || item.requestedQuantity,
        price: item.quotedUnitPrice || item.product.basePrice,
      };
    });

    setItemPricing(pricing);
    setTaxAmount(quote.taxAmount?.toString() || '0');
    setShippingAmount(quote.shippingAmount?.toString() || '0');
    setAdminNotes(quote.adminNotes || '');

    // Default valid until: 30 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setValidUntil(defaultDate.toISOString().split('T')[0]);

    setIsReviewMode(true);
  };

  // Submit quote mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/quotes/${id}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote submitted for review');
    },
    onError: () => {
      toast.error('Failed to submit quote');
    },
  });

  // Review quote mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(itemPricing).map(([itemId, pricing]) => ({
        itemId,
        quotedQuantity: pricing.quantity,
        quotedUnitPrice: pricing.price,
      }));

      await api.post(`/quotes/${id}/review`, {
        items,
        taxAmount: parseFloat(taxAmount) || 0,
        shippingAmount: parseFloat(shippingAmount) || 0,
        adminNotes,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-statistics'] });
      toast.success('Quote reviewed and pricing provided');
      setIsReviewMode(false);
    },
    onError: () => {
      toast.error('Failed to review quote');
    },
  });

  // Accept quote mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/quotes/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-statistics'] });
      toast.success('Quote accepted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to accept quote');
    },
  });

  // Reject quote mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/quotes/${id}/reject`, { reason: rejectReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-statistics'] });
      toast.success('Quote rejected');
      setShowRejectDialog(false);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Failed to reject quote');
    },
  });

  if (isLoading || !quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const calculateSubtotal = () => {
    if (isReviewMode) {
      return Object.values(itemPricing).reduce(
        (sum, pricing) => sum + pricing.quantity * pricing.price,
        0
      );
    }
    return quote.subtotal || 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = isReviewMode ? parseFloat(taxAmount) || 0 : quote.taxAmount || 0;
    const shipping = isReviewMode ? parseFloat(shippingAmount) || 0 : quote.shippingAmount || 0;
    return subtotal + tax + shipping;
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date();

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/quotes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quote {quote.quoteNumber}</h1>
            <p className="text-muted-foreground mt-1">
              Created {new Date(quote.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge
          variant={
            quote.status === 'ACCEPTED' ? 'default' :
            quote.status === 'REJECTED' ? 'destructive' :
            'secondary'
          }
          className="text-base px-4 py-2"
        >
          {quote.status}
        </Badge>
      </div>

      {/* Customer & Company Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="font-medium">
                {quote.user.firstName} {quote.user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{quote.user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{quote.company.name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {(quote.customerNotes || quote.adminNotes) && (
        <div className="grid gap-4 md:grid-cols-2">
          {quote.customerNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.customerNotes}</p>
              </CardContent>
            </Card>
          )}

          {quote.adminNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.adminNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items</CardTitle>
            {quote.status === 'SUBMITTED' && !isReviewMode && (
              <Button onClick={handleStartReview}>
                <DollarSign className="mr-2 h-4 w-4" />
                Review & Price
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Requested Qty</TableHead>
                {(quote.status !== 'DRAFT' && quote.status !== 'SUBMITTED') || isReviewMode ? (
                  <>
                    <TableHead className="text-right">Quoted Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.product.images[0] && (
                        <img
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.requestedQuantity}</TableCell>
                  {(quote.status !== 'DRAFT' && quote.status !== 'SUBMITTED') || isReviewMode ? (
                    <>
                      <TableCell className="text-right">
                        {isReviewMode ? (
                          <Input
                            type="number"
                            value={itemPricing[item.id]?.quantity || item.requestedQuantity}
                            onChange={(e) =>
                              setItemPricing({
                                ...itemPricing,
                                [item.id]: {
                                  ...itemPricing[item.id],
                                  quantity: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-24 text-right"
                          />
                        ) : (
                          item.quotedQuantity || '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isReviewMode ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={itemPricing[item.id]?.price || item.product.basePrice}
                            onChange={(e) =>
                              setItemPricing({
                                ...itemPricing,
                                [item.id]: {
                                  ...itemPricing[item.id],
                                  price: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-32 text-right"
                          />
                        ) : item.quotedUnitPrice ? (
                          `$${item.quotedUnitPrice.toFixed(2)}`
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {isReviewMode
                          ? `$${((itemPricing[item.id]?.quantity || 0) *
                              (itemPricing[item.id]?.price || 0)).toFixed(2)}`
                          : item.quotedTotalPrice
                          ? `$${item.quotedTotalPrice.toFixed(2)}`
                          : '-'}
                      </TableCell>
                    </>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      {(quote.status !== 'DRAFT' && quote.status !== 'SUBMITTED') || isReviewMode ? (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isReviewMode && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shipping Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={shippingAmount}
                    onChange={(e) => setShippingAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this quote..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid Until</label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">
                  ${(isReviewMode ? parseFloat(taxAmount) || 0 : quote.taxAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  ${(isReviewMode ? parseFloat(shippingAmount) || 0 : quote.shippingAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            {isReviewMode && (
              <div className="flex gap-2 pt-4">
                <Button onClick={() => setIsReviewMode(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}
                  className="flex-1"
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Save Pricing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Validity & Actions */}
      {quote.validUntil && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Quote Validity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={isExpired ? 'text-destructive font-medium' : ''}>
              Valid until {new Date(quote.validUntil).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {isExpired && ' (Expired)'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!isReviewMode && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {quote.status === 'DRAFT' && (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit for Review
              </Button>
            )}

            {quote.status === 'QUOTED' && !isExpired && (
              <Button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Accept Quote
              </Button>
            )}

            {(quote.status === 'QUOTED' || quote.status === 'SUBMITTED') && (
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Reject Quote
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quote.history.map((entry) => (
              <div key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatAction(entry.action)}</p>
                    <span className="text-sm text-muted-foreground">
                      by {entry.userName || 'System'}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this quote? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Optional: Reason for rejection..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => rejectMutation.mutate()} className="bg-destructive">
              Reject Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
