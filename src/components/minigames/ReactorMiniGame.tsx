import React, { useState, useEffect } from 'react';
import { sounds } from '../../audio/soundEffects';
import { CheckCircle2 } from 'lucide-react';

export const ReactorMiniGame: React.FC<{ onComplete: () => void; onClose: () => void }> = ({ onComplete, onClose }) => {
  const SEQUENCE_LENGTH = 4;
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [activeFlash, setActiveFlash] = useState<number | null>(null);
  const [isPlayingSeq, setIsPlayingSeq] = useState(false);
  const [stage, setStage] = useState(1);
  const MAX_STAGES = 2;
  const [isSuccess, setIsSuccess] = useState(false);

  // Generate sequence for current stage
  useEffect(() => {
    startStage(stage);
  }, [stage]);

  const startStage = (currentStage: number) => {
    const len = currentStage + 2; // stage 1 has 3 items, stage 2 has 4
    const newSeq: number[] = [];
    for (let i = 0; i < len; i++) {
      newSeq.push(Math.floor(Math.random() * 9));
    }
    setSequence(newSeq);
    setPlayerInput([]);
    setIsPlayingSeq(true);

    // Playback sequence
    newSeq.forEach((padIdx, i) => {
      setTimeout(() => {
        setActiveFlash(padIdx);
        sounds.playBeep(true);
        setTimeout(() => setActiveFlash(null), 300);

        if (i === newSeq.length - 1) {
          setTimeout(() => setIsPlayingSeq(false), 350);
        }
      }, (i + 1) * 550);
    });
  };

  const handlePadPress = (idx: number) => {
    if (isPlayingSeq || isSuccess) return;

    sounds.playBeep(false);
    const nextInput = [...playerInput, idx];
    setPlayerInput(nextInput);

    const step = nextInput.length - 1;
    if (nextInput[step] !== sequence[step]) {
      // Wrong! Reset stage
      sounds.playAlarm();
      setPlayerInput([]);
      setIsPlayingSeq(true);
      setTimeout(() => startStage(stage), 600);
      return;
    }

    // Check if completed this stage
    if (nextInput.length === sequence.length) {
      if (stage < MAX_STAGES) {
        sounds.playWireSnap();
        setStage((s) => s + 1);
      } else {
        setIsSuccess(true);
        sounds.playTaskComplete();
        setTimeout(onComplete, 600);
      }
    }
  };

  return (
    <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-cyan-400 font-mono flex items-center gap-2">
            <span>CALIBRATE REACTOR</span>
          </h3>
          <p className="text-xs text-slate-400">Memorize and repeat the light pattern (Stage {stage}/{MAX_STAGES})</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono"
        >
          ESC
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 my-2">
        {/* Memory Display (Left) */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 mb-2 text-center uppercase tracking-wider">Pattern Screen</div>
          <div className="grid grid-cols-3 gap-2 aspect-square">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={`screen-${idx}`}
                className={`rounded border border-slate-800 transition-colors duration-150 ${
                  activeFlash === idx ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] border-cyan-300' : 'bg-slate-900/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Input Keypad (Right) */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 mb-2 text-center uppercase tracking-wider">
            {isPlayingSeq ? 'Wait...' : 'Enter Sequence'}
          </div>
          <div className="grid grid-cols-3 gap-2 aspect-square">
            {Array.from({ length: 9 }).map((_, idx) => (
              <button
                key={`pad-${idx}`}
                disabled={isPlayingSeq || isSuccess}
                onClick={() => handlePadPress(idx)}
                className={`rounded border text-xs font-mono font-bold transition-all active:scale-95 ${
                  isPlayingSeq
                    ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-cyan-600/30 hover:border-cyan-500 cursor-pointer'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400">
          Progress: {playerInput.length} / {sequence.length}
        </span>
        {isSuccess && (
          <span className="text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" /> CALIBRATION COMPLETE
          </span>
        )}
      </div>
    </div>
  );
};
