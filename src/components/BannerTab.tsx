import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, Image as ImageIcon, GripVertical, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface HeroSlide {
  id: string;
  image_url: string;
  alt: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const SortableSlide = ({ slide, onDelete, onToggle }: { slide: HeroSlide; onDelete: (id: string) => void; onToggle: (id: string, active: boolean) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-4 bg-card border border-border rounded-xl p-3 transition-all',
        isDragging && 'opacity-50 shadow-lg',
        !slide.is_active && 'opacity-60'
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="w-24 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <img src={slide.image_url} alt={slide.alt} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{slide.alt || 'Sem descrição'}</p>
        <p className="text-xs text-muted-foreground">Ordem: {slide.sort_order}</p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(slide.id, !slide.is_active)}
          title={slide.is_active ? 'Desativar' : 'Ativar'}
        >
          {slide.is_active ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(slide.id)} className="hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const BannerTab = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('hero_slides')
      .select('*')
      .order('sort_order')
      .order('created_at');
    if (error) {
      console.error('Error fetching slides:', error);
    }
    setSlides(data || []);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const handleUpload = async () => {
    if (!imageFile) {
      toast({ title: 'Selecione uma imagem', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = imageFile.name.split('.').pop();
      const path = `slides/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, imageFile);
      if (uploadError) {
        toast({ title: 'Erro ao enviar imagem', description: uploadError.message, variant: 'destructive' });
        return;
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);

      const { error: insertError } = await (supabase as any).from('hero_slides').insert({
        image_url: urlData.publicUrl,
        alt: altText.trim() || 'Banner',
        sort_order: slides.length,
      });

      if (insertError) {
        toast({ title: 'Erro ao salvar slide', description: insertError.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Slide adicionado!' });
      setImageFile(null);
      setPreview(null);
      setAltText('');
      fetchSlides();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('hero_slides').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Slide removido!' });
    fetchSlides();
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    const { error } = await (supabase as any).from('hero_slides').update({ is_active }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    fetchSlides();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(slides, oldIndex, newIndex);
    setSlides(reordered);

    const updates = reordered.map((slide, idx) =>
      (supabase as any).from('hero_slides').update({ sort_order: idx }).eq('id', slide.id)
    );
    await Promise.all(updates);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Upload Form */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Adicionar Slide
        </h3>
        <div className="space-y-4">
          {preview && (
            <div className="w-full h-40 rounded-xl overflow-hidden bg-muted">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors text-sm text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
                {imageFile ? imageFile.name : 'Escolher imagem...'}
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <Input
              placeholder="Descrição (ex: Hambúrguer artesanal)"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="flex-1 bg-background border-border"
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={!imageFile || uploading}
            className="gradient-burger text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            {uploading ? 'Enviando...' : 'Adicionar Slide'}
          </Button>
        </div>
      </div>

      {/* Slides List */}
      {slides.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {slides.map((slide) => (
                <SortableSlide
                  key={slide.id}
                  slide={slide}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum slide cadastrado</p>
          <p className="text-sm mt-1">Adicione imagens para o slider da vitrine</p>
        </div>
      )}
    </div>
  );
};

export default BannerTab;
