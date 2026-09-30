import React, { useState } from 'react';
import { sounds } from '../../audio/soundEffects';
import { Zap, CheckCircle2 } from 'lucide-react';

export const DivertPowerMiniGame: React.FC<{
  targetRoom: string;
  onComplete: () => void;
  onClose: () => void;
}> = ({ targetRoom, onComplete, onClose }) => {
  const [sliderVal, setSliderVal] = useState(0); // 0 to 100
  const [isDiverted, setIsDiverted] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderVal(val);
    sounds.playBeep(false);

    if (val >= 95 && !isDiverted) {
      setIsDiverted(true);
      sounds.playTaskComplete();
      setTimeout(onComplete, 600);
    }
  };

  return (
    <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-amber-400 font-mono flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>DIVERT POWER: {targetRoom.toUpperCase()}</span>
          </h3>
          <p className="text-xs text-slate-400">Push the primary breaker switch to maximum to redirect auxiliary power</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono"
        >
          ESC
        </button>
      </div>

      <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 flex flex-col items-center justify-center gap-4 my-2">
        <div className="flex justify-between items-center w-full px-4 text-xs font-mono">
          <span className="text-slate-500">STANDBY (0%)</span>
          <span className={`font-bold ${isDiverted ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isDiverted ? 'OVERLOAD / ACTIVE (100%)' : `${sliderVal}%`}
          </span>
        </div>

        {/* Visual Slider Container */}
        <div className="w-full px-4">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderVal}
            onChange={handleSliderChange}
            disabled={isDiverted}
            className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
          />
        </div>

        {/* Gauge readout */}
        <div className="w-full grid grid-cols-5 gap-2 px-4 mt-2">
          {[20, 40, 60, 80, 100].map((step) => (
            <div
              key={step}
              className={`h-3 rounded-sm transition-all duration-200 ${
                sliderVal >= step
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">BREAKER STATUS: {isDiverted ? 'ONLINE' : 'PENDING'}</span>
        {isDiverted && (
          <span className="text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" /> POWER DIVERTED
          </span>
        )}
      </div>
    </div>
  );
};
