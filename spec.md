# Specification: 3D Multiplayer Mini-World

## 1. Project Overview
A lightweight, web-based 3D multiplayer world where players can join via a browser URL, move around as avatar cubes, and see each other's movement in real time.

## 2. Tech Stack
- **Build Tool & Language:** Vite + Vanilla TypeScript
- **3D Engine:** Three.js
- **Multiplayer Server:** PartyKit (`partykit`)
- **WebSocket Client:** PartySocket (`partysocket`)

## 3. Project Structure
- `src/client/`: Three.js rendering, local player input, and camera logic.
- `src/server/`: PartyKit WebSocket server handling player connections and position broadcasts.

---

## 4. Implementation Tasks

### Phase 1: Environment & Setup
- [ ] Initialize a Vite TypeScript project.
- [ ] Install dependencies: `three`, `partykit`, `partysocket`.
- [ ] Install type definitions: `@types/three`.
- [ ] Configure `package.json` scripts for running Vite (`npm run dev`) and PartyKit (`npx partykit dev`).

### Phase 2: PartyKit Backend (`src/server/main.ts`)
- [ ] Maintain an in-memory map of active players: `{ id: string, x: number, y: number, z: number, ry: number, color: string }`.
- [ ] Assign a random hex color to each player on connection.
- [ ] On `onConnect`: Broadcast existing players to the new client and notify others of the new player.
- [ ] On `onMessage`: Listen for player position updates (`{ x, y, z, ry }`) and broadcast to all other clients.
- [ ] On `onClose`: Remove player from state and broadcast disconnect event to remaining clients.

### Phase 3: Three.js Frontend Environment (`src/client/main.ts`)
- [ ] Set up a WebGLRenderer, PerspectiveCamera, and Scene.
- [ ] Add a ground plane (50x50 size) with a grid helper or neutral material.
- [ ] Add ambient lighting and a directional light with basic shadows.
- [ ] Implement window resize listener to automatically adjust aspect ratio.

### Phase 4: Local Player Controller
- [ ] Render a local player avatar (a colored box or capsule).
- [ ] Implement keyboard listeners for WASD keys.
- [ ] Move the player avatar relative to delta time (`clock.getDelta()`).
- [ ] Implement a third-person camera that smoothly follows behind the player position.

### Phase 5: Network Synchronization
- [ ] Connect to PartyKit using `PartySocket`.
- [ ] Send local player position/rotation to the server at a fixed tick rate (30 updates per second).
- [ ] Maintain a map of remote player meshes in the client scene.
- [ ] When receiving network updates for remote players, smoothly interpolate (`lerp`) their positions to avoid jitter.
- [ ] Remove remote player meshes upon receiving disconnect messages.

---

## 5. Technical Rules & Constraints
1. **Tick Rate:** Do NOT send WebSocket messages inside `requestAnimationFrame`. Use a fixed 30 Hz interval timer.
2. **Frameworks:** Keep the project clean without React or external UI frameworks.
3. **Types:** Ensure all network payload interfaces (`PlayerState`, `MoveMessage`) are strongly typed in a shared `src/types.ts` file.