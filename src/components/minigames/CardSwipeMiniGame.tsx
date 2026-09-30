import React, { useState, useRef } from 'react';
import { sounds } from '../../audio/soundEffects';
import { CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react';

export const CardSwipeMiniGame: React.FC<{ onComplete: () => void; onClose: () => void }> = ({ onComplete, onClose }) => {
  const [cardTaken, setCardTaken] = useState(false);
  const [cardX, setCardX] = useState(0); // 0 to 240
  const [feedback, setFeedback] = useState<string>('PLEASE INSERT CARD');
  const [feedbackType, setFeedbackType] = useState<'idle' | 'success' | 'warn' | 'error'>('idle');
  const [isDone, setIsDone] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = () => {
    if (isDone) return;
    if (!cardTaken) {
      setCardTaken(true);
      setFeedback('SWIPE CARD THROUGH READER');
      sounds.playBeep(false);
      return;
    }
    isDraggingRef.current = true;
    startTimeRef.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || isDone) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(240, e.clientX - rect.left - 50));
    setCardX(relativeX);

    // If reached end
    if (relativeX >= 220 && startTimeRef.current) {
      isDraggingRef.current = false;
      const duration = Date.now() - startTimeRef.current;

      if (duration < 280) {
        // Too fast
        sounds.playAlarm();
        setFeedback('TOO FAST. TRY AGAIN.');
        setFeedbackType('error');
        setCardX(0);
      } else if (duration > 1100) {
        // Too slow
        sounds.playAlarm();
        setFeedback('TOO SLOW. TRY AGAIN.');
        setFeedbackType('warn');
        setCardX(0);
      } else {
        // Just right!
        sounds.playTaskComplete();
        setFeedback('ACCEPTED. THANK YOU.');
        setFeedbackType('success');
        setIsDone(true);
        setTimeout(onComplete, 600);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDone && isDraggingRef.current) {
      isDraggingRef.current = false;
      setCardX(0);
      setFeedback('SWIPE CARD AGAIN');
    }
  };

  return (
    <div
      className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-xl p-6 shadow-2xl select-none"
      onMouseUp={handleMouseUp}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-amber-400 font-mono flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span>SWIPE ADMIN CARD</span>
          </h3>
          <p className="text-xs text-slate-400">Take ID card from wallet and swipe at a moderate speed</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono"
        >
          ESC
        </button>
      </div>

      {/* Reader display */}
      <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-4 text-center">
        <div
          className={`font-mono text-xs tracking-wider font-bold ${
            feedbackType === 'success'
              ? 'text-emerald-400'
              : feedbackType === 'error'
              ? 'text-rose-400'
              : feedbackType === 'warn'
              ? 'text-amber-400'
              : 'text-cyan-400'
          }`}
        >
          {feedback}
        </div>
      </div>

      {/* Card Reader Slot Area */}
      <div
        className="relative bg-slate-950 h-32 rounded-lg border-2 border-slate-800 overflow-hidden cursor-pointer"
        onMouseMove={handleMouseMove}
      >
        {/* Swipe groove */}
        <div className="absolute top-1/2 left-4 right-4 h-2 -translate-y-1/2 bg-black rounded border border-slate-800" />
        <div className="absolute right-6 top-2 text-[10px] font-mono text-slate-600">CARD SCANNER v4.2</div>

        {/* Card */}
        {cardTaken && (
          <div
            onMouseDown={handleMouseDown}
            style={{ transform: `translateX(${cardX}px)` }}
            className="absolute top-4 left-4 w-32 h-20 bg-gradient-to-r from-amber-500 to-amber-600 rounded-md border-2 border-amber-300 p-2 shadow-xl cursor-grab active:cursor-grabbing flex flex-col justify-between"
          >
            <div className="flex justify-between items-center text-[9px] font-bold text-black uppercase">
              <span>SKELD ID</span>
              <span>CREW</span>
            </div>
            <div className="w-8 h-6 bg-slate-800 rounded border border-amber-200" />
            <div className="h-1.5 bg-black/60 rounded" />
          </div>
        )}
      </div>

      {/* Bottom Wallet to pull card from */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
        {!cardTaken ? (
          <button
            onClick={handleMouseDown}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded transition-colors"
          >
            PULL CARD FROM WALLET
          </button>
        ) : (
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between w-full">
            <span>DRAG CARD FROM LEFT TO RIGHT</span>
            {isDone && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> VERIFIED
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
