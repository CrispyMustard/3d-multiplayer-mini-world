import * as THREE from "three";

export interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const shadow = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};

export function buildWorld(scene: THREE.Scene): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const addObstacle = (x: number, z: number, width: number, depth: number): void => {
    obstacles.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 });
  };

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 0.16, 48),
    new THREE.MeshStandardMaterial({ color: 0xb8b19f, roughness: 0.9 }),
  );
  plaza.position.y = 0.08;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const beacon = new THREE.Group();
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.2, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x475569 }),
  );
  pedestal.position.y = 0.6;
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.75),
    new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x155e75, emissiveIntensity: 1.5 }),
  );
  crystal.position.y = 2;
  beacon.add(pedestal, crystal);
  beacon.position.set(0, 0, -2.4);
  shadow(beacon);
  scene.add(beacon);
  addObstacle(0, -2.4, 2, 2);

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
    new THREE.MeshStandardMaterial({ color: 0xa86f3d, roughness: 0.95 }),
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
  addObstacle(10, -10, 6.5, 5.5);

  return obstacles;
}

export function collidesWithWorld(x: number, z: number, obstacles: Obstacle[], radius = 0.55): boolean {
  return obstacles.some((box) =>
    x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ,
  );
}
