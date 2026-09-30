/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StationCanvas } from './components/StationCanvas';
import { EmergencyMeetingModal } from './components/EmergencyMeetingModal';
import { EjectionOverlay } from './components/EjectionOverlay';
import { SecurityCCTVModal } from './components/SecurityCCTVModal';
import { WiresMiniGame } from './components/minigames/WiresMiniGame';
import { ReactorMiniGame } from './components/minigames/ReactorMiniGame';
import { MedBayScanMiniGame } from './components/minigames/MedBayScanMiniGame';
import { CardSwipeMiniGame } from './components/minigames/CardSwipeMiniGame';
import { DivertPowerMiniGame } from './components/minigames/DivertPowerMiniGame';
import { sounds } from './audio/soundEffects';
import { Character, BotCharacter, DeadBody, TaskDef, VentDef, Role, EjectionResult } from './types/game';
import { ROOMS, VENTS, INITIAL_TASKS, getRoomAtPoint } from './game/mapData';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Radio,
  Skull,
  Crosshair,
  Wind,
  Camera,
  Play,
  Sparkles,
  Info,
} from 'lucide-react';

const INITIAL_BOTS_DATA: Omit<BotCharacter, 'x' | 'y' | 'room' | 'facing' | 'isMoving' | 'animFrame'>[] = [
  {
    id: 1,
    name: 'Red',
    color: '#ef4444',
    r: 14,
    speed: 1.8,
    alive: true,
    role: 'Impostor',
    personality: 'Aggressive and defensive, shifts blame immediately, claims he was fixing electrical wiring.',
    killCooldown: 22,
  },
  {
    id: 2,
    name: 'Green',
    color: '#22c55e',
    r: 14,
    speed: 1.6,
    alive: true,
    role: 'Crew',
    personality: 'Analytical tech-nerd, tracks player coordinates, claims he was monitoring MedBay scans.',
    killCooldown: 99,
  },
  {
    id: 3,
    name: 'Yellow',
    color: '#eab308',
    r: 14,
    speed: 1.5,
    alive: true,
    role: 'Crew',
    personality: 'Anxious and timid, sticks to corners, claims innocence because he was terrified in Reactor.',
    killCooldown: 99,
  },
  {
    id: 4,
    name: 'Purple',
    color: '#a855f7',
    r: 14,
    speed: 1.7,
    alive: true,
    role: 'Crew',
    personality: 'Blunt detective, demands exact timestamps and room logs, interrogates the first person who speaks.',
    killCooldown: 99,
  },
  {
    id: 5,
    name: 'Pink',
    color: '#ec4899',
    r: 14,
    speed: 1.6,
    alive: true,
    role: 'Crew',
    personality: 'Friendly and observant, remembers who was with whom, claims she was checking Shields.',
    killCooldown: 99,
  },
  {
    id: 6,
    name: 'Orange',
    color: '#f97316',
    r: 14,
    speed: 1.6,
    alive: true,
    role: 'Crew',
    personality: 'Paranoid and suspicious, watches corridors closely, ready to vote on the slightest contradiction.',
    killCooldown: 99,
  },
];

export default function App() {
  // Player state
  const [playerRole, setPlayerRole] = useState<Role>('Crew');
  const [player, setPlayer] = useState<Character>({
    id: 0,
    name: 'Cyan',
    color: '#38bdf8',
    x: 480,
    y: 130,
    r: 14,
    speed: 2.9,
    alive: true,
    role: 'Crew',
    room: 'Cafeteria',
    facing: 'right',
    isMoving: false,
    animFrame: 0,
    inVent: false,
    currentVentId: null,
  });

  const [playerKillCooldown, setPlayerKillCooldown] = useState(25);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Bots state
  const [bots, setBots] = useState<BotCharacter[]>(() =>
    INITIAL_BOTS_DATA.map((b, idx) => {
      const room = ROOMS[idx % ROOMS.length];
      return {
        ...b,
        x: room.x + 40 + (idx * 25) % (room.w - 80),
        y: room.y + 40 + (idx * 20) % (room.h - 80),
        room: room.name,
        facing: 'right',
        isMoving: false,
        animFrame: 0,
      };
    })
  );

  // Station State
  const [tasks, setTasks] = useState<TaskDef[]>(INITIAL_TASKS);
  const [deadBodies, setDeadBodies] = useState<DeadBody[]>([]);
  const [logs, setLogs] = useState<string[]>([
    '[System]: Skeld-9 station protocol activated. Complete tasks or isolate suspects.',
  ]);

  // Modals & Events
  const [activeMiniGame, setActiveMiniGame] = useState<TaskDef | null>(null);
  const [meetingState, setMeetingState] = useState<{
    active: boolean;
    reason: 'Report Body' | 'Emergency Meeting';
    reporterName: string;
    deadPlayerName?: string | null;
    deadBodyLocation?: string | null;
  } | null>(null);

  const [ejectionResult, setEjectionResult] = useState<EjectionResult | null>(null);
  const [showCCTV, setShowCCTV] = useState(false);
  const [gameOver, setGameOver] = useState<{ winner: 'Crew' | 'Impostor'; reason: string } | null>(null);

  // Keys ref
  const keysRef = useRef<Record<string, boolean>>({});

  // Sound toggle
  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const addLog = (text: string) => {
    setLogs((prev) => [...prev.slice(-25), text]);
  };

  // Switch role setup
  const handleSelectRole = (newRole: Role) => {
    setPlayerRole(newRole);
    setPlayer((prev) => ({ ...prev, role: newRole }));

    // If player is Impostor, set Red to Crew, otherwise Red is Impostor
    setBots((prev) =>
      prev.map((b) => ({
        ...b,
        role: newRole === 'Impostor' ? 'Crew' : b.id === 1 ? 'Impostor' : 'Crew',
      }))
    );
    addLog(`[Protocol]: Role configured as ${newRole.toUpperCase()}.`);
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;

      // Interaction shortcut keys
      if (meetingState || activeMiniGame || ejectionResult || gameOver) return;

      if (k === 'e' || k === ' ') {
        handleUseAction();
      } else if (k === 'r') {
        handleReportAction();
      } else if (k === 'q' && player.role === 'Impostor' && player.alive) {
        handleKillAction();
      } else if (k === 'v' && player.role === 'Impostor' && player.alive) {
        handleVentAction();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [player, bots, deadBodies, tasks, meetingState, activeMiniGame, ejectionResult, gameOver, playerKillCooldown]);

  // Kill cooldown timer
  useEffect(() => {
    if (meetingState || gameOver) return;
    const interval = setInterval(() => {
      setPlayerKillCooldown((cd) => (cd > 0 ? cd - 1 : 0));
      setBots((prev) =>
        prev.map((b) => (b.killCooldown > 0 ? { ...b, killCooldown: b.killCooldown - 1 } : b))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [meetingState, gameOver]);

  // Proximity calculations
  const activeTaskNearby = tasks.find(
    (t) => !t.done && Math.hypot(player.x - t.x, player.y - t.y) < 32
  ) || null;

  const activeVentNearby = VENTS.find(
    (v) => Math.hypot(player.x - v.x, player.y - v.y) < 34
  ) || null;

  const bodyNearby = deadBodies.find(
    (b) => Math.hypot(player.x - b.x, player.y - b.y) < 45
  ) || null;

  const cafe = ROOMS.find((r) => r.id === 'cafeteria');
  const isNearEmergencyTable =
    !!cafe && Math.hypot(player.x - (cafe.x + cafe.w / 2), player.y - (cafe.y + cafe.h / 2)) < 48;

  const sec = ROOMS.find((r) => r.id === 'security');
  const isNearSecurityConsole =
    !!sec && player.x >= sec.x + 10 && player.x <= sec.x + 80 && player.y >= sec.y + 20 && player.y <= sec.y + 60;

  const killTarget =
    player.role === 'Impostor' && player.alive && playerKillCooldown === 0 && !player.inVent
      ? bots.find((b) => b.alive && Math.hypot(player.x - b.x, player.y - b.y) < 38) || null
      : null;

  // Actions
  const handleUseAction = () => {
    if (activeTaskNearby) {
      sounds.playBeep(false);
      setActiveMiniGame(activeTaskNearby);
    } else if (isNearEmergencyTable) {
      triggerEmergencyMeeting('Emergency Meeting');
    } else if (isNearSecurityConsole) {
      sounds.playBeep(true);
      setShowCCTV(true);
    }
  };

  const handleReportAction = () => {
    if (bodyNearby) {
      triggerEmergencyMeeting('Report Body', bodyNearby.name, bodyNearby.room);
    }
  };

  const handleKillAction = () => {
    if (!killTarget) return;
    sounds.playKill();
    const victim = killTarget;
    setBots((prev) => prev.map((b) => (b.id === victim.id ? { ...b, alive: false } : b)));
    setDeadBodies((prev) => [
      ...prev,
      { id: `body-${victim.id}`, name: victim.name, color: victim.color, x: victim.x, y: victim.y, room: victim.room },
    ]);
    setPlayerKillCooldown(25);
    addLog(`[Station Echo]: Eliminated ${victim.name} in ${victim.room}.`);
    checkWinConditions();
  };

  const handleVentAction = () => {
    if (!activeVentNearby) return;
    sounds.playVent();

    if (!player.inVent) {
      // Enter vent
      setPlayer((p) => ({
        ...p,
        inVent: true,
        currentVentId: activeVentNearby.id,
        x: activeVentNearby.x,
        y: activeVentNearby.y,
      }));
      addLog(`[Vents]: Slipped into ${activeVentNearby.name}.`);
    } else {
      // Find connected vents or exit
      const currentVent = VENTS.find((v) => v.id === player.currentVentId);
      if (currentVent && currentVent.connections.length > 0) {
        // Hop to next connected vent
        const nextVentId = currentVent.connections[0];
        const nextVent = VENTS.find((v) => v.id === nextVentId);
        if (nextVent) {
          setPlayer((p) => ({
            ...p,
            inVent: false,
            currentVentId: null,
            x: nextVent.x,
            y: nextVent.y,
            room: nextVent.room,
          }));
          addLog(`[Vents]: Popped out of ${nextVent.name}.`);
        }
      } else {
        setPlayer((p) => ({ ...p, inVent: false, currentVentId: null }));
      }
    }
  };

  const triggerEmergencyMeeting = (
    reason: 'Report Body' | 'Emergency Meeting',
    deadPlayerName?: string | null,
    deadBodyLocation?: string | null
  ) => {
    setActiveMiniGame(null);
    setShowCCTV(false);
    setMeetingState({
      active: true,
      reason,
      reporterName: player.name,
      deadPlayerName: deadPlayerName || null,
      deadBodyLocation: deadBodyLocation || null,
    });
    addLog(`🚨 EMERGENCY TRIGGERED: ${reason.toUpperCase()} by ${player.name}`);
  };

  // Bot Discovers Body autonomously
  const handleBotReportsBody = (bot: BotCharacter, body: DeadBody) => {
    if (meetingState || gameOver) return;
    setActiveMiniGame(null);
    setShowCCTV(false);
    setMeetingState({
      active: true,
      reason: 'Report Body',
      reporterName: bot.name,
      deadPlayerName: body.name,
      deadBodyLocation: body.room,
    });
    addLog(`🚨 ${bot.name} REPORTED A DEAD BODY in ${body.room}!`);
  };

  // Task Completion Handler
  const handleTaskCompleted = (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: true } : t)));
    setActiveMiniGame(null);
    addLog(`[Tasks]: Station repair completed.`);

    // Check task victory
    const completedCount = tasks.filter((t) => t.done).length + 1;
    if (completedCount >= tasks.length) {
      setGameOver({
        winner: 'Crew',
        reason: 'TASK VICTORY! All vital systems restored aboard Skeld-9.',
      });
      sounds.playTaskComplete();
    }
  };

  // Check Win conditions
  const checkWinConditions = () => {
    const aliveImpostors =
      bots.filter((b) => b.alive && b.role === 'Impostor').length +
      (player.alive && player.role === 'Impostor' ? 1 : 0);

    const aliveCrew =
      bots.filter((b) => b.alive && b.role === 'Crew').length +
      (player.alive && player.role === 'Crew' ? 1 : 0);

    if (aliveImpostors === 0) {
      setGameOver({
        winner: 'Crew',
        reason: 'CREW VICTORY! All Impostors have been discovered and eliminated.',
      });
      sounds.playTaskComplete();
    } else if (aliveImpostors >= aliveCrew) {
      setGameOver({
        winner: 'Impostor',
        reason: 'IMPOSTOR VICTORY! The Impostors have overtaken the remaining crew.',
      });
      sounds.playAlarm();
    }
  };

  // Main Movement & Bot AI Loop
  useEffect(() => {
    if (meetingState || activeMiniGame || ejectionResult || gameOver) return;

    let animId: number;

    const gameLoop = () => {
      // 1. Move Player
      let dx = 0;
      let dy = 0;
      const k = keysRef.current;
      if (k['w'] || k['arrowup']) dy -= player.speed;
      if (k['s'] || k['arrowdown']) dy += player.speed;
      if (k['a'] || k['arrowleft']) dx -= player.speed;
      if (k['d'] || k['arrowright']) dx += player.speed;

      const isMoving = dx !== 0 || dy !== 0;
      const facing = dx < 0 ? 'left' : dx > 0 ? 'right' : player.facing;

      if (isMoving && !player.inVent) {
        const nextX = Math.max(25, Math.min(935, player.x + dx));
        const nextY = Math.max(30, Math.min(620, player.y + dy));
        const nextRoom = getRoomAtPoint(nextX, nextY);

        setPlayer((prev) => ({
          ...prev,
          x: nextX,
          y: nextY,
          facing,
          isMoving: true,
          room: nextRoom,
        }));
      } else if (!isMoving && player.isMoving) {
        setPlayer((prev) => ({ ...prev, isMoving: false }));
      }

      // 2. Autonomous Bots Movement & Logic
      setBots((prevBots) =>
        prevBots.map((bot) => {
          if (!bot.alive) return bot;

          let targetX = bot.targetX;
          let targetY = bot.targetY;

          // Pick new patrol destination occasionally
          if (!targetX || !targetY || Math.random() < 0.015) {
            const randomRoom = ROOMS[Math.floor(Math.random() * ROOMS.length)];
            targetX = randomRoom.x + 20 + Math.random() * (randomRoom.w - 40);
            targetY = randomRoom.y + 20 + Math.random() * (randomRoom.h - 40);
          }

          const bdx = targetX - bot.x;
          const bdy = targetY - bot.y;
          const dist = Math.hypot(bdx, bdy);

          let nextBotX = bot.x;
          let nextBotY = bot.y;
          let botMoving = false;
          let botFacing = bot.facing;

          if (dist > 3) {
            botMoving = true;
            nextBotX += (bdx / dist) * bot.speed;
            nextBotY += (bdy / dist) * bot.speed;
            botFacing = bdx < 0 ? 'left' : 'right';
          }

          const currentRoom = getRoomAtPoint(nextBotX, nextBotY);

          // Bot Impostor stealth kill simulation (if bot is impostor)
          if (bot.role === 'Impostor' && bot.killCooldown <= 0) {
            // Check if player is nearby and solitary
            const distToPlayer = Math.hypot(nextBotX - player.x, nextBotY - player.y);
            if (distToPlayer < 36 && player.alive && player.role === 'Crew') {
              // Kill player!
              sounds.playKill();
              setPlayer((p) => ({ ...p, alive: false }));
              setDeadBodies((b) => [
                ...b,
                { id: `body-player`, name: player.name, color: player.color, x: player.x, y: player.y, room: player.room },
              ]);
              addLog(`[Station Siren]: You were eliminated in ${player.room}! You are now a ghost.`);
              return { ...bot, killCooldown: 28 };
            }

            // Check if another crew bot is nearby and solitary
            const nearbyCrew = prevBots.filter(
              (other) => other.id !== bot.id && other.alive && other.role === 'Crew' && Math.hypot(nextBotX - other.x, nextBotY - other.y) < 36
            );
            if (nearbyCrew.length === 1) {
              const victim = nearbyCrew[0];
              sounds.playKill();
              setDeadBodies((b) => [
                ...b,
                { id: `body-${victim.id}`, name: victim.name, color: victim.color, x: victim.x, y: victim.y, room: victim.room },
              ]);
              addLog(`[Station Echo]: Distant mechanical crash heard near ${victim.room}...`);
              // Mark victim dead
              victim.alive = false;
              return { ...bot, killCooldown: 28 };
            }
          }

          // Check if bot notices a dead body
          deadBodies.forEach((body) => {
            if (Math.hypot(nextBotX - body.x, nextBotY - body.y) < 42) {
              handleBotReportsBody(bot, body);
            }
          });

          return {
            ...bot,
            x: nextBotX,
            y: nextBotY,
            targetX,
            targetY,
            room: currentRoom,
            isMoving: botMoving,
            facing: botFacing,
          };
        })
      );

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [player, bots, deadBodies, meetingState, activeMiniGame, ejectionResult, gameOver]);

  // Ejection handling
  const handleVoteComplete = (result: EjectionResult) => {
    setMeetingState(null);
    setEjectionResult(result);

    // Apply ejection
    if (result.ejectedName) {
      if (result.ejectedName === player.name) {
        setPlayer((p) => ({ ...p, alive: false }));
      } else {
        setBots((prev) =>
          prev.map((b) => (b.name === result.ejectedName ? { ...b, alive: false } : b))
        );
      }
    }
  };

  const handleEjectionCutsceneFinish = () => {
    setEjectionResult(null);
    checkWinConditions();
  };

  const handleRestart = () => {
    window.location.reload();
  };

  // Progress metrics
  const completedTasks = tasks.filter((t) => t.done).length;
  const taskPercent = Math.round((completedTasks / tasks.length) * 100);
  const aliveCrewCount = bots.filter((b) => b.alive && b.role === 'Crew').length + (player.alive && player.role === 'Crew' ? 1 : 0);
  const aliveImpostorCount = bots.filter((b) => b.alive && b.role === 'Impostor').length + (player.alive && player.role === 'Impostor' ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-2 md:p-5 select-none font-sans">
      {/* Top Protocol Bar */}
      <header className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-lg">
            <Radio className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold font-mono tracking-wider text-cyan-400 flex items-center gap-2">
              <span>AMONG US: AI STATION PROTOCOL</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/80">
                GEMINI-POWERED
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Skeld-9 Research Station · Gemini Social Deduction Engine</p>
          </div>
        </div>

        {/* Global Crew Task Victory Bar */}
        <div className="flex-1 max-w-xs mx-2">
          <div className="flex justify-between items-center text-xs font-mono mb-1">
            <span className="text-slate-400">TOTAL TASKS COMPLETED</span>
            <span className="text-emerald-400 font-bold">{completedTasks}/{tasks.length} ({taskPercent}%)</span>
          </div>
          <div className="w-full bg-slate-900 border border-slate-700 h-3 rounded-full overflow-hidden shadow-inner">
            <div
              className="bg-emerald-500 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.7)]"
              style={{ width: `${taskPercent}%` }}
            />
          </div>
        </div>

        {/* Header Right Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left Column: 2D Canvas Station View (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <StationCanvas
            player={player}
            bots={bots}
            deadBodies={deadBodies}
            tasks={tasks}
            activeTaskNearby={activeTaskNearby}
            activeVentNearby={activeVentNearby}
            bodyNearby={bodyNearby}
            isNearEmergencyTable={isNearEmergencyTable}
            isNearSecurityConsole={isNearSecurityConsole}
            killTarget={killTarget}
          />

          {/* Bottom On-Screen Action Pad */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* USE CONSOLE BUTTON */}
            <button
              onClick={handleUseAction}
              disabled={!activeTaskNearby && !isNearEmergencyTable && !isNearSecurityConsole}
              className={`py-3 px-3 rounded-xl border font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTaskNearby || isNearEmergencyTable || isNearSecurityConsole
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer animate-pulse'
                  : 'bg-slate-900/60 text-slate-600 border-slate-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>USE [E]</span>
            </button>

            {/* REPORT BODY BUTTON */}
            <button
              onClick={handleReportAction}
              disabled={!bodyNearby}
              className={`py-3 px-3 rounded-xl border font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                bodyNearby
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer animate-bounce'
                  : 'bg-slate-900/60 text-slate-600 border-slate-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <Skull className="w-4 h-4" />
              <span>REPORT [R]</span>
            </button>

            {/* IMPOSTOR KILL BUTTON */}
            {player.role === 'Impostor' ? (
              <button
                onClick={handleKillAction}
                disabled={!killTarget || playerKillCooldown > 0 || !player.alive}
                className={`py-3 px-3 rounded-xl border font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  killTarget && playerKillCooldown === 0 && player.alive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.6)] cursor-pointer animate-pulse'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60 cursor-not-allowed'
                }`}
              >
                <Crosshair className="w-4 h-4" />
                <span>KILL [Q] {playerKillCooldown > 0 ? `(${playerKillCooldown}s)` : ''}</span>
              </button>
            ) : (
              /* CALL EMERGENCY BUTTON (Cafeteria Shortcut) */
              <button
                onClick={() => triggerEmergencyMeeting('Emergency Meeting')}
                className="py-3 px-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>CALL TRIAL</span>
              </button>
            )}

            {/* VENT BUTTON (Impostor) or CCTV Button */}
            {player.role === 'Impostor' ? (
              <button
                onClick={handleVentAction}
                disabled={!activeVentNearby || !player.alive}
                className={`py-3 px-3 rounded-xl border font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeVentNearby && player.alive
                    ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white border-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.5)] cursor-pointer'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60 cursor-not-allowed'
                }`}
              >
                <Wind className="w-4 h-4" />
                <span>{player.inVent ? 'EXIT VENT [V]' : 'VENT [V]'}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCCTV(true)}
                className="py-3 px-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>VIEW CCTV</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Mission Briefing, Role Selector & Comms Log (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Player Dossier & Role Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <span className="font-mono text-xs font-bold uppercase text-slate-400 tracking-wider">
                PLAYER DOSSIER
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                  player.role === 'Impostor'
                    ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                    : 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                }`}
              >
                {player.role.toUpperCase()}
              </span>
            </div>

            {/* Quick Role Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 mb-3">
              <button
                onClick={() => handleSelectRole('Crew')}
                className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer ${
                  player.role === 'Crew'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Play as Crewmate
              </button>
              <button
                onClick={() => handleSelectRole('Impostor')}
                className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer ${
                  player.role === 'Impostor'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Play as Impostor
              </button>
            </div>

            {/* Stats info */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 mb-3">
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">CURRENT ROOM:</span>
                <span className="text-cyan-400 font-bold">{player.room}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">SURVIVING CREW:</span>
                <span className="text-slate-200 font-bold">
                  {aliveCrewCount} Crew / {aliveImpostorCount} Imp
                </span>
              </div>
            </div>

            {/* Assigned Tasks checklist */}
            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
                <span>ASSIGNED REPAIRS</span>
                <span>{completedTasks}/{tasks.length} Done</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      if (!task.done) {
                        sounds.playBeep(false);
                        setActiveMiniGame(task);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-all border ${
                      task.done
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400/70 line-through'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-500/60 cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          task.done ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                        }`}
                      />
                      {task.name} ({task.room})
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">{task.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Station Comms Radio Terminal */}
          <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col min-h-[190px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="font-mono text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>STATION TELEMETRY LOG</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 animate-pulse">LIVE</span>
            </div>

            <div className="flex-1 bg-slate-950 rounded-lg p-2.5 border border-slate-800/80 overflow-y-auto space-y-1.5 font-mono text-[11px] max-h-48 text-slate-300">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`leading-tight ${
                    log.includes('🚨') || log.includes('Eliminated')
                      ? 'text-rose-400 font-semibold'
                      : log.includes('completed')
                      ? 'text-emerald-400'
                      : log.includes('Vents')
                      ? 'text-fuchsia-400'
                      : 'text-slate-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Controls Cheatsheet */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong className="text-slate-200">WASD / Arrows:</strong> Walk
            </span>
            <span>
              <strong className="text-slate-200">E / Space:</strong> Use Console
            </span>
            <span>
              <strong className="text-slate-200">R:</strong> Report
            </span>
            <span>
              <strong className="text-slate-200">Q:</strong> Kill
            </span>
            <span>
              <strong className="text-slate-200">V:</strong> Vent
            </span>
          </div>
        </div>
      </div>

      {/* Task Mini-Games Modal Container */}
      {activeMiniGame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          {activeMiniGame.type === 'wires' && (
            <WiresMiniGame
              onComplete={() => handleTaskCompleted(activeMiniGame.id)}
              onClose={() => setActiveMiniGame(null)}
            />
          )}
          {activeMiniGame.type === 'reactor' && (
            <ReactorMiniGame
              onComplete={() => handleTaskCompleted(activeMiniGame.id)}
              onClose={() => setActiveMiniGame(null)}
            />
          )}
          {activeMiniGame.type === 'medbay' && (
            <MedBayScanMiniGame
              playerName={player.name}
              playerColor={player.color}
              onComplete={() => handleTaskCompleted(activeMiniGame.id)}
              onClose={() => setActiveMiniGame(null)}
            />
          )}
          {activeMiniGame.type === 'swipe' && (
            <CardSwipeMiniGame
              onComplete={() => handleTaskCompleted(activeMiniGame.id)}
              onClose={() => setActiveMiniGame(null)}
            />
          )}
          {activeMiniGame.type === 'divert' && (
            <DivertPowerMiniGame
              targetRoom={activeMiniGame.room}
              onComplete={() => handleTaskCompleted(activeMiniGame.id)}
              onClose={() => setActiveMiniGame(null)}
            />
          )}
        </div>
      )}

      {/* Emergency Meeting Modal (Gemini Discussion & Voting) */}
      {meetingState && (
        <EmergencyMeetingModal
          reason={meetingState.reason}
          reporterName={meetingState.reporterName}
          deadPlayerName={meetingState.deadPlayerName}
          deadBodyLocation={meetingState.deadBodyLocation}
          player={player}
          bots={bots}
          onVoteComplete={handleVoteComplete}
        />
      )}

      {/* Ejection Cutscene */}
      {ejectionResult && (
        <EjectionOverlay result={ejectionResult} onFinish={handleEjectionCutsceneFinish} />
      )}

      {/* Security CCTV Cameras */}
      {showCCTV && (
        <SecurityCCTVModal player={player} bots={bots} onClose={() => setShowCCTV(false)} />
      )}

      {/* Game Over Victory / Defeat Modal */}
      {gameOver && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <h2
              className={`text-3xl font-mono font-bold tracking-widest uppercase ${
                gameOver.winner === 'Crew' ? 'text-emerald-400' : 'text-rose-500'
              }`}
            >
              {gameOver.winner === 'Crew' ? 'VICTORY' : 'DEFEAT'}
            </h2>
            <p className="text-sm font-mono text-slate-300 leading-relaxed">{gameOver.reason}</p>

            <div className="flex justify-center gap-3">
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs rounded-xl transition-all shadow-lg cursor-pointer"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
