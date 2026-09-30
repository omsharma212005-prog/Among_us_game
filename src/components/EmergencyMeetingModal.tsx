import React, { useState, useEffect, useRef } from 'react';
import { sounds } from '../audio/soundEffects';
import { BotCharacter, Character, MeetingMessage, Role, EjectionResult } from '../types/game';
import { Siren, Send, MessageSquare, AlertCircle, ShieldAlert, Check } from 'lucide-react';

interface EmergencyMeetingModalProps {
  reason: 'Report Body' | 'Emergency Meeting';
  reporterName: string;
  deadPlayerName?: string | null;
  deadBodyLocation?: string | null;
  player: Character;
  bots: BotCharacter[];
  onVoteComplete: (result: EjectionResult) => void;
}

export const EmergencyMeetingModal: React.FC<EmergencyMeetingModalProps> = ({
  reason,
  reporterName,
  deadPlayerName,
  deadBodyLocation,
  player,
  bots,
  onVoteComplete,
}) => {
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [targetBotId, setTargetBotId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [phase, setPhase] = useState<'deliberation' | 'voting' | 'tallied'>('deliberation');
  const [playerVote, setPlayerVote] = useState<number | 'skip' | null>(null);
  const [botVotes, setBotVotes] = useState<Record<number, { target: number | 'skip'; reason: string }>>({});
  const [timer, setTimer] = useState(75); // 75 second timer
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Initial sound and statements fetch
  useEffect(() => {
    sounds.playAlarm();

    const initialMsg: MeetingMessage = {
      id: 'init-sys',
      speakerName: 'Station Protocol',
      speakerColor: '#ef4444',
      isSystem: true,
      text: deadPlayerName
        ? `🚨 DEAD BODY REPORTED! ${reporterName} discovered ${deadPlayerName}'s body in ${deadBodyLocation || 'the corridors'}.`
        : `🚨 EMERGENCY MEETING called by ${reporterName}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([initialMsg]);

    // Fetch opening statements from server
    async function loadStatements() {
      setIsGenerating(true);
      try {
        const res = await fetch('/api/meeting/statements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason,
            reporterName,
            deadBodyLocation,
            deadPlayerName,
            bots,
            player,
          }),
        });
        const data = await res.json();
        if (data.statements && Array.isArray(data.statements)) {
          const newMsgs: MeetingMessage[] = data.statements.map((s: { botId: number; statement: string }) => {
            const b = bots.find((bot) => bot.id === s.botId);
            return {
              id: `msg-${s.botId}-${Date.now()}-${Math.random()}`,
              speakerId: s.botId,
              speakerName: b ? b.name : 'Crewmate',
              speakerColor: b ? b.color : '#38bdf8',
              text: s.statement,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          });

          // Add messages sequentially with small delay for realistic chat feel
          for (let i = 0; i < newMsgs.length; i++) {
            await new Promise((r) => setTimeout(r, 600));
            sounds.playBeep(false);
            setMessages((prev) => [...prev, newMsgs[i]]);
          }
        }
      } catch (err) {
        console.error('Failed to load opening statements:', err);
      } finally {
        setIsGenerating(false);
      }
    }

    loadStatements();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase === 'tallied') return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          if (phase === 'deliberation') setPhase('voting');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Handle player sending text in chat
  const handleSendMessage = async (msgText: string, specificTargetId?: number | null) => {
    const textToSend = msgText.trim();
    if (!textToSend || isGenerating) return;

    sounds.playBeep(true);
    const userMsg: MeetingMessage = {
      id: `user-${Date.now()}`,
      speakerName: `${player.name} (You)`,
      speakerColor: player.color,
      isPlayer: true,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsGenerating(true);

    try {
      const activeTarget = specificTargetId !== undefined ? specificTargetId : targetBotId;
      const res = await fetch('/api/meeting/interrogate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: textToSend,
          targetBotId: activeTarget,
          bots,
          player,
          meetingHistory: messages.slice(-6).map((m) => ({ speaker: m.speakerName, text: m.text })),
        }),
      });

      const data = await res.json();
      if (data.response) {
        sounds.playBeep(false);
        const replyMsg: MeetingMessage = {
          id: `reply-${Date.now()}`,
          speakerId: data.responderId,
          speakerName: data.responderName || 'Suspect',
          speakerColor: data.responderColor || '#ef4444',
          text: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, replyMsg]);
      }
    } catch (err) {
      console.error('Failed to get interrogation reply:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Cast Player Vote
  const handleCastPlayerVote = async (target: number | 'skip') => {
    if (playerVote !== null || phase === 'tallied') return;
    sounds.playWireSnap();
    setPlayerVote(target);

    // Call server to retrieve bots' votes
    setIsGenerating(true);
    const aliveBots = bots.filter((b) => b.alive);
    const candidates = [
      { id: player.id, name: player.name },
      ...aliveBots.map((b) => ({ id: b.id, name: b.name })),
    ];

    try {
      const res = await fetch('/api/meeting/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bots: aliveBots,
          candidates,
          discussionSummary: messages.slice(-5).map((m) => `${m.speakerName}: ${m.text}`).join('; '),
        }),
      });
      const data = await res.json();
      const resolvedBotVotes = data.votes || {};
      setBotVotes(resolvedBotVotes);

      // Transition to tallied phase after 1 second
      setTimeout(() => {
        setPhase('tallied');
        tallyAllVotes(target, resolvedBotVotes);
      }, 1200);
    } catch (err) {
      console.error('Failed to get bot votes:', err);
      setPhase('tallied');
      tallyAllVotes(target, {});
    } finally {
      setIsGenerating(false);
    }
  };

  // Compute final verdict from votes
  const tallyAllVotes = (
    myVote: number | 'skip',
    resolvedBotVotes: Record<number, { target: number | 'skip'; reason: string }>
  ) => {
    const voteCounts: Record<string, number> = {};

    // Register player's vote
    const myKey = String(myVote);
    voteCounts[myKey] = (voteCounts[myKey] || 0) + 1;

    // Register bots' votes
    Object.values(resolvedBotVotes).forEach((v) => {
      const key = String(v.target);
      voteCounts[key] = (voteCounts[key] || 0) + 1;
    });

    // Find highest vote getter
    let maxVotes = 0;
    let winner: string | null = null;
    let isTie = false;

    Object.entries(voteCounts).forEach(([candidate, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winner = candidate;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    });

    // Count surviving impostors
    const currentImpostorBots = bots.filter((b) => b.alive && b.role === 'Impostor').length;
    const playerIsImpostor = player.role === 'Impostor' && player.alive;
    let totalImpostors = currentImpostorBots + (playerIsImpostor ? 1 : 0);

    setTimeout(() => {
      if (isTie || winner === 'skip' || winner === null) {
        onVoteComplete({
          ejectedName: null,
          role: null,
          skipped: winner === 'skip',
          tie: isTie,
          impostorsLeft: totalImpostors,
        });
      } else {
        const winnerId = Number(winner);
        if (winnerId === player.id) {
          // Player was voted out!
          const remaining = totalImpostors - (player.role === 'Impostor' ? 1 : 0);
          onVoteComplete({
            ejectedName: player.name,
            ejectedColor: player.color,
            role: player.role,
            skipped: false,
            tie: false,
            impostorsLeft: Math.max(0, remaining),
          });
        } else {
          // A bot was voted out
          const targetBot = bots.find((b) => b.id === winnerId);
          const wasImpostor = targetBot?.role === 'Impostor';
          const remaining = totalImpostors - (wasImpostor ? 1 : 0);
          onVoteComplete({
            ejectedName: targetBot ? targetBot.name : 'Unknown',
            ejectedColor: targetBot?.color,
            role: targetBot ? targetBot.role : 'Crew',
            skipped: false,
            tie: false,
            impostorsLeft: Math.max(0, remaining),
          });
        }
      }
    }, 3000);
  };

  const aliveBots = bots.filter((b) => b.alive);
  const allLivingParticipants = [
    { id: player.id, name: player.name, color: player.color, isPlayer: true, alive: player.alive },
    ...bots.map((b) => ({ id: b.id, name: b.name, color: b.color, isPlayer: false, alive: b.alive })),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-900 border-2 border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 px-6 py-3 border-b border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center animate-pulse">
              <Siren className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold font-mono tracking-wider text-rose-400 uppercase flex items-center gap-2">
                <span>{reason.toUpperCase()}</span>
                {deadPlayerName && <span className="text-slate-400 text-xs">({deadPlayerName} Eliminated)</span>}
              </h2>
              <div className="text-xs text-slate-400 font-mono">
                Reported by <span className="text-slate-200 font-semibold">{reporterName}</span>
                {deadBodyLocation && (
                  <>
                    {' '}
                    · Location: <span className="text-amber-400 font-semibold">{deadBodyLocation}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-500 mr-1">TIMER:</span>
              <span className={`font-bold ${timer <= 15 ? 'text-rose-400 animate-ping' : 'text-cyan-400'}`}>
                {timer}s
              </span>
            </div>
            {phase === 'deliberation' && (
              <button
                onClick={() => setPhase('voting')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
              >
                PROCEED TO VOTE
              </button>
            )}
          </div>
        </div>

        {/* Crew Roster Seat Grid */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 px-4 py-3 flex gap-2 md:gap-4 overflow-x-auto justify-start md:justify-center items-center">
          {allLivingParticipants.map((member) => {
            const isMe = member.id === player.id;
            const isSelected = targetBotId === member.id;
            return (
              <button
                key={member.id}
                onClick={() => !isMe && member.alive && setTargetBotId(member.id)}
                disabled={isMe || !member.alive}
                className={`relative flex flex-col items-center p-2 rounded-xl border transition-all ${
                  !member.alive
                    ? 'opacity-40 border-slate-800 grayscale cursor-not-allowed'
                    : isSelected
                    ? 'border-cyan-400 bg-cyan-950/40 scale-105 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 cursor-pointer'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center relative shadow-md"
                  style={{ backgroundColor: member.color }}
                >
                  <div className="w-5 h-3 bg-cyan-200/90 rounded-full border border-cyan-400 ml-1.5 -mt-1" />
                  {!member.alive && (
                    <div className="absolute inset-0 bg-rose-950/80 rounded-full flex items-center justify-center text-rose-400 font-bold text-xs">
                      DEAD
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-mono mt-1 font-semibold text-slate-200">
                  {member.name} {isMe ? '(You)' : ''}
                </span>
                {isSelected && (
                  <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider">Interrogating</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area: Chat Feed on Left, Voting & Quick Accusations on Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[360px] overflow-hidden">
          {/* Discussion Terminal (8 cols) */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800/80 mb-3">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>COMMS FREQUENCY // DELIBERATION STREAM</span>
              </span>
              {isGenerating && <span className="text-cyan-400 animate-pulse text-[11px]">AI Crewmates Thinking...</span>}
            </div>

            {/* Scrollable Chat Area */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-2.5 pr-2 max-h-[280px] md:max-h-[340px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-xl border text-xs font-mono leading-relaxed transition-all ${
                    m.isSystem
                      ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                      : m.isPlayer
                      ? 'bg-cyan-950/30 border-cyan-800/40 text-cyan-100 ml-4'
                      : 'bg-slate-900 border-slate-800/80 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.speakerColor }} />
                      <strong className="font-bold text-slate-100">{m.speakerName}</strong>
                    </div>
                    <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                  </div>
                  <p className="text-slate-300 pl-4">{m.text}</p>
                </div>
              ))}
              {isGenerating && (
                <div className="p-2 text-xs font-mono text-cyan-400/80 italic flex items-center gap-2 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Formulating station alibi and response...
                </div>
              )}
            </div>

            {/* Player Input Area */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
              {/* Quick Speech Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono text-slate-400">
                <span className="shrink-0 text-slate-500">Quick:</span>
                {[
                  'Where was everyone?',
                  'I was fixing wiring!',
                  'Who was near the crime scene?',
                  'Red is looking very sus!',
                  'Yellow, what was your task?',
                ].map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => handleSendMessage(phrase)}
                    disabled={isGenerating}
                    className="shrink-0 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    "{phrase}"
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isGenerating}
                  placeholder={
                    targetBotId
                      ? `Interrogate ${bots.find((b) => b.id === targetBotId)?.name}...`
                      : 'Accuse or interrogate a crewmate...'
                  }
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isGenerating}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold font-mono text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Speak</span>
                </button>
              </form>
            </div>
          </div>

          {/* Voting Station (4 cols) */}
          <div className="md:col-span-5 lg:col-span-4 p-4 flex flex-col bg-slate-900/60 justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>CAST EJECTION VOTE</span>
                </h3>
                {playerVote !== null && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> VOTE RECORDED
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 font-mono mb-3">
                Select a suspect to eject into deep space, or vote skip if evidence is inconclusive.
              </p>

              {/* Candidate Buttons */}
              <div className="space-y-2">
                {/* Alive Bots */}
                {aliveBots.map((bot) => {
                  const isVoted = playerVote === bot.id;
                  const votesAgainst = Object.values(botVotes).filter((v) => v.target === bot.id).length;
                  return (
                    <button
                      key={bot.id}
                      onClick={() => handleCastPlayerVote(bot.id)}
                      disabled={playerVote !== null || phase === 'tallied'}
                      className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isVoted
                          ? 'border-rose-500 bg-rose-950/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                          : 'border-slate-800 hover:border-rose-900/60 bg-slate-950/60 hover:bg-slate-900 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full border border-white/20"
                          style={{ backgroundColor: bot.color }}
                        />
                        <span className="text-xs font-mono font-semibold text-slate-200">{bot.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {phase === 'tallied' && votesAgainst > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                            {votesAgainst + (playerVote === bot.id ? 1 : 0)} votes
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${
                            isVoted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          VOTE
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Self vote (allowed in Among Us) */}
                <button
                  onClick={() => handleCastPlayerVote(player.id)}
                  disabled={playerVote !== null || phase === 'tallied' || !player.alive}
                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                    playerVote === player.id
                      ? 'border-rose-500 bg-rose-950/40'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="text-xs font-mono font-semibold text-slate-200">{player.name} (You)</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${
                      playerVote === player.id ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    VOTE
                  </span>
                </button>
              </div>
            </div>

            {/* Skip Vote Button */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleCastPlayerVote('skip')}
                disabled={playerVote !== null || phase === 'tallied'}
                className={`w-full py-2.5 rounded-lg border font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  playerVote === 'skip'
                    ? 'border-amber-400 bg-amber-500 text-slate-950'
                    : 'border-slate-700 hover:border-amber-400/80 bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                }`}
              >
                <span>SKIP VOTE</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
