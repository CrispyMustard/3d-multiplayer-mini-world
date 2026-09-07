import type * as Party from "partykit/server";
import type {
  ChatBroadcastMessage,
  ChatMessage,
  JoinMessage,
  LeaveMessage,
  MoveMessage,
  ProfileMessage,
  PlayerMoveMessage,
  PlayerProfileMessage,
  PlayerState,
  ExistingPlayersMessage,
} from "../types";

const playersByRoom = new Map<string, Map<string, PlayerState>>();
const lastActionAt = new Map<string, number>();
const getPlayers = (roomId: string): Map<string, PlayerState> => {
  let players = playersByRoom.get(roomId);
  if (!players) {
    players = new Map();
    playersByRoom.set(roomId, players);
  }
  return players;
};

function randomColor(): string {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
}

function isMoveMessage(value: unknown): value is MoveMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<MoveMessage>;
  return (
    message.type === "move" &&
    [message.x, message.y, message.z, message.ry].every(
      (coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate),
    )
  );
}

function isProfileMessage(value: unknown): value is ProfileMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ProfileMessage>;
  return message.type === "profile" && typeof message.name === "string" && typeof message.color === "string";
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return message.type === "chat" && typeof message.text === "string";
}

function isRateLimited(roomId: string, playerId: string, cooldown: number): boolean {
  const key = `${roomId}:${playerId}`;
  const now = Date.now();
  const previous = lastActionAt.get(key) ?? 0;
  if (now - previous < cooldown) return true;
  lastActionAt.set(key, now);
  return false;
}

const server: Party.PartyKitServer = {
  onConnect(connection, room) {
    const players = getPlayers(room.id);
    const player: PlayerState = {
      id: connection.id,
      x: 0,
      y: 0,
      z: 0,
      ry: 0,
      color: randomColor(),
      name: `Player ${connection.id.slice(0, 5)}`,
    };

    const existingMessage: ExistingPlayersMessage = {
      type: "existing-players",
      players: [...players.values()],
    };
    connection.send(JSON.stringify(existingMessage));

    players.set(player.id, player);

    const joinMessage: JoinMessage = { type: "join", player };
    room.broadcast(JSON.stringify(joinMessage), [connection.id]);
  },

  onMessage(message, sender, room) {
    let parsed: unknown;
    try {
      if (typeof message !== "string") return;
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    const players = getPlayers(room.id);
    const player = players.get(sender.id);
    if (!player) return;

    if (isProfileMessage(parsed)) {
      player.name = parsed.name.trim().replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 18) || player.name;
      if (/^#[0-9a-fA-F]{6}$/.test(parsed.color)) player.color = parsed.color;
      const profileMessage: PlayerProfileMessage = { type: "player-profile", player };
      room.broadcast(JSON.stringify(profileMessage), [sender.id]);
      return;
    }

    if (isChatMessage(parsed)) {
      if (isRateLimited(room.id, sender.id, 750)) return;
      const text = parsed.text.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 140);
      if (!text) return;
      const chatMessage: ChatBroadcastMessage = {
        type: "chat",
        id: player.id,
        name: player.name,
        text,
        timestamp: Date.now(),
      };
      room.broadcast(JSON.stringify(chatMessage));
      return;
    }

    if (!isMoveMessage(parsed)) return;

    player.x = Math.max(-24, Math.min(24, parsed.x));
    player.y = Math.max(0, Math.min(8, parsed.y));
    player.z = Math.max(-24, Math.min(24, parsed.z));
    player.ry = parsed.ry;

    const moveMessage: PlayerMoveMessage = { type: "player-move", player };
    room.broadcast(JSON.stringify(moveMessage), [sender.id]);
  },

  onClose(connection, room) {
    const players = getPlayers(room.id);
    if (!players.delete(connection.id)) return;
    lastActionAt.delete(`${room.id}:${connection.id}`);
    const leaveMessage: LeaveMessage = { type: "leave", id: connection.id };
    room.broadcast(JSON.stringify(leaveMessage));
    if (players.size === 0) playersByRoom.delete(room.id);
  },
};

export default server;
