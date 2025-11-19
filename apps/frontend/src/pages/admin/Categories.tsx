import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { toast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  FolderTree,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  _count?: {
    products: number;
    children: number;
  };
  children?: Category[];
}

export default function CategoriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.data as Category[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Category deleted',
        description: 'Category has been deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete category',
      });
    },
  });

  const handleDelete = (category: Category) => {
    if (category._count && category._count.products > 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete',
        description: 'Category has products. Please reassign or remove products first.',
      });
      return;
    }

    if (category._count && category._count.children > 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete',
        description: 'Category has subcategories. Please delete subcategories first.',
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Build hierarchical structure
  const buildCategoryTree = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: create map
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };

  const filterCategories = (categories: Category[], search: string): Category[] => {
    if (!search) return categories;
    const lowerSearch = search.toLowerCase();

    return categories.filter(cat => {
      const matchesSearch =
        cat.name.toLowerCase().includes(lowerSearch) ||
        cat.slug.toLowerCase().includes(lowerSearch) ||
        cat.description?.toLowerCase().includes(lowerSearch);

      const childMatches = cat.children && filterCategories(cat.children, search).length > 0;

      return matchesSearch || childMatches;
    });
  };

  const renderCategoryRow = (category: Category, level = 0): JSX.Element[] => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    const rows: JSX.Element[] = [
      <TableRow key={category.id} className="hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren && (
              <button
                onClick={() => toggleExpand(category.id)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{category.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">{category.slug}</TableCell>
        <TableCell>
          <Badge variant={category.isActive ? 'default' : 'secondary'}>
            {category.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </TableCell>
        <TableCell className="text-center">{category._count?.products || 0}</TableCell>
        <TableCell className="text-center">{category._count?.children || 0}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/admin/categories/${category.id}`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(category)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/categories/new?parent=${category.id}`)}
            >
              Add Sub
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ];

    // Add children if expanded
    if (hasChildren && isExpanded) {
      category.children!.forEach(child => {
        rows.push(...renderCategoryRow(child, level + 1));
      });
    }

    return rows;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const categoryTree = categories ? buildCategoryTree(categories) : [];
  const filteredTree = filterCategories(categoryTree, searchTerm);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-2">
            Organize your products with hierarchical categories
          </p>
        </div>
        <Button onClick={() => navigate('/admin/categories/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Products</TableHead>
              <TableHead className="text-center">Subcategories</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTree.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FolderTree className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No categories found' : 'No categories yet'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => navigate('/admin/categories/new')} className="mt-2">
                        Create your first category
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTree.flatMap(category => renderCategoryRow(category))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
