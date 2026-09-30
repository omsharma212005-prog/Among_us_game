import React, { useRef, useEffect } from 'react';
import { Character, BotCharacter, DeadBody, TaskDef, VentDef } from '../types/game';
import { ROOMS, VENTS } from '../game/mapData';

interface StationCanvasProps {
  player: Character;
  bots: BotCharacter[];
  deadBodies: DeadBody[];
  tasks: TaskDef[];
  activeTaskNearby: TaskDef | null;
  activeVentNearby: VentDef | null;
  bodyNearby: DeadBody | null;
  isNearEmergencyTable: boolean;
  isNearSecurityConsole: boolean;
  killTarget: BotCharacter | null;
}

export const StationCanvas: React.FC<StationCanvasProps> = ({
  player,
  bots,
  deadBodies,
  tasks,
  activeTaskNearby,
  activeVentNearby,
  bodyNearby,
  isNearEmergencyTable,
  isNearSecurityConsole,
  killTarget,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.04;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear background (Deep space outside hull)
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, width, height);

      // Starfield background
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 35; i++) {
        const sx = (i * 137.5) % width;
        const sy = (i * 93.7) % height;
        const flicker = 0.3 + 0.7 * Math.sin(time + i);
        ctx.globalAlpha = flicker * 0.5;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1.0;

      // 2. Draw Station Corridors & Structural Hull
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 6;
      ctx.fillStyle = '#0f172a';

      // Corridors connect rooms
      ctx.fillRect(150, 140, 240, 50); // Medbay to Cafeteria
      ctx.strokeRect(150, 140, 240, 50);
      ctx.fillRect(490, 210, 60, 90); // Cafeteria to Admin
      ctx.strokeRect(490, 210, 60, 90);
      ctx.fillRect(470, 420, 60, 40); // Admin to Storage
      ctx.strokeRect(470, 420, 60, 40);
      ctx.fillRect(330, 410, 70, 50); // Electrical to Storage
      ctx.strokeRect(330, 410, 70, 50);
      ctx.fillRect(130, 220, 90, 45); // Security to Reactor corridor
      ctx.strokeRect(130, 220, 90, 45);
      ctx.fillRect(630, 120, 80, 45); // Cafeteria to Weapons
      ctx.strokeRect(630, 120, 80, 45);
      ctx.fillRect(670, 360, 50, 80); // Admin to Shields
      ctx.strokeRect(670, 360, 50, 80);

      // 3. Draw Rooms
      ROOMS.forEach((room) => {
        // Floor
        ctx.fillStyle = '#111827';
        ctx.fillRect(room.x, room.y, room.w, room.h);

        // Floor grid
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1;
        for (let gx = room.x; gx < room.x + room.w; gx += 40) {
          ctx.beginPath();
          ctx.moveTo(gx, room.y);
          ctx.lineTo(gx, room.y + room.h);
          ctx.stroke();
        }
        for (let gy = room.y; gy < room.y + room.h; gy += 40) {
          ctx.beginPath();
          ctx.moveTo(room.x, gy);
          ctx.lineTo(room.x + room.w, gy);
          ctx.stroke();
        }

        // Room Wall Border
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.strokeRect(room.x, room.y, room.w, room.h);

        // Room Label Header
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(room.name.toUpperCase(), room.x + 10, room.y + 18);
      });

      // Special Room Features:
      // Cafeteria Emergency Table & Red Button
      const cafe = ROOMS.find((r) => r.id === 'cafeteria');
      if (cafe) {
        const cx = cafe.x + cafe.w / 2;
        const cy = cafe.y + cafe.h / 2;
        // Outer table
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner emergency button glass pedestal
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();

        // Big Red Button
        const pulse = 1 + 0.1 * Math.sin(time * 4);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 10 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.fillText('EMRG', cx - 11, cy + 3);
      }

      // Reactor Core Animation
      const reactor = ROOMS.find((r) => r.id === 'reactor');
      if (reactor) {
        const rx = reactor.x + 35;
        const ry = reactor.y + reactor.h / 2;
        const glow = 14 + 4 * Math.sin(time * 3);
        const grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, glow);
        grad.addColorStop(0, '#22d3ee');
        grad.addColorStop(0.7, 'rgba(6, 182, 212, 0.4)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(rx, ry, glow, 0, Math.PI * 2);
        ctx.fill();

        // Core shell
        ctx.fillStyle = '#0e7490';
        ctx.beginPath();
        ctx.arc(rx, ry, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // MedBay Scanner Pad
      const medbay = ROOMS.find((r) => r.id === 'medbay');
      if (medbay) {
        const mx = medbay.x + 60;
        const my = medbay.y + 60;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(mx, my, 22, 14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fill();
      }

      // Security CCTV Monitor Desks
      const sec = ROOMS.find((r) => r.id === 'security');
      if (sec) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(sec.x + 20, sec.y + 30, 26, 14);
        ctx.fillRect(sec.x + 55, sec.y + 30, 26, 14);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sec.x + 22, sec.y + 32, 22, 10);
        ctx.fillRect(sec.x + 57, sec.y + 32, 22, 10);
      }

      // 4. Draw Vents
      VENTS.forEach((vent) => {
        ctx.fillStyle = '#334155';
        ctx.fillRect(vent.x - 12, vent.y - 8, 24, 16);
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.strokeRect(vent.x - 12, vent.y - 8, 24, 16);

        // Vent metal slats
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(vent.x - 9, vent.y - 5, 18, 2);
        ctx.fillRect(vent.x - 9, vent.y - 1, 18, 2);
        ctx.fillRect(vent.x - 9, vent.y + 3, 18, 2);
      });

      // 5. Draw Task Consoles
      tasks.forEach((task) => {
        const isDone = task.done;
        ctx.fillStyle = isDone ? '#10b981' : '#f59e0b';
        ctx.fillRect(task.x - 9, task.y - 9, 18, 18);
        ctx.strokeStyle = isDone ? '#059669' : '#d97706';
        ctx.lineWidth = 2;
        ctx.strokeRect(task.x - 9, task.y - 9, 18, 18);

        // Pulsing halo if incomplete
        if (!isDone) {
          const halo = 14 + 3 * Math.sin(time * 5);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.beginPath();
          ctx.arc(task.x, task.y, halo, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // 6. Draw Dead Bodies
      deadBodies.forEach((body) => {
        // Red blood ring
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.ellipse(body.x, body.y + 4, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Half bean body (lying on side)
        ctx.fillStyle = body.color;
        ctx.beginPath();
        ctx.arc(body.x, body.y, 11, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();

        // White bone sticking out
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(body.x - 2, body.y - 8, 4, 10);
        ctx.beginPath();
        ctx.arc(body.x - 3, body.y - 8, 2.5, 0, Math.PI * 2);
        ctx.arc(body.x + 3, body.y - 8, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Danger marker text
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`DEAD: ${body.name}`, body.x - 18, body.y - 14);
      });

      // 7. Draw Bots
      bots.forEach((bot) => {
        if (!bot.alive) return;
        renderCrewmateBean(ctx, bot.x, bot.y, bot.color, bot.name, bot.facing, bot.isMoving, time + bot.id, false);
      });

      // 8. Draw Player (if not in vent)
      if (!player.inVent) {
        renderCrewmateBean(
          ctx,
          player.x,
          player.y,
          player.color,
          `${player.name} (You)`,
          player.facing,
          player.isMoving,
          time,
          !player.alive // Render as translucent ghost if dead!
        );
      } else {
        // In vent indicator
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('[INSIDE VENTS]', player.x - 36, player.y - 20);
      }

      // 9. Vision Vignette (Subtle tension lighting)
      const grad = ctx.createRadialGradient(player.x, player.y, 90, player.x, player.y, 360);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(3, 7, 18, 0.45)');
      grad.addColorStop(1, 'rgba(3, 7, 18, 0.9)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 10. Interactive Floating Indicators over Player's head
      if (activeTaskNearby) {
        renderFloatingBadge(ctx, player.x, player.y - 34, `USE CONSOLE [E]: ${activeTaskNearby.name}`, '#f59e0b');
      } else if (bodyNearby) {
        renderFloatingBadge(ctx, player.x, player.y - 34, `REPORT BODY [R]`, '#ef4444');
      } else if (isNearEmergencyTable) {
        renderFloatingBadge(ctx, player.x, player.y - 34, `EMERGENCY BUTTON [E]`, '#f59e0b');
      } else if (isNearSecurityConsole) {
        renderFloatingBadge(ctx, player.x, player.y - 34, `VIEW CCTV CAMERAS [E]`, '#38bdf8');
      } else if (activeVentNearby && player.role === 'Impostor') {
        renderFloatingBadge(ctx, player.x, player.y - 34, player.inVent ? `EXIT VENT [V]` : `ENTER VENT [V]`, '#ec4899');
      }

      if (killTarget && player.role === 'Impostor' && player.alive) {
        renderFloatingBadge(ctx, killTarget.x, killTarget.y - 32, `KILL TARGET [Q]`, '#ef4444');
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    player,
    bots,
    deadBodies,
    tasks,
    activeTaskNearby,
    activeVentNearby,
    bodyNearby,
    isNearEmergencyTable,
    isNearSecurityConsole,
    killTarget,
  ]);

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-slate-700/80 bg-slate-950 shadow-2xl">
      <canvas ref={canvasRef} width={960} height={640} className="w-full h-auto block max-h-[74vh] object-contain" />
    </div>
  );
};

// Helper: Draw classic bean crewmate
function renderCrewmateBean(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  name: string,
  facing: 'left' | 'right',
  isMoving: boolean,
  time: number,
  isGhost: boolean
) {
  ctx.save();
  ctx.translate(x, y);

  if (isGhost) {
    ctx.globalAlpha = 0.45;
  }

  const dir = facing === 'left' ? -1 : 1;
  const bob = isMoving ? Math.sin(time * 12) * 2.5 : 0;

  // Shadow on floor
  if (!isGhost) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Backpack oxygen tank (behind body)
  ctx.fillStyle = color;
  ctx.fillRect(-dir * 14, -8 + bob, 6, 15);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(-dir * 14, -8 + bob, 6, 15);

  // Main bean body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -5 + bob, 11, Math.PI, 0, false); // Head arc
  ctx.lineTo(11, 8 + bob);
  ctx.lineTo(-11, 8 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (isGhost) {
    // Wavy ghost tail
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-11, 8 + bob);
    ctx.quadraticCurveTo(0, 18 + Math.sin(time * 8) * 3, 11, 8 + bob);
    ctx.closePath();
    ctx.fill();
  } else {
    // Two Little legs
    const legOffset = isMoving ? Math.sin(time * 12) * 3 : 0;
    // Left leg
    ctx.fillStyle = color;
    ctx.fillRect(-9, 8 + bob + legOffset, 7, 8);
    ctx.strokeRect(-9, 8 + bob + legOffset, 7, 8);
    // Right leg
    ctx.fillRect(2, 8 + bob - legOffset, 7, 8);
    ctx.strokeRect(2, 8 + bob - legOffset, 7, 8);
  }

  // Visor (Cyan glossy screen)
  const visorX = dir * 3;
  ctx.fillStyle = '#67e8f9';
  ctx.beginPath();
  ctx.ellipse(visorX, -4 + bob, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Visor shine glare
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(visorX + dir * 2, -6 + bob, 3.5, 1.5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Character Name Label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(name, 0, -20 + bob);

  ctx.restore();
}

function renderFloatingBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  badgeColor: string
) {
  ctx.save();
  ctx.font = 'bold 10px monospace';
  const textWidth = ctx.measureText(text).width;
  const pad = 8;
  const w = textWidth + pad * 2;
  const h = 20;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = badgeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}
