import { RoomDef, VentDef, TaskDef } from '../types/game';

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 680;

export const ROOMS: RoomDef[] = [
  { id: 'cafeteria', name: 'Cafeteria', x: 380, y: 40, w: 260, h: 180, color: '#1e293b', tasksAllowed: ['wires'] },
  { id: 'weapons', name: 'Weapons', x: 700, y: 60, w: 180, h: 140, color: '#1e293b', tasksAllowed: ['divert'] },
  { id: 'shields', name: 'Shields', x: 690, y: 430, w: 190, h: 150, color: '#1e293b', tasksAllowed: ['divert'] },
  { id: 'admin', name: 'Admin', x: 500, y: 280, w: 180, h: 150, color: '#1e293b', tasksAllowed: ['swipe'] },
  { id: 'storage', name: 'Storage', x: 380, y: 450, w: 220, h: 180, color: '#1e293b', tasksAllowed: ['wires'] },
  { id: 'electrical', name: 'Electrical', x: 170, y: 350, w: 170, h: 160, color: '#1e293b', tasksAllowed: ['wires', 'divert'] },
  { id: 'lower_engine', name: 'Lower Engine', x: 50, y: 450, w: 160, h: 150, color: '#1e293b', tasksAllowed: ['divert'] },
  { id: 'upper_engine', name: 'Upper Engine', x: 50, y: 90, w: 160, h: 150, color: '#1e293b', tasksAllowed: ['divert'] },
  { id: 'reactor', name: 'Reactor', x: 20, y: 250, w: 130, h: 180, color: '#1e293b', tasksAllowed: ['reactor'] },
  { id: 'security', name: 'Security', x: 200, y: 220, w: 140, h: 120, color: '#1e293b', tasksAllowed: ['divert'] },
  { id: 'medbay', name: 'MedBay', x: 230, y: 80, w: 140, h: 130, color: '#1e293b', tasksAllowed: ['medbay'] },
];

export const VENTS: VentDef[] = [
  { id: 'vent_elec', name: 'Electrical Vent', x: 200, y: 380, room: 'Electrical', connections: ['vent_medbay', 'vent_sec'] },
  { id: 'vent_medbay', name: 'MedBay Vent', x: 260, y: 110, room: 'MedBay', connections: ['vent_elec', 'vent_sec'] },
  { id: 'vent_sec', name: 'Security Vent', x: 230, y: 250, room: 'Security', connections: ['vent_elec', 'vent_medbay'] },
  { id: 'vent_reactor_u', name: 'Reactor Upper Vent', x: 60, y: 270, room: 'Reactor', connections: ['vent_upper_eng', 'vent_reactor_l'] },
  { id: 'vent_upper_eng', name: 'Upper Engine Vent', x: 80, y: 120, room: 'Upper Engine', connections: ['vent_reactor_u'] },
  { id: 'vent_reactor_l', name: 'Reactor Lower Vent', x: 60, y: 400, room: 'Reactor', connections: ['vent_lower_eng', 'vent_reactor_u'] },
  { id: 'vent_lower_eng', name: 'Lower Engine Vent', x: 80, y: 550, room: 'Lower Engine', connections: ['vent_reactor_l'] },
  { id: 'vent_admin', name: 'Admin Vent', x: 640, y: 390, room: 'Admin', connections: ['vent_cafeteria'] },
  { id: 'vent_cafeteria', name: 'Cafeteria Vent', x: 610, y: 70, room: 'Cafeteria', connections: ['vent_admin'] },
];

export const INITIAL_TASKS: TaskDef[] = [
  { id: 'task-wires-elec', name: 'Fix Wiring', type: 'wires', room: 'Electrical', x: 280, y: 370, done: false, assignedToPlayer: true },
  { id: 'task-reactor-core', name: 'Calibrate Reactor', type: 'reactor', room: 'Reactor', x: 50, y: 340, done: false, assignedToPlayer: true },
  { id: 'task-medbay-scan', name: 'Submit Bio-Scan', type: 'medbay', room: 'MedBay', x: 290, y: 140, done: false, assignedToPlayer: true },
  { id: 'task-admin-card', name: 'Swipe Card', type: 'swipe', room: 'Admin', x: 580, y: 330, done: false, assignedToPlayer: true },
  { id: 'task-divert-weapons', name: 'Divert Power', type: 'divert', room: 'Weapons', x: 780, y: 110, done: false, assignedToPlayer: true },
  { id: 'task-storage-wires', name: 'Fix Wiring', type: 'wires', room: 'Storage', x: 440, y: 540, done: false, assignedToPlayer: false },
];

export function getRoomAtPoint(x: number, y: number): string {
  for (const r of ROOMS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      return r.name;
    }
  }
  return 'Corridor';
}
