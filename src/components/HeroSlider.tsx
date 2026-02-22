import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import heroBurger from '@/assets/hero-burger.jpg';
import heroAcai from '@/assets/hero-acai.jpg';
import heroFries from '@/assets/hero-fries.jpg';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const fallbackSlides = [
  { image: heroBurger, alt: 'Hambúrguer artesanal', mobileImage: null, showShadow: true, showGlow: false, showOverlayText: false, overlayText: '', roundedCorners: false },
  { image: heroAcai, alt: 'Açaí cremoso', mobileImage: null, showShadow: true, showGlow: false, showOverlayText: false, overlayText: '', roundedCorners: false },
  { image: heroFries, alt: 'Batata frita crocante', mobileImage: null, showShadow: true, showGlow: false, showOverlayText: false, overlayText: '', roundedCorners: false },
];

interface Slide {
  image: string;
  alt: string;
  mobileImage: string | null;
  showShadow: boolean;
  showGlow: boolean;
  showOverlayText: boolean;
  overlayText: string;
  roundedCorners: boolean;
}

const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const { data } = await (supabase as any)
          .from('hero_slides')
          .select('image_url, alt, mobile_image_url, show_shadow, show_glow, show_overlay_text, overlay_text, rounded_corners')
          .eq('is_active', true)
          .order('sort_order');

        if (data && data.length > 0) {
          setSlides(data.map((s: any) => ({
            image: s.image_url,
            alt: s.alt,
            mobileImage: s.mobile_image_url || null,
            showShadow: s.show_shadow ?? true,
            showGlow: s.show_glow ?? false,
            showOverlayText: s.show_overlay_text ?? false,
            overlayText: s.overlay_text || '',
            roundedCorners: s.rounded_corners ?? false,
          })));
        } else {
          setSlides(fallbackSlides);
        }
      } catch (e) {
        setSlides(fallbackSlides);
      }
      setLoading(false);
    };
    fetchSlides();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);

  if (slides.length === 0) return null;

  return (
    <section className={cn("relative h-[40vh] md:h-[50vh] overflow-hidden")}>
      {slides.map((slide, index) => {
        const imgSrc = isMobile && slide.mobileImage ? slide.mobileImage : slide.image;

        return (
          <div
            key={index}
            className={cn(
              'absolute inset-0 transition-all duration-700 ease-in-out',
              index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105',
              slide.roundedCorners && 'mx-4 my-2 rounded-2xl',
            )}
          >
            <img
              src={imgSrc}
              alt={slide.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : 'low'}
              className={cn("w-full h-full object-cover", slide.roundedCorners && 'rounded-2xl')}
            />
            {/* Shadow gradient */}
            {slide.showShadow && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            )}
            {/* Glow border */}
            {slide.showGlow && (
              <div className={cn(
                "absolute inset-0 ring-2 ring-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.3)]",
                slide.roundedCorners && 'rounded-2xl'
              )} />
            )}
            {/* Overlay text */}
            {slide.showOverlayText && slide.overlayText && (
              <div className="absolute inset-0 flex items-end justify-center pb-16 z-[5]">
                <h2 className="text-2xl md:text-4xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] text-center px-4">
                  {slide.overlayText}
                </h2>
              </div>
            )}
          </div>
        );
      })}

      {/* Navigation Arrows */}
      <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 z-10" aria-label="Slide anterior">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 z-10" aria-label="Próximo slide">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              index === currentSlide ? 'gradient-burger w-6' : 'bg-foreground/30 hover:bg-foreground/50'
            )}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSlider;
