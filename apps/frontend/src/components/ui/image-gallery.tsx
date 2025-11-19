import { useState } from 'react';
import { Star, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface ImageGalleryProps {
  images: ProductImage[];
  onDelete: (imageId: string) => Promise<void>;
  onSetPrimary: (imageId: string) => Promise<void>;
  className?: string;
}

export function ImageGallery({ images, onDelete, onSetPrimary, className }: ImageGalleryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const handleDeleteClick = (imageId: string) => {
    setImageToDelete(imageId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!imageToDelete) return;

    setDeletingId(imageToDelete);
    try {
      await onDelete(imageToDelete);
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    } catch (error) {
      // Error handled by parent
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    setSettingPrimaryId(imageId);
    try {
      await onSetPrimary(imageId);
    } catch (error) {
      // Error handled by parent
    } finally {
      setSettingPrimaryId(null);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className={cn('text-center py-12 border border-dashed rounded-lg', className)}>
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No images uploaded yet</p>
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
        {sortedImages.map((image) => (
          <div key={image.id} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
              <img
                src={image.url}
                alt={image.altText}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Primary badge */}
            {image.isPrimary && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Primary
              </div>
            )}

            {/* Action buttons */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {!image.isPrimary && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleSetPrimary(image.id)}
                  disabled={settingPrimaryId === image.id}
                  title="Set as primary"
                >
                  {settingPrimaryId === image.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDeleteClick(image.id)}
                disabled={deletingId === image.id}
                title="Delete image"
              >
                {deletingId === image.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Loading overlay */}
            {(deletingId === image.id || settingPrimaryId === image.id) && (
              <div className="absolute inset-0 bg-black/20 rounded-lg" />
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
