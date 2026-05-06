import { Canvas, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { applyBumpTravel } from "../lib/vehicleKinematics";
import type { AxlePreset } from "../lib/vehicleTypes";
import type { VehiclePointKey, VehiclePointMap } from "../lib/vehicleTypes";
import { BUMP_TRANSLATE_KEYS } from "../lib/vehicleTypes";
import { useSuspensionStore } from "../store/suspensionStore";

const S = 0.001;

function v3(p: { x: number; y: number }) {
  return new THREE.Vector3(p.x * S, p.y * S, 0);
}

function DraggablePivot({
  position,
  pkey,
  color,
  hoverColor,
  enabled,
  travelMm,
}: {
  position: THREE.Vector3;
  pkey: VehiclePointKey;
  color: string;
  hoverColor: string;
  enabled: boolean;
  travelMm: number;
}) {
  const updatePoint = useSuspensionStore((s) => s.updatePoint);
  const [hover, setHover] = useState(false);
  const dragging = useRef(false);
  const { camera, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  const onMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const rect = gl.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(plane, hit)) {
      let nx = hit.x / S;
      let ny = hit.y / S;
      if (BUMP_TRANSLATE_KEYS.includes(pkey)) ny -= travelMm;
      updatePoint(pkey, { x: nx, y: ny });
    }
  };

  const endDrag = () => {
    dragging.current = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", endDrag);
    gl.domElement.style.cursor = "grab";
  };

  return (
    <mesh
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (enabled) setHover(true);
      }}
      onPointerOut={() => setHover(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!enabled) return;
        dragging.current = true;
        gl.domElement.style.cursor = "grabbing";
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", endDrag);
      }}
      renderOrder={10}
    >
      <sphereGeometry args={[enabled ? 0.011 : 0.007, 14, 14]} />
      <meshStandardMaterial
        color={hover && enabled ? hoverColor : color}
        emissive={hover && enabled ? hoverColor : "#000000"}
        emissiveIntensity={hover && enabled ? 0.35 : 0}
        metalness={0.25}
        roughness={0.45}
      />
    </mesh>
  );
}

function seg(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
): [THREE.Vector3, THREE.Vector3] | null {
  if (!a || !b) return null;
  return [v3(a), v3(b)];
}

function Rig({
  pts,
  axle,
  designMode,
  travelMm,
}: {
  pts: VehiclePointMap;
  axle: AxlePreset;
  designMode: boolean;
  travelMm: number;
}) {
  const lower = seg(pts.control_arm_inner, pts.control_arm_outer);
  const upper = seg(pts.upper_arm_inner, pts.upper_arm_outer);
  const spring = seg(pts.spring_mount_chassis, pts.spring_mount_arm);
  const dcha = pts.damper_mount_chassis;
  const darm = pts.damper_mount_arm;
  const damperSeg: [THREE.Vector3, THREE.Vector3] | null =
    dcha && darm
      ? [
          v3(dcha).add(new THREE.Vector3(4 * S, 0, 0)),
          v3(darm).add(new THREE.Vector3(4 * S, 0, 0)),
        ]
      : null;
  const strutMp =
    pts.top_mount && pts.spring_mount_arm
      ? seg(pts.top_mount, pts.spring_mount_arm)
      : null;

  const wc = pts.wheel_center ? v3(pts.wheel_center) : null;
  const wheelDir = useMemo(() => {
    const lo = pts.control_arm_outer;
    const hi = pts.upper_arm_outer ?? pts.top_mount;
    if (!lo || !hi) return new THREE.Vector3(0, -1, 0);
    const d = v3(lo).sub(v3(hi));
    const l = d.length();
    if (l < 1e-8) return new THREE.Vector3(0, -1, 0);
    return d.normalize();
  }, [pts.control_arm_outer, pts.upper_arm_outer, pts.top_mount]);

  const wheelQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    const axis = new THREE.Vector3(0, 1, 0);
    const t = wheelDir.clone();
    if (t.lengthSq() < 1e-10) return q;
    q.setFromUnitVectors(axis, t.normalize());
    return q;
  }, [wheelDir]);

  const pivotKeys = useMemo(() => Object.keys(pts) as VehiclePointKey[], [pts]);

  return (
    <group>
      {upper && <Line points={upper} color="#3b82f6" lineWidth={2.4} />}
      {lower && <Line points={lower} color="#22c55e" lineWidth={2.4} />}
      {axle.type === "macpherson" && strutMp && (
        <Line points={strutMp} color="#a78bfa" lineWidth={2} />
      )}
      {axle.type === "double_wishbone" && upper && pts.wheel_center && (
        <Line points={[upper[1], v3(pts.wheel_center)]} color="#a78bfa" lineWidth={1.8} />
      )}
      {spring && <Line points={spring} color="#eab308" lineWidth={2.8} />}
      {damperSeg && <Line points={damperSeg} color="#ef4444" lineWidth={2.8} />}
      {wc && (
        <>
          <mesh position={wc} quaternion={wheelQuat}>
            <torusGeometry args={[0.085, 0.022, 16, 48]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={wc.clone().add(wheelDir.clone().multiplyScalar(-0.035))} quaternion={wheelQuat}>
            <cylinderGeometry args={[0.055, 0.055, 0.028, 28]} />
            <meshStandardMaterial color="#0f172a" metalness={0.35} roughness={0.55} />
          </mesh>
        </>
      )}

      {designMode &&
        pivotKeys.map((k) => {
          const p = pts[k];
          if (!p) return null;
          return (
            <DraggablePivot
              key={k}
              pkey={k}
              position={v3(p)}
              color="#64748b"
              hoverColor="#f472b6"
              enabled
              travelMm={travelMm}
            />
          );
        })}
    </group>
  );
}

export function SuspensionCanvas() {
  const workflow = useSuspensionStore((s) => s.workflow);
  const points = useSuspensionStore((s) => s.points);
  const travelMm = useSuspensionStore((s) => s.travelMm);
  const axle = useSuspensionStore((s) => s.getAxlePresetState());
  const live = useMemo(() => applyBumpTravel(points, travelMm), [points, travelMm]);
  const designMode = workflow === "design" || workflow === "optimize";

  return (
    <div className="h-full w-full min-h-[200px]" style={{ touchAction: "none" }}>
      <Canvas
        className="h-full w-full"
        resize={{ scroll: false, debounce: 0 }}
        orthographic
        camera={{ position: [0, 0.35, 3.2], zoom: 88, near: 0.01, far: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#06080c"]} />
        <ambientLight intensity={0.38} />
        <directionalLight position={[3, 6, 4]} intensity={1.1} />
        <directionalLight position={[-4, 2, -2]} intensity={0.4} color="#38bdf8" />

        <Rig pts={live} axle={axle} designMode={designMode} travelMm={travelMm} />

        <OrbitControls enableRotate={false} minZoom={65} maxZoom={135} target={[0.02, 0.12, 0]} />
        <gridHelper args={[3.4, 30, "#0ea5e9", "#111827"]} position={[0, -0.06, -0.02]} />
      </Canvas>
    </div>
  );
}
