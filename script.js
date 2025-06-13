// Basic Minecraft-like voxel engine demo with Three.js

import * as THREE from 'three';

// === Setup renderer and scene ===
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue

// === Camera setup ===
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(8, 10, 8);

// === Controls variables ===
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let prevTime = performance.now();

const pointerLockSetup = () => {
  const instructions = document.body;
  instructions.addEventListener('click', () => {
    instructions.requestPointerLock();
  }, false);

  const onPointerLockChange = () => {
    if (document.pointerLockElement === document.body) {
      document.addEventListener('mousemove', onMouseMove, false);
    } else {
      document.removeEventListener('mousemove', onMouseMove, false);
    }
  };

  const onMouseMove = (event) => {
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    camera.rotation.y -= movementX * 0.002;
    camera.rotation.x -= movementY * 0.002;
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
  };

  document.addEventListener('pointerlockchange', onPointerLockChange, false);
};
pointerLockSetup();

// === Simple chunk size and block size ===
const CHUNK_SIZE = 16;
const BLOCK_SIZE = 1;

// Block types
const BLOCK_TYPES = {
  0: null, // air
  1: 'grass',
  2: 'dirt',
  3: 'stone',
};

// Selected block (default grass)
let selectedBlock = 1;

// Create block texture atlas placeholder (replace with Minosoft atlas URL)
const textureLoader = new THREE.TextureLoader();
const textureAtlas = textureLoader.load('https://i.imgur.com/l3OYZQX.png'); // placeholder atlas

textureAtlas.magFilter = THREE.NearestFilter;
textureAtlas.minFilter = THREE.NearestFilter;

// UV helper function for atlas coords (example: atlas 256x256 with 16x16 blocks of 16x16px each)
const atlasBlockSize = 1 / 16;
function getUVForBlock(id) {
  // Example: blocks 1..16 in row 0
  let x = (id - 1) * atlasBlockSize;
  return [
    new THREE.Vector2(x, 1 - atlasBlockSize),
    new THREE.Vector2(x + atlasBlockSize, 1 - atlasBlockSize),
    new THREE.Vector2(x + atlasBlockSize, 1),
    new THREE.Vector2(x, 1),
  ];
}

// === Create geometry for one block ===
function createBlockMesh(blockId, x, y, z) {
  if (blockId === 0) return null; // air, no mesh

  // Box geometry
  const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

  // Apply UV mapping for each face based on blockId (simplified: same texture on all faces)
  const uv = getUVForBlock(blockId);

  for (let i = 0; i < geometry.attributes.uv.count; i += 4) {
    geometry.attributes.uv.setXY(i + 0, uv[0].x, uv[0].y);
    geometry.attributes.uv.setXY(i + 1, uv[1].x, uv[1].y);
    geometry.attributes.uv.setXY(i + 2, uv[2].x, uv[2].y);
    geometry.attributes.uv.setXY(i + 3, uv[3].x, uv[3].y);
  }
  geometry.attributes.uv.needsUpdate = true;

  // Material
  const material = new THREE.MeshBasicMaterial({ map: textureAtlas });

  // Mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);

  return mesh;
}

// === World data (simple flat terrain) ===
const world = [];

for (let x = 0; x < CHUNK_SIZE; x++) {
  for (let z = 0; z < CHUNK_SIZE; z++) {
    // Flat terrain at y=0: grass on top, dirt below, stone deeper
    for (let y = 0; y < 8; y++) {
      let blockId = 0;
      if (y === 0) blockId = 1; // grass
      else if (y < 4) blockId = 2; // dirt
      else if (y < 8) blockId = 3; // stone
      if (blockId > 0) {
        const mesh = createBlockMesh(blockId, x, y, z);
        scene.add(mesh);
      }
    }
  }
}

// === Event listeners for movement ===
document.addEventListener('keydown', (e) => {
  switch(e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space':
      if (canJump) velocity.y += 8;
      canJump = false;
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch(e.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
  }
});

// === Hotbar block selection ===
document.getElementById('hotbar').addEventListener('click', (e) => {
  if(e.target.classList.contains('block')) {
    document.querySelectorAll('.block').forEach(b => b.classList.remove('selected'));
    e.target.classList.add('selected');
    selectedBlock = Number(e.target.dataset.block);
  }
});

// === Raycaster for block interaction ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let blocksMeshes = []; // keep track of meshes for interaction (to add later)

// === Basic gravity & movement simulation ===
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = performance.now();

  // Simple gravity
  velocity.y -= 9.8 * delta;
  velocity.x -= velocity.x * 10 * delta;
  velocity.z -= velocity.z * 10 * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  if (moveForward || moveBackward) velocity.z -= direction.z * 20 * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * 20 * delta;

  camera.position.x += velocity.x * delta;
  camera.position.y += velocity.y * delta;
  camera.position.z += velocity.z * delta;

  if (camera.position.y < 2) {
    velocity.y = 0;
    camera.position.y = 2;
    canJump = true;
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
