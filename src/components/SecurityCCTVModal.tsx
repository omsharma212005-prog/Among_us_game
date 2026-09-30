import React from 'react';
import { Camera, Radio } from 'lucide-react';
import { Character, BotCharacter } from '../types/game';

interface SecurityCCTVModalProps {
  player: Character;
  bots: BotCharacter[];
  onClose: () => void;
}

export const SecurityCCTVModal: React.FC<SecurityCCTVModalProps> = ({ player, bots, onClose }) => {
  const aliveParticipants = [player, ...bots.filter((b) => b.alive)];

  // Group characters by room for the camera feed
  const cams = [
    { id: 'cam1', name: 'CAM 01 // CAFETERIA & ADMIN', rooms: ['Cafeteria', 'Admin'] },
    { id: 'cam2', name: 'CAM 02 // MEDBAY & CORRIDORS', rooms: ['MedBay', 'Corridor'] },
    { id: 'cam3', name: 'CAM 03 // ELECTRICAL & STORAGE', rooms: ['Electrical', 'Storage'] },
    { id: 'cam4', name: 'CAM 04 // REACTOR & ENGINES', rooms: ['Reactor', 'Upper Engine', 'Lower Engine'] },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="font-mono text-sm font-bold text-slate-200 tracking-wider">
              SKELD-9 SECURITY CCTV SYSTEM · LIVE FEED
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
          >
            DISCONNECT [ESC]
          </button>
        </div>

        {/* 4 CCTV Views */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950">
          {cams.map((cam) => {
            const subjectsInCam = aliveParticipants.filter((p) => cam.rooms.includes(p.room));
            return (
              <div
                key={cam.id}
                className="relative bg-slate-900 rounded-lg border border-slate-800 h-44 overflow-hidden flex flex-col justify-between p-3"
              >
                {/* Scanline & static overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

                {/* Cam header */}
                <div className="flex items-center justify-between text-[11px] font-mono z-20">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                    {cam.name}
                  </span>
                  <span className="text-slate-500">FEED 1080P</span>
                </div>

                {/* Detected Crew blips */}
                <div className="flex-1 flex items-center justify-center gap-3 z-20">
                  {subjectsInCam.length === 0 ? (
                    <div className="text-xs font-mono text-slate-600 italic">No movement detected</div>
                  ) : (
                    subjectsInCam.map((sub) => (
                      <div key={sub.id} className="flex flex-col items-center animate-pulse">
                        <div
                          className="w-7 h-9 rounded-t-full rounded-b-md relative border border-white/20 shadow-md"
                          style={{ backgroundColor: sub.color }}
                        >
                          <div className="w-3.5 h-2 bg-cyan-200 rounded-full ml-1 mt-1 border border-cyan-400" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-300 mt-1 font-semibold">{sub.name}</span>
                        <span className="text-[9px] font-mono text-slate-500">[{sub.room}]</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-[10px] font-mono text-slate-600 flex justify-between z-20">
                  <span>REC ● 24 FPS</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-xs font-mono text-slate-500 flex justify-between items-center">
          <span>HINT: Watch for crewmates entering rooms and not coming out, or teleporting via vents!</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5" /> SECURE LINK ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
};
