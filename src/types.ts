export interface PlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  color: string;
}

export interface MoveMessage {
  type: "move";
  x: number;
  y: number;
  z: number;
  ry: number;
}

export interface ExistingPlayersMessage {
  type: "existing-players";
  players: PlayerState[];
}

export interface JoinMessage {
  type: "join";
  player: PlayerState;
}

export interface PlayerMoveMessage {
  type: "player-move";
  player: PlayerState;
}

export interface LeaveMessage {
  type: "leave";
  id: string;
}

export type ServerMessage =
  | ExistingPlayersMessage
  | JoinMessage
  | PlayerMoveMessage
  | LeaveMessage;
