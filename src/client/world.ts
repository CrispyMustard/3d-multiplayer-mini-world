import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface WorldTextures {
  cobblestone: THREE.Texture;
  road: THREE.Texture;
  oak: THREE.Texture;
}

const shadow = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};

export function buildWorld(scene: THREE.Scene, textures: WorldTextures): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const addObstacle = (x: number, z: number, width: number, depth: number): void => {
    obstacles.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 });
  };

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 0.16, 48),
    new THREE.MeshStandardMaterial({ map: textures.cobblestone, color: 0xc5bba5, roughness: 1 }),
  );
  plaza.position.y = 0.08;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const beacon = new THREE.Group();
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.35, 0.9, 12),
    new THREE.MeshStandardMaterial({ map: textures.cobblestone, color: 0xaca58f, roughness: 1 }),
  );
  pedestal.position.y = 0.45;
  const wellRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.18, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x777263, roughness: 1 }),
  );
  wellRim.position.y = 0.95;
  wellRim.rotation.x = Math.PI / 2;
  const postMaterial = new THREE.MeshStandardMaterial({ map: textures.oak, color: 0x9a7046, roughness: 1 });
  const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), postMaterial);
  leftPost.position.set(-0.9, 1.75, 0);
  const rightPost = leftPost.clone();
  rightPost.position.x = 0.9;
  const wellRoof = new THREE.Mesh(
    new THREE.ConeGeometry(1.55, 0.85, 4),
    new THREE.MeshStandardMaterial({ color: 0x6f2f25, roughness: 1 }),
  );
  wellRoof.position.y = 3.1;
  wellRoof.rotation.y = Math.PI / 4;
  beacon.add(pedestal, wellRim, leftPost, rightPost, wellRoof);
  beacon.position.set(0, 0, -2.4);
  shadow(beacon);
  scene.add(beacon);
  addObstacle(0, -2.4, 2, 2);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 40),
    new THREE.MeshStandardMaterial({ map: textures.road, color: 0xb6aa91, roughness: 1 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.025, 3);
  road.receiveShadow = true;
  scene.add(road);

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x2f6b3b, roughness: 1 });
  const treeLocations: Array<[number, number, number]> = [
    [-15, -15, 1.1], [-10, -18, 0.9], [-18, -7, 1.2], [-16, 8, 1], [-12, 15, 1.15],
    [16, 14, 1.1], [19, 6, 0.9], [15, -16, 1.2], [7, 17, 1], [-5, 19, 0.95],
  ];
  for (const [x, z, scale] of treeLocations) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3, 8), trunkMaterial);
    trunk.position.y = 1.5;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4, 10), leafMaterial);
    crown.position.y = 4;
    tree.add(trunk, crown);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    shadow(tree);
    scene.add(tree);
    addObstacle(x, z, scale, scale);
  }

  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 1 });
  const rockLocations: Array<[number, number, number]> = [[-8, -9, 1.4], [-19, 17, 1.8], [8, 11, 1.2], [19, -5, 1.5]];
  for (const [x, z, size] of rockLocations) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), rockMaterial);
    rock.position.set(x, size * 0.55, z);
    rock.scale.y = 0.7;
    rock.rotation.set(0.2, x, 0.1);
    shadow(rock);
    scene.add(rock);
    addObstacle(x, z, size * 1.5, size * 1.5);
  }

  const cabin = new THREE.Group();
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3.5, 5),
    new THREE.MeshStandardMaterial({ map: textures.oak, color: 0x9d744a, roughness: 1 }),
  );
  walls.position.y = 1.75;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4.6, 2.4, 4),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 1 }),
  );
  roof.position.y = 4.6;
  roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x3f2a1d }),
  );
  door.position.set(0, 1.1, 2.56);
  cabin.add(walls, roof, door);
  cabin.position.set(10, 0, -10);
  shadow(cabin);
  scene.add(cabin);
  new GLTFLoader().load(`${import.meta.env.BASE_URL}models/medieval-inn.glb`, ({ scene: inn }) => {
    inn.position.set(10, 0, -10);
    shadow(inn);
    scene.remove(cabin);
    scene.add(inn);
  });
  addObstacle(10, -10, 6.5, 5.5);

  const stoneMaterial = new THREE.MeshStandardMaterial({ map: textures.cobblestone, color: 0x9d998c, roughness: 1 });
  const gate = new THREE.Group();
  const gateLeft = new THREE.Mesh(new THREE.BoxGeometry(1.5, 5, 2), stoneMaterial);
  gateLeft.position.set(-3.2, 2.5, 0);
  const gateRight = gateLeft.clone();
  gateRight.position.x = 3.2;
  const gateTop = new THREE.Mesh(new THREE.BoxGeometry(7.9, 1.2, 2), stoneMaterial);
  gateTop.position.y = 5.3;
  const bannerMaterial = new THREE.MeshStandardMaterial({ color: 0x7a2633, roughness: 0.95, side: THREE.DoubleSide });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), bannerMaterial);
  banner.position.set(0, 4.25, -1.02);
  gate.add(gateLeft, gateRight, gateTop, banner);
  gate.position.set(0, 0, 21);
  shadow(gate);
  scene.add(gate);
  addObstacle(-3.2, 21, 1.7, 2.2);
  addObstacle(3.2, 21, 1.7, 2.2);

  const lanternMaterial = new THREE.MeshStandardMaterial({ color: 0xffb84d, emissive: 0xff7a1a, emissiveIntensity: 2 });
  for (const [x, z] of [[-3.5, 5], [3.5, 5], [-3.5, 13], [3.5, 13]] as Array<[number, number]>) {
    const post = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 2.8, 8), postMaterial);
    pole.position.y = 1.4;
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.4), lanternMaterial);
    lantern.position.y = 2.75;
    const light = new THREE.PointLight(0xff9d45, 8, 7, 2);
    light.position.y = 2.7;
    post.add(pole, lantern, light);
    post.position.set(x, 0, z);
    shadow(post);
    scene.add(post);
  }

  return obstacles;
}

export function collidesWithWorld(x: number, z: number, obstacles: Obstacle[], radius = 0.55): boolean {
  return obstacles.some((box) =>
    x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ,
  );
}
