import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Search,
  Eye,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  subtotal: number | null;
  taxAmount: number | null;
  shippingAmount: number | null;
  total: number | null;
  validUntil: string | null;
  company: {
    name: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  _count?: {
    items: number;
  };
}

interface QuoteStats {
  total: number;
  byStatus: {
    draft: number;
    submitted: number;
    quoted: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
}

const quoteStatusColors: Record<string, string> = {
  DRAFT: 'secondary',
  SUBMITTED: 'default',
  QUOTED: 'default',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  EXPIRED: 'secondary',
};

const quoteStatusIcons: Record<string, any> = {
  DRAFT: FileText,
  SUBMITTED: Clock,
  QUOTED: TrendingUp,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
  EXPIRED: Clock,
};

const formatQuoteStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function QuotesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const pageSize = 20;

  // Fetch quote statistics
  const { data: statsData } = useQuery({
    queryKey: ['quote-statistics'],
    queryFn: async () => {
      const { data } = await api.get('/quotes/statistics');
      return data.data as QuoteStats;
    },
  });

  // Fetch quotes
  const { data, isLoading } = useQuery({
    queryKey: ['quotes', page, searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const { data } = await api.get(`/quotes?${params.toString()}`);
      return data;
    },
  });

  const quotes = data?.data || [];
  const totalPages = Math.ceil((data?.pagination?.total || 0) / pageSize);
  const stats = statsData || {
    total: 0,
    byStatus: {
      draft: 0,
      submitted: 0,
      quoted: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    },
  };

  if (isLoading && !statsData) {
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
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground mt-2">
            Manage quote requests and provide pricing
          </p>
        </div>
        <Button onClick={() => navigate('/admin/quotes/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.submitted}</div>
            <p className="text-xs text-muted-foreground">Awaiting pricing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quoted</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.byStatus.quoted}</div>
            <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.byStatus.accepted}</div>
            <p className="text-xs text-muted-foreground">Ready for order</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by quote number, customer..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="QUOTED">Quoted</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quotes Table */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter ? 'No quotes found' : 'No quotes yet'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote: Quote) => {
                const Icon = quoteStatusIcons[quote.status];
                const isExpired =
                  quote.validUntil && new Date(quote.validUntil) < new Date();

                return (
                  <TableRow key={quote.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {quote.user.firstName} {quote.user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{quote.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{quote.company.name}</TableCell>
                    <TableCell className="text-center">{quote._count?.items || 0}</TableCell>
                    <TableCell className="font-medium">
                      {quote.total ? (
                        `$${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={quoteStatusColors[quote.status] as any}>
                        <Icon className="mr-1 h-3 w-3" />
                        {formatQuoteStatus(quote.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      {quote.validUntil ? (
                        <span
                          className={
                            isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'
                          }
                        >
                          {new Date(quote.validUntil).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.pagination?.total || 0} total quotes)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
