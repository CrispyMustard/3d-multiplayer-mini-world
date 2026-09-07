import type * as Party from "partykit/server";
import type {
  JoinMessage,
  LeaveMessage,
  MoveMessage,
  PlayerMoveMessage,
  PlayerState,
  ExistingPlayersMessage,
} from "../types";

const players = new Map<string, PlayerState>();

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

const server: Party.PartyKitServer = {
  onConnect(connection, room) {
    const player: PlayerState = {
      id: connection.id,
      x: 0,
      y: 0,
      z: 0,
      ry: 0,
      color: randomColor(),
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

    if (!isMoveMessage(parsed)) return;
    const player = players.get(sender.id);
    if (!player) return;

    player.x = parsed.x;
    player.y = parsed.y;
    player.z = parsed.z;
    player.ry = parsed.ry;

    const moveMessage: PlayerMoveMessage = { type: "player-move", player };
    room.broadcast(JSON.stringify(moveMessage), [sender.id]);
  },

  onClose(connection, room) {
    if (!players.delete(connection.id)) return;
    const leaveMessage: LeaveMessage = { type: "leave", id: connection.id };
    room.broadcast(JSON.stringify(leaveMessage));
  },
};

export default server;
