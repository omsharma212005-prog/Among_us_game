import React, { useEffect, useState } from 'react';
import { sounds } from '../audio/soundEffects';
import { EjectionResult } from '../types/game';

interface EjectionOverlayProps {
  result: EjectionResult;
  onFinish: () => void;
}

export const EjectionOverlay: React.FC<EjectionOverlayProps> = ({ result, onFinish }) => {
  const [displayText, setDisplayText] = useState('');
  const [subText, setSubText] = useState('');
  const [starfield, setStarfield] = useState<{ x: number; y: number; s: number; o: number }[]>([]);

  useEffect(() => {
    sounds.playEject();

    // Generate random stars
    const stars = Array.from({ length: 60 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 2 + 1,
      o: Math.random() * 0.7 + 0.3,
    }));
    setStarfield(stars);

    if (result.skipped) {
      setDisplayText('No one was ejected.');
      setSubText('(Skipped by popular vote)');
    } else if (result.tie) {
      setDisplayText('No one was ejected.');
      setSubText('(Tied vote)');
    } else {
      setDisplayText(`${result.ejectedName} was ejected.`);
      const roleStr = result.role === 'Impostor' ? 'was an Impostor.' : 'was NOT an Impostor.';
      const remainStr = `(${result.impostorsLeft} Impostor${result.impostorsLeft === 1 ? '' : 's'} remain)`;
      setTimeout(() => {
        setSubText(`${result.ejectedName} ${roleStr} ${remainStr}`);
      }, 1500);
    }

    const timer = setTimeout(() => {
      onFinish();
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Moving starfield */}
      {starfield.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.s}px`,
            height: `${star.s}px`,
            opacity: star.o,
          }}
        />
      ))}

      {/* Floating ejected bean */}
      {!result.skipped && !result.tie && (
        <div className="relative animate-[spin_8s_linear_infinite] mb-8">
          <div
            className="w-16 h-22 rounded-t-full rounded-b-2xl relative shadow-2xl border-2 border-white/20 transition-transform duration-1000 scale-90"
            style={{ backgroundColor: result.ejectedColor || '#ef4444' }}
          >
            {/* Visor */}
            <div className="w-10 h-5 bg-cyan-200/90 rounded-full border border-cyan-400 shadow-inner mt-2 ml-2" />
            {/* Backpack */}
            <div
              className="absolute -left-3 top-5 w-3 h-10 rounded-l-md"
              style={{ backgroundColor: result.ejectedColor || '#ef4444', filter: 'brightness(0.8)' }}
            />
          </div>
        </div>
      )}

      {/* Narrative Text */}
      <div className="text-center z-10 space-y-3 px-4">
        <h2 className="text-2xl md:text-3xl font-mono font-bold tracking-widest text-slate-100 drop-shadow-md animate-in fade-in duration-500">
          {displayText}
        </h2>
        {subText && (
          <p className="text-sm md:text-base font-mono text-cyan-400 tracking-wider animate-in fade-in duration-500">
            {subText}
          </p>
        )}
      </div>
    </div>
  );
};
