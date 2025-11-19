import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
}

export default function CategoryForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const parentIdFromQuery = searchParams.get('parent');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: parentIdFromQuery || '',
    isActive: true,
  });

  // Fetch all categories for parent selection
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.data as Category[];
    },
  });

  // Fetch category if editing
  const { data: category, isLoading: isLoadingCategory } = useQuery({
    queryKey: ['category', id],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${id}`);
      return data.data as Category;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        parentId: category.parentId || '',
        isActive: category.isActive ?? true,
      });
    }
  }, [category]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return await api.put(`/categories/${id}`, data);
      } else {
        return await api.post('/categories', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: isEdit ? 'Category updated' : 'Category created',
        description: `Category has been ${isEdit ? 'updated' : 'created'} successfully`,
      });
      navigate('/admin/categories');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save category',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      parentId: formData.parentId || null,
      description: formData.description || null,
    };

    saveMutation.mutate(payload);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from name
    if (field === 'name' && !isEdit) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  // Filter out current category and its descendants from parent options
  const getAvailableParents = (): Category[] => {
    if (!categories) return [];
    if (!isEdit) return categories;

    // Build a set of IDs to exclude (current category and its descendants)
    const excludeIds = new Set<string>([id!]);

    const addDescendants = (parentId: string) => {
      categories.forEach(cat => {
        if (cat.parentId === parentId) {
          excludeIds.add(cat.id);
          addDescendants(cat.id);
        }
      });
    };

    addDescendants(id!);

    return categories.filter(cat => !excludeIds.has(cat.id));
  };

  if (isEdit && isLoadingCategory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const availableParents = getAvailableParents();

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/categories')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? 'Edit Category' : 'Create Category'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEdit ? 'Update category information' : 'Add a new category to organize products'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Category Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                placeholder="Electronics"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                required
                placeholder="electronics"
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and hyphens allowed"
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier (lowercase, numbers, and hyphens only)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                placeholder="Brief description of the category..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => handleChange('parentId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Root Category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Root Category)</SelectItem>
                  {availableParents?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a parent category to create a subcategory
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (visible to customers)
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/categories')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? 'Update Category' : 'Create Category'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
