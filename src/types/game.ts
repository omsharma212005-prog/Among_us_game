export type Role = 'Crew' | 'Impostor';

export interface RoomDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  tasksAllowed: string[];
}

export interface VentDef {
  id: string;
  name: string;
  x: number;
  y: number;
  room: string;
  connections: string[];
}

export type TaskType = 'wires' | 'reactor' | 'medbay' | 'swipe' | 'divert';

export interface TaskDef {
  id: string;
  name: string;
  type: TaskType;
  room: string;
  x: number;
  y: number;
  done: boolean;
  assignedToPlayer: boolean;
}

export interface Character {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  r: number;
  speed: number;
  alive: boolean;
  role: Role;
  room: string;
  facing: 'left' | 'right';
  isMoving: boolean;
  animFrame: number;
  inVent?: boolean;
  currentVentId?: string | null;
}

export interface BotCharacter extends Character {
  personality: string;
  targetX?: number;
  targetY?: number;
  idleTimer?: number;
  killCooldown: number;
  lastSeenNear?: string;
  suspicionOn?: string;
  fakingTask?: boolean;
}

export interface DeadBody {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  room: string;
}

export interface MeetingMessage {
  id: string;
  speakerId?: number;
  speakerName: string;
  speakerColor: string;
  isSystem?: boolean;
  isPlayer?: boolean;
  text: string;
  timestamp: string;
}

export interface MeetingVote {
  voterId: number;
  targetId: number | 'skip';
  reason?: string;
}

export interface EjectionResult {
  ejectedName: string | null;
  ejectedColor?: string;
  role: Role | null;
  skipped: boolean;
  tie: boolean;
  impostorsLeft: number;
}
