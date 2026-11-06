'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CatmullRomCurve3, Color, Group, InstancedMesh, Mesh, MeshPhysicalMaterial, Object3D, Vector2, Vector3 } from 'three';
import { storyProgress } from '@/motion/progress';
import { orderStore } from '@/order/store';
import { poseAt } from './director';
import { dampSettled } from './settle';
import { brandTexture, coffeeTexture, steamTexture } from './textures';
import { createFrameBudget } from '@/lib/tier';
interface Props { onReady(): void; onFailure(): void; }
const cupProfile = [
 [.01,-.78],[.48,-.78],[.65,-.76],[.76,-.68],[.86,-.54],[.96,-.30],[1.05,.02],[1.12,.38],[1.15,.65],[1.15,.72],[1.12,.76],
 [1.07,.76],[1.04,.70],[1.04,.48],[.98,.15],[.90,-.20],[.79,-.48],[.64,-.59],[.01,-.59],
].map(([x,y]) => new Vector2(x,y));
const saucerProfile = [[.01,0],[.8,0],[1.12,.015],[1.6,.04],[1.95,.10],[2.1,.17],[2.13,.22],[2.10,.25],[1.98,.23],[1.6,.15],[1.1,.12],[.8,.12],[.01,.12]].map(([x,y]) => new Vector2(x,y));
const handle = new CatmullRomCurve3([new Vector3(1.05,.53,0),new Vector3(1.56,.62,0),new Vector3(1.83,.35,0),new Vector3(1.75,-.15,0),new Vector3(1.30,-.43,0),new Vector3(.88,-.35,0)]);
function Director({ onReady, onFailure, low, onSlow }: Props & { low: boolean; onSlow(): void }) {
 const group = useRef<Group>(null);
 const saucer = useRef<Group>(null);
 const liquid = useRef<Group>(null);
 const pour = useRef<Mesh>(null);
 const milkPour = useRef<Mesh>(null);
 const sweetener = useRef<Group>(null);
 const steam = useRef<Group>(null);
 const milkSurface = useRef<MeshPhysicalMaterial>(null);
 const beans = useRef<InstancedMesh>(null);
 const foam = useRef<MeshPhysicalMaterial>(null);
 const { camera, invalidate, gl, size } = useThree();
 const textures = useMemo(() => ({ brand: brandTexture(), black: coffeeTexture(false), white: coffeeTexture(true), steam: steamTexture() }), []);
 const budget = useMemo(() => createFrameBudget(), []);
 const scratch = useMemo(() => new Object3D(), []);
 const color = useMemo(() => new Color(), []);
 const first = useRef(true);
 const lastProgress = useRef(-1);
 const lastFrame = useRef(0);
 const lastChange = useRef(0);
 const sampling = useRef(false);
 const targetMilk = useRef(1);
 const milkValue = useRef(1);
 const heldProgress = useRef(storyProgress.get());
 const mobile = size.width <= 640;
 const capture = typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture');
 useEffect(() => {
  const unsubProgress = storyProgress.subscribe(invalidate);
  const unsubOrder = orderStore.subscribe(() => invalidate());
  const canvas = gl.domElement;
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  canvas.addEventListener('webglcontextlost', lost);
  const visible = () => { budget.reset(); lastFrame.current = 0; if (!document.hidden) invalidate(); };
  document.addEventListener('visibilitychange', visible);
  invalidate();
  return () => { unsubProgress(); unsubOrder(); canvas.removeEventListener('webglcontextlost', lost); document.removeEventListener('visibilitychange', visible); Object.values(textures).forEach((texture) => texture.dispose()); };
 }, [gl, invalidate, onFailure, textures, budget]);
 useFrame((_, dt) => {
  if (document.hidden) return;
  const state = orderStore.getState();
  if (!state.drawer) heldProgress.current = storyProgress.get();
  const p = heldProgress.current;
  const pose = poseAt(p, mobile);
  if (group.current) {
   group.current.position.set(capture ? 0 : pose.x, pose.y - .3, 0);
   group.current.rotation.set(pose.rx, pose.ry, pose.rz);
   group.current.scale.setScalar(pose.scale);
  }
  camera.position.set(0, pose.cameraY, capture && size.width < size.height ? pose.cameraZ + 4 : mobile ? 11 : pose.cameraZ);
  camera.lookAt(0, .1, 0);
  targetMilk.current = state.selection.milk === 'none' ? 0 : pose.milk;
  milkValue.current = first.current || capture ? targetMilk.current : dampSettled(milkValue.current, targetMilk.current, 10, Math.min(dt, .05));
  const milk = milkValue.current;
  if (liquid.current) {
   liquid.current.visible = pose.fill > .02;
   const fill = pose.fill * (state.selection.size === 'small' ? .74 : state.selection.size === 'regular' ? .92 : 1);
   liquid.current.position.y = -.48 + fill * 1.12;
   liquid.current.scale.setScalar(.73 + fill * .30);
  }
  if (foam.current) {
   const roast = state.selection.roast === 'dark' ? 0xd8c5b2 : state.selection.roast === 'light' ? 0xfff5e5 : 0xf2e5d6;
   color.set(roast);
   foam.current.color.copy(color);
   foam.current.roughness = .25;
  }
  if (milkSurface.current) milkSurface.current.opacity = milk;
  if (saucer.current) {
   saucer.current.position.y = -1.12 - (1 - pose.saucer) * .9;
   saucer.current.scale.setScalar(.85 + pose.saucer * .15);
   saucer.current.visible = pose.saucer > .02;
  }
  if (pour.current) {
   pour.current.visible = pose.pour > .03;
   pour.current.scale.set(.05 + pose.pour * .03, pose.pour * 1.7, .05 + pose.pour * .03);
   pour.current.position.set(.18, .8 + pose.pour * 1.7, 0);
  }
  if (milkPour.current) {
   const strength = Math.sin(pose.milk * Math.PI);
   milkPour.current.visible = state.selection.milk !== 'none' && strength > .05;
   milkPour.current.scale.set(.08 * strength, strength * 1.8, .08 * strength);
   milkPour.current.position.set(-.25, .8 + strength * 1.8, 0);
  }
  if (sweetener.current) {
   sweetener.current.visible = p > .62 && state.selection.sweetener !== 'none';
   sweetener.current.scale.setScalar(Math.min(1, (p - .62) * 8));
  }
  const steaming = p > .8 && !state.drawer && !capture;
  if (steam.current) {
   steam.current.visible = steaming;
   if (steaming) steam.current.children.forEach((sprite, i) => {
    const cycle = (performance.now() * .00018 + i / 3) % 1;
    sprite.position.set(Math.sin(cycle * 5 + i) * .25, .8 + cycle * 1.7, .15);
    sprite.scale.set(.45 + cycle * .5, .8 + cycle * .6, 1);
   });
  }
  if (beans.current) {
   beans.current.visible = pose.beans > .01;
   const count = low ? 36 : 72;
   for (let i = 0; i < count; i++) {
    const t = i / count, angle = t * Math.PI * 2 + p * 8;
    const radius = 1.8 + Math.sin(i * 2.4) * .45;
    scratch.position.set(Math.cos(angle) * radius, Math.sin(angle) * .8 + .45 + Math.cos(i * 3.2) * .6, Math.sin(angle) * radius);
    scratch.rotation.set(i * .7, angle, i * 1.4);
    const s = (.8 + Math.sin(i) * .2) * pose.beans;
    scratch.scale.set((state.selection.blend === 'dark-reserve' ? .15 : .13) * s, .19 * s, .10 * s); scratch.updateMatrix(); beans.current.setMatrixAt(i, scratch.matrix);
   }
   beans.current.instanceMatrix.needsUpdate = true;
   (beans.current.material as MeshPhysicalMaterial).color.set(state.selection.roast === 'dark' ? 0x352015 : state.selection.roast === 'light' ? 0x976342 : 0x57351f);
  }
  const now = performance.now();
  const active = Math.abs(lastProgress.current - p) > .00001;
  if (active) lastChange.current = now;
  const moving = !state.drawer && now - lastChange.current < 120;
  const rendering = moving || steaming;
  if (rendering && sampling.current && lastFrame.current && budget.push(now - lastFrame.current, now) === 'stepDown' && !capture) onSlow();
  if (!rendering) budget.reset();
  sampling.current = rendering;
  lastFrame.current = now;
  lastProgress.current = p;
  if ((moving || steaming || milk !== targetMilk.current) && !state.drawer) invalidate();
  if (first.current) { first.current = false; requestAnimationFrame(onReady); }
 });
 return <>
  <ambientLight intensity={.55} />
  <directionalLight position={[-4,7,5]} intensity={3.2} color={0xffebd0} castShadow={!low} shadow-mapSize={[1024,1024]} shadow-normalBias={.04} />
  <directionalLight position={[5,2,-3]} intensity={1.3} color={0xffdcc1} />
  <Environment resolution={128} frames={1}>
   <Lightformer position={[-4,5,2]} scale={[5,7,1]} intensity={3} />
   <Lightformer position={[3,3,5]} scale={[3,4,1]} intensity={1.2} />
  </Environment>
  <group ref={group}>
   <mesh castShadow receiveShadow><latheGeometry args={[cupProfile,96]} /><meshPhysicalMaterial color={0xf4e6ce} roughness={.28} metalness={0} clearcoat={.5} clearcoatRoughness={.26} /></mesh>
   <mesh castShadow><tubeGeometry args={[handle,48,.13,12,false]} /><meshPhysicalMaterial color={0xf0e1c8} roughness={.30} clearcoat={.5} /></mesh>
   <mesh position={[0,-.02,.009]}><cylinderGeometry args={[1.12,.965,.65,64,1,true,-.70,1.4]} /><meshStandardMaterial map={textures.brand} transparent polygonOffset polygonOffsetFactor={-4} roughness={.45} depthWrite={false} /></mesh>
   <group ref={liquid}>
    <mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[1,96]} /><meshPhysicalMaterial ref={foam} map={textures.black} roughness={.25} clearcoat={.25} /></mesh>
    <mesh position={[0,.003,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[1,96]} /><meshPhysicalMaterial ref={milkSurface} map={textures.white} transparent opacity={1} depthWrite={false} roughness={.4} /></mesh>
   </group>
   <mesh ref={pour}><cylinderGeometry args={[1,.8,2,12]} /><meshPhysicalMaterial color={0x66391c} roughness={.27} /></mesh>
   <mesh ref={milkPour}><cylinderGeometry args={[1,.8,2,12]} /><meshPhysicalMaterial color={0xffeed4} roughness={.3} /></mesh>
   <group ref={sweetener} position={[-1.2,-.65,.9]}>
    <mesh rotation={[.1,.2,.1]}><boxGeometry args={[.24,.24,.24]} /><meshStandardMaterial color={0xf2e2c6} roughness={.85} /></mesh>
   </group>
   <group ref={steam}>{[0,1,2].map((i) => <sprite key={i}><spriteMaterial map={textures.steam} transparent opacity={.045} depthWrite={false} /></sprite>)}</group>
   <group ref={saucer}><mesh castShadow receiveShadow><latheGeometry args={[saucerProfile,96]} /><meshPhysicalMaterial color={0xefe0c5} roughness={.32} clearcoat={.35} /></mesh>
    <mesh position={[0,.255,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.94,.022,8,96]} /><meshStandardMaterial color={0x8c2f39} roughness={.5} /></mesh>
   </group>
   <instancedMesh ref={beans} args={[undefined,undefined,low ? 36 : 72]} castShadow><sphereGeometry args={[1,12,8]} /><meshStandardMaterial color={0x57351f} roughness={.65} /></instancedMesh>
  </group>
  {!capture && <mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.7,0]} receiveShadow><planeGeometry args={[200,200]} /><shadowMaterial transparent opacity={.12} /></mesh>}
 </>;
}
export default function CoffeeScene({ onReady, onFailure }: Props) {
 const [low, setLow] = useState(false);
 const slow = useRef(0);
 const onSlow = useCallback(() => { slow.current++; if (slow.current === 1) setLow(true); else onFailure(); }, [onFailure]);
 const capture = typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture');
 return <div className="scene-canvas"><Canvas frameloop="demand" shadows={low ? false : 'percentage'} dpr={[1,low ? 1 : 1.5]} camera={{ fov: 35, position: [0,4,8.5] }} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: capture }} fallback={<span />} onCreated={({ gl }) => { gl.setClearAlpha(0); }}>
   <Director onReady={onReady} onFailure={onFailure} low={low} onSlow={onSlow} />
 </Canvas></div>;
}
