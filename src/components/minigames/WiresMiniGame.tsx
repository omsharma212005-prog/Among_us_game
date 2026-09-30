import React, { useState } from 'react';
import { sounds } from '../../audio/soundEffects';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface Wire {
  color: string;
  name: string;
  leftIndex: number;
  rightIndex: number;
}

const WIRE_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Pink', hex: '#ec4899' },
];

export const WiresMiniGame: React.FC<{ onComplete: () => void; onClose: () => void }> = ({ onComplete, onClose }) => {
  // Randomize positions on mount
  const [leftOrder] = useState<string[]>(() => [...WIRE_COLORS.map((c) => c.hex)].sort(() => Math.random() - 0.5));
  const [rightOrder] = useState<string[]>(() => [...WIRE_COLORS.map((c) => c.hex)].sort(() => Math.random() - 0.5));

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [connections, setConnections] = useState<Record<number, number>>({}); // leftIdx -> rightIdx
  const [sparks, setSparks] = useState<number | null>(null);

  const handleLeftClick = (index: number) => {
    sounds.playBeep(false);
    setSelectedLeft(index);
  };

  const handleRightClick = (rightIdx: number) => {
    if (selectedLeft === null) return;
    const leftColor = leftOrder[selectedLeft];
    const rightColor = rightOrder[rightIdx];

    if (leftColor === rightColor) {
      sounds.playWireSnap();
      setSparks(rightIdx);
      setTimeout(() => setSparks(null), 400);

      const next = { ...connections, [selectedLeft]: rightIdx };
      setConnections(next);
      setSelectedLeft(null);

      // Check if all 4 are connected
      if (Object.keys(next).length === 4) {
        sounds.playTaskComplete();
        setTimeout(onComplete, 500);
      }
    } else {
      sounds.playBeep(true);
      // Wrong wire
      setSelectedLeft(null);
    }
  };

  return (
    <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-amber-400 font-mono flex items-center gap-2">
            <span>ELECTRICAL WIRING</span>
          </h3>
          <p className="text-xs text-slate-400">Connect matching wire colors from left to right terminals</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono"
        >
          ESC
        </button>
      </div>

      <div className="relative flex justify-between items-center py-4 px-2 min-h-[220px]">
        {/* Left Terminals */}
        <div className="flex flex-col gap-6 z-10">
          {leftOrder.map((color, idx) => {
            const isConnected = connections[idx] !== undefined;
            const isSelected = selectedLeft === idx;
            return (
              <button
                key={`left-${idx}`}
                onClick={() => !isConnected && handleLeftClick(idx)}
                disabled={isConnected}
                className={`flex items-center gap-2 group transition-transform ${isConnected ? 'opacity-80' : 'cursor-pointer hover:scale-105'}`}
              >
                <div
                  className="w-10 h-6 rounded-l border-2 border-slate-700 flex items-center justify-center font-bold text-[10px] text-black shadow-inner"
                  style={{ backgroundColor: color }}
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    isSelected ? 'ring-4 ring-cyan-400 scale-125' : ''
                  }`}
                  style={{ backgroundColor: color, borderColor: '#ffffff' }}
                />
              </button>
            );
          })}
        </div>

        {/* SVG Drawing for connected wires */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {Object.entries(connections).map(([leftIdxStr, rightIdx]) => {
            const leftIdx = Number(leftIdxStr);
            const color = leftOrder[leftIdx];
            const y1 = 44 + leftIdx * 48;
            const y2 = 44 + rightIdx * 48;
            return (
              <path
                key={`wire-${leftIdx}`}
                d={`M 60 ${y1} C 160 ${y1}, 240 ${y2}, 340 ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                className="drop-shadow-md"
              />
            );
          })}
        </svg>

        {/* Right Terminals */}
        <div className="flex flex-col gap-6 z-10">
          {rightOrder.map((color, idx) => {
            const isConnected = Object.values(connections).includes(idx);
            const isSparking = sparks === idx;
            return (
              <button
                key={`right-${idx}`}
                onClick={() => handleRightClick(idx)}
                disabled={isConnected}
                className={`flex items-center gap-2 group transition-transform ${isConnected ? 'opacity-80' : 'cursor-pointer hover:scale-105'}`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    isSparking ? 'ring-8 ring-amber-300 animate-ping' : ''
                  }`}
                  style={{ backgroundColor: color, borderColor: '#ffffff' }}
                />
                <div
                  className="w-10 h-6 rounded-r border-2 border-slate-700 flex items-center justify-center font-bold text-[10px] text-black shadow-inner"
                  style={{ backgroundColor: color }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Connected: {Object.keys(connections).length}/4</span>
        {Object.keys(connections).length === 4 && (
          <span className="text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" /> WIRING REPAIRED
          </span>
        )}
      </div>
    </div>
  );
};
