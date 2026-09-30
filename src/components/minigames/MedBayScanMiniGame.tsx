import React, { useState, useEffect } from 'react';
import { sounds } from '../../audio/soundEffects';
import { Activity, CheckCircle2 } from 'lucide-react';

export const MedBayScanMiniGame: React.FC<{
  playerName: string;
  playerColor: string;
  onComplete: () => void;
  onClose: () => void;
}> = ({ playerName, playerColor, onComplete, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          sounds.playTaskComplete();
          setTimeout(onComplete, 700);
          return 100;
        }
        sounds.playBeep(false);
        return prev + 5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-emerald-400 font-mono flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span>MEDBAY VITAL SCAN</span>
          </h3>
          <p className="text-xs text-slate-400">Please stand steady on the medical scanner pad</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono"
        >
          ESC
        </button>
      </div>

      <div className="relative bg-slate-950 rounded-lg p-5 border border-slate-800 flex flex-col items-center justify-center min-h-[220px] overflow-hidden">
        {/* Holographic scanning line */}
        {isScanning && (
          <div
            className="absolute left-0 right-0 h-1 bg-emerald-400/90 shadow-[0_0_16px_rgba(52,211,153,1)] z-20 pointer-events-none transition-all duration-75"
            style={{ top: `${(progress % 100)}%` }}
          />
        )}

        {/* Scan avatar */}
        <div className="relative my-3 flex flex-col items-center">
          <div
            className="w-20 h-28 rounded-t-full rounded-b-2xl relative shadow-lg flex items-center justify-center border-2 border-white/20"
            style={{ backgroundColor: playerColor }}
          >
            {/* Visor */}
            <div className="w-12 h-6 bg-cyan-200/90 rounded-full border border-cyan-400 shadow-inner mt-2 ml-3" />
            {/* Backpack */}
            <div
              className="absolute -left-3 top-6 w-3 h-14 rounded-l-md"
              style={{ backgroundColor: playerColor, filter: 'brightness(0.8)' }}
            />
          </div>
          {/* Scanner ring */}
          <div className="w-28 h-6 rounded-full border-2 border-emerald-500/60 bg-emerald-500/10 -mt-2 animate-pulse" />
        </div>

        {/* Diagnostic Telemetry */}
        <div className="w-full bg-slate-900/90 rounded border border-slate-800 p-3 mt-3 text-xs font-mono text-slate-300 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">SUBJECT:</span>
            <span className="text-emerald-400 font-semibold">{playerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">BLOOD TYPE:</span>
            <span>O-POSITIVE (STATION STANDARD)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">PARASITIC ACTIVITY:</span>
            <span className="text-emerald-400">NEGATIVE (0.00%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ESTIMATED WEIGHT:</span>
            <span>92 LBS (BEAN SKELETON)</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800">
        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
          <span>SCANNING PROGRESS</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress >= 100 && (
          <div className="mt-2 text-center text-xs font-mono font-bold text-emerald-400 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> SCAN VERIFIED: 100% ORGANIC CREWMATE
          </div>
        )}
      </div>
    </div>
  );
};
