import * as THREE from "three";
import { PartySocket } from "partysocket";
import type { MoveMessage, PlayerState, ServerMessage } from "../types";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root was not found");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 35, 100);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 2));
const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
sunlight.position.set(15, 25, 10);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -30;
sunlight.shadow.camera.right = 30;
sunlight.shadow.camera.top = 30;
sunlight.shadow.camera.bottom = -30;
scene.add(sunlight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x668b5a, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground, new THREE.GridHelper(50, 50, 0x38533c, 0x52734f));

const createAvatar = (color: string): THREE.Mesh => {
  const avatar = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1.8, 1),
    new THREE.MeshStandardMaterial({ color }),
  );
  avatar.position.y = 0.9;
  avatar.castShadow = true;
  return avatar;
};

const createLabel = (text: string): THREE.Sprite => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create label canvas");
  context.fillStyle = "rgba(15, 23, 42, 0.8)";
  context.roundRect(4, 4, 248, 56, 12);
  context.fill();
  context.fillStyle = "#f8fafc";
  context.font = "bold 28px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 128, 32);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  label.scale.set(2.2, 0.55, 1);
  label.position.y = 2.2;
  return label;
};

const localPosition = new THREE.Vector3(0, 0, 0);
const localRotation = { y: 0 };
const localAvatar = createAvatar(`#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`);
localAvatar.add(createLabel("You"));
scene.add(localAvatar);

const remotePlayers = new Map<string, { mesh: THREE.Mesh; target: THREE.Vector3; ry: number }>();
const addRemotePlayer = (player: PlayerState): void => {
  if (remotePlayers.has(player.id)) return;
  const mesh = createAvatar(player.color);
  mesh.add(createLabel(`Player ${player.id.slice(0, 5)}`));
  mesh.position.set(player.x, player.y + 0.9, player.z);
  mesh.rotation.y = player.ry;
  scene.add(mesh);
  remotePlayers.set(player.id, { mesh, target: new THREE.Vector3(player.x, player.y + 0.9, player.z), ry: player.ry });
};
const removeRemotePlayer = (id: string): void => {
  const remote = remotePlayers.get(id);
  if (!remote) return;
  scene.remove(remote.mesh);
  remote.mesh.geometry.dispose();
  (remote.mesh.material as THREE.Material).dispose();
  remotePlayers.delete(id);
};

const host = import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";
const socket = new PartySocket({ host, room: "main" });
socket.addEventListener("message", (event: MessageEvent<string>) => {
  let message: ServerMessage;
  try { message = JSON.parse(event.data) as ServerMessage; } catch { return; }
  if (message.type === "existing-players") message.players.forEach(addRemotePlayer);
  if (message.type === "join") addRemotePlayer(message.player);
  if (message.type === "player-move") {
    const remote = remotePlayers.get(message.player.id);
    if (remote) {
      remote.target.set(message.player.x, message.player.y + 0.9, message.player.z);
      remote.ry = message.player.ry;
    }
  }
  if (message.type === "leave") removeRemotePlayer(message.id);
});

const keys = new Set<string>();
let jumpQueued = false;
addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.code === "Space" && !event.repeat) jumpQueued = true;
});
addEventListener("keyup", (event) => { keys.delete(event.key.toLowerCase()); });
addEventListener("blur", () => keys.clear());

let cameraYaw = 0;
let cameraPitch = 0.45;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
renderer.domElement.addEventListener("pointerdown", (event) => {
  dragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  cameraYaw -= (event.clientX - lastPointerX) * 0.006;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch - (event.clientY - lastPointerY) * 0.004, 0.15, 1.25);
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
});
renderer.domElement.addEventListener("pointerup", (event) => {
  dragging = false;
  renderer.domElement.releasePointerCapture(event.pointerId);
});

const clock = new THREE.Clock();
const direction = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();
const speed = 6;
const worldLimit = 24;
const gravity = 22;
const jumpSpeed = 9;
let verticalVelocity = 0;

const sendMove = (): void => {
  const move: MoveMessage = { type: "move", x: localPosition.x, y: localPosition.y, z: localPosition.z, ry: localRotation.y };
  socket.send(JSON.stringify(move));
};
setInterval(sendMove, 1000 / 30);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const hud = document.createElement("div");
hud.className = "hud";
hud.innerHTML = "<strong>3D Mini-World</strong><small id=\"connection-status\">Connecting…</small><br><small>WASD to move · Space to jump · drag to look</small>";
app.appendChild(hud);
const connectionStatus = hud.querySelector<HTMLElement>("#connection-status");
const setConnectionStatus = (text: string, color: string): void => {
  if (connectionStatus) {
    connectionStatus.textContent = text;
    connectionStatus.style.color = color;
  }
};
socket.addEventListener("open", () => setConnectionStatus("Connected to room: main", "#86efac"));
socket.addEventListener("close", () => setConnectionStatus("Disconnected — reconnecting…", "#fca5a5"));
socket.addEventListener("error", () => setConnectionStatus("Connection error", "#fca5a5"));

const animate = (): void => {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  direction.set(Number(keys.has("d")) - Number(keys.has("a")), 0, Number(keys.has("s")) - Number(keys.has("w")));
  if (direction.lengthSq() > 0) {
    direction.normalize();
    const rotatedDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    localPosition.addScaledVector(rotatedDirection, speed * delta);
    localRotation.y = Math.atan2(rotatedDirection.x, rotatedDirection.z);
  }
  if (jumpQueued && localPosition.y === 0) verticalVelocity = jumpSpeed;
  jumpQueued = false;
  verticalVelocity -= gravity * delta;
  localPosition.y = Math.max(0, localPosition.y + verticalVelocity * delta);
  if (localPosition.y === 0) verticalVelocity = 0;
  localPosition.x = THREE.MathUtils.clamp(localPosition.x, -worldLimit, worldLimit);
  localPosition.z = THREE.MathUtils.clamp(localPosition.z, -worldLimit, worldLimit);
  localAvatar.position.set(localPosition.x, localPosition.y + 0.9, localPosition.z);
  localAvatar.rotation.y = localRotation.y;

  cameraOffset.set(Math.sin(cameraYaw) * Math.cos(cameraPitch) * 8, Math.sin(cameraPitch) * 8, Math.cos(cameraYaw) * Math.cos(cameraPitch) * 8);
  cameraTarget.copy(localPosition).add(cameraOffset);
  camera.position.lerp(cameraTarget, 1 - Math.pow(0.001, delta));
  camera.lookAt(localPosition.x, localPosition.y + 0.8, localPosition.z);

  for (const remote of remotePlayers.values()) {
    remote.mesh.position.lerp(remote.target, 1 - Math.pow(0.001, delta));
    remote.mesh.rotation.y = THREE.MathUtils.lerp(remote.mesh.rotation.y, remote.ry, 1 - Math.pow(0.001, delta));
  }
  renderer.render(scene, camera);
};

animate();
