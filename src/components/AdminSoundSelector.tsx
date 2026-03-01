import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Volume2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SoundOption {
  id: string;
  name: string;
  play: () => void;
}

const createTonePlayer = (frequencies: [number, number, number], type: OscillatorType = 'sine') => {
  return () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = type;
        const start = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch (e) {
      console.warn('Audio error:', e);
    }
  };
};

const createChimePlayer = () => {
  return () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'triangle';
        const start = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch (e) {
      console.warn('Audio error:', e);
    }
  };
};

const createUrgentPlayer = () => {
  return () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      for (let r = 0; r < 3; r++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1000;
        osc.type = 'square';
        const start = ctx.currentTime + r * 0.2;
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
        osc.start(start);
        osc.stop(start + 0.1);
      }
    } catch (e) {
      console.warn('Audio error:', e);
    }
  };
};

const createBellPlayer = () => {
  return () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      [800, 1200].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const start = ctx.currentTime + i * 0.3;
        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.5);
        osc.start(start);
        osc.stop(start + 0.5);
      });
    } catch (e) {
      console.warn('Audio error:', e);
    }
  };
};

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'classic', name: '🔔 Clássico', play: createTonePlayer([880, 1100, 1320]) },
  { id: 'chime', name: '🎵 Chime', play: createChimePlayer() },
  { id: 'urgent', name: '🚨 Urgente', play: createUrgentPlayer() },
  { id: 'bell', name: '🛎️ Sino', play: createBellPlayer() },
  { id: 'soft', name: '🎶 Suave', play: createTonePlayer([440, 554, 659], 'triangle') },
  { id: 'alert', name: '⚡ Alerta', play: createTonePlayer([1200, 900, 1200], 'sawtooth') },
];

export const getSelectedSoundId = (): string => {
  return localStorage.getItem('admin-alert-sound') || 'classic';
};

export const playSelectedSound = () => {
  const id = getSelectedSoundId();
  const sound = SOUND_OPTIONS.find(s => s.id === id);
  (sound || SOUND_OPTIONS[0]).play();
};

const AdminSoundSelector = () => {
  const [selected, setSelected] = useState(getSelectedSoundId);

  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    localStorage.setItem('admin-alert-sound', id);
    const sound = SOUND_OPTIONS.find(s => s.id === id);
    sound?.play();
  }, []);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-primary" />
        Som de Alerta de Pedidos
      </Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SOUND_OPTIONS.map((sound) => (
          <button
            key={sound.id}
            onClick={() => handleSelect(sound.id)}
            className={cn(
              'flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200',
              selected === sound.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/40 text-foreground'
            )}
          >
            <span>{sound.name}</span>
            {selected === sound.id && <Check className="w-4 h-4 ml-1 flex-shrink-0" />}
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const sound = SOUND_OPTIONS.find(s => s.id === selected);
          sound?.play();
        }}
        className="gap-2"
      >
        <Volume2 className="w-4 h-4" /> Testar som atual
      </Button>
    </div>
  );
};

export default AdminSoundSelector;
