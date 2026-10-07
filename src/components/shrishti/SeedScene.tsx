import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Research } from "@/lib/shrishti-types";

// WebGL cannot read CSS tokens; this palette mirrors --known/--probable/... in styles.css.
const PALETTE = {
  seed: "#d9b77a",
  known: "#e2c08a",
  probable: "#8fc4a6",
  possible: "#8daed3",
  uncertain: "#7d8296",
  line: "#c9a96e",
};

function fib(i: number, n: number): THREE.Vector3 {
  const y = 1 - ((i + 0.5) / n) * 2;
  const r = Math.sqrt(1 - y * y);
  const t = i * Math.PI * (3 - Math.sqrt(5));
  return new THREE.Vector3(Math.cos(t) * r, y * 0.7, Math.sin(t) * r);
}

function Seed({ open }: { open: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    const m = ref.current;
    if (!m) return;
    m.rotation.y += dt * 0.12;
    m.rotation.x += dt * 0.04;
    m.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
    const s = 1 - open * 0.45;
    m.scale.lerp(new THREE.Vector3(s, s * 1.25, s), 1 - Math.exp(-3 * dt));
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.55, 3]} />
      <meshStandardMaterial
        color={PALETTE.seed}
        emissive={PALETTE.seed}
        emissiveIntensity={0.25}
        roughness={0.35}
        metalness={0.4}
        flatShading
      />
    </mesh>
  );
}

function Tree({ research, playKey }: { research: Research; playKey: number }) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const lastKey = useRef(playKey);

  const layout = useMemo(() => {
    const n = research.branches.length || 1;
    return research.branches.map((b, i) => {
      const dir = fib(i, n).normalize();
      const tip = dir.clone().multiplyScalar(2.1);
      const mid = dir.clone().multiplyScalar(1.1).add(new THREE.Vector3(0, 0.25, 0));
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), mid, tip);
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const leaves = b.nodes.map((node, j) => {
        const a = (j / Math.max(1, b.nodes.length)) * Math.PI * 2;
        const off = side
          .clone()
          .multiplyScalar(Math.cos(a) * 0.55)
          .add(new THREE.Vector3(0, Math.sin(a) * 0.45, 0))
          .add(dir.clone().multiplyScalar(0.45));
        return { pos: tip.clone().add(off), node };
      });
      return { name: b.name, curve, tip, leaves };
    });
  }, [research]);

  const nodeRefs = useRef<Array<THREE.Object3D | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);

  useFrame((state, raw) => {
    const dt = Math.min(raw, 0.05);
    if (lastKey.current !== playKey) {
      lastKey.current = playKey;
      progress.current = 0;
    }
    progress.current = Math.min(1, progress.current + dt / 4.5);
    const p = progress.current;
    if (group.current) {
      group.current.rotation.y += dt * 0.05;
      const tx = state.pointer.x * 0.15;
      const ty = state.pointer.y * 0.08;
      group.current.rotation.x += (ty - group.current.rotation.x) * (1 - Math.exp(-2 * dt));
      group.current.rotation.z += (-tx * 0.3 - group.current.rotation.z) * (1 - Math.exp(-2 * dt));
    }
    let k = 0;
    layout.forEach((b, i) => {
      const start = (i / layout.length) * 0.45;
      const bp = THREE.MathUtils.clamp((p - start) / 0.35, 0, 1);
      const el = labelRefs.current[i];
      if (el) el.style.opacity = String(bp);
      b.leaves.forEach((_, j) => {
        const o = nodeRefs.current[k++];
        const lp = THREE.MathUtils.clamp((bp - 0.6 - j * 0.06) / 0.3, 0, 1);
        if (o) o.scale.setScalar(lp);
      });
    });
  });

  let k = 0;
  return (
    <group ref={group} key={playKey}>
      {layout.map((b, i) => (
        <group key={b.name + i}>
          <GrowingLine curve={b.curve} index={i} total={layout.length} playKey={playKey} />
          <mesh position={b.tip}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color={PALETTE.known} emissive={PALETTE.known} emissiveIntensity={0.6} />
          </mesh>
          <Html position={b.tip} center distanceFactor={7} zIndexRange={[10, 0]}>
            <div
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className="pointer-events-none whitespace-nowrap font-display text-[15px] italic text-foreground/90"
              style={{ opacity: 0, transform: "translateY(-18px)" }}
            >
              {b.name}
            </div>
          </Html>
          {b.leaves.map((l, j) => {
            const idx = k++;
            return (
              <group key={j}>
                <Line points={[b.tip, l.pos]} color={PALETTE.line} lineWidth={0.6} transparent opacity={0.25} />
                <mesh
                  position={l.pos}
                  ref={(o) => {
                    nodeRefs.current[idx] = o;
                  }}
                  scale={0}
                >
                  <sphereGeometry args={[0.04, 10, 10]} />
                  <meshStandardMaterial
                    color={PALETTE[l.node.certainty] ?? PALETTE.uncertain}
                    emissive={PALETTE[l.node.certainty] ?? PALETTE.uncertain}
                    emissiveIntensity={0.7}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function GrowingLine({
  curve,
  index,
  total,
  playKey,
}: {
  curve: THREE.QuadraticBezierCurve3;
  index: number;
  total: number;
  playKey: number;
}) {
  const pts = useMemo(() => curve.getPoints(40), [curve]);
  const ref = useRef<THREE.Object3D & { geometry?: { instanceCount?: number } }>(null);
  const t = useRef(0);
  const key = useRef(playKey);
  useFrame((_, raw) => {
    if (key.current !== playKey) {
      key.current = playKey;
      t.current = 0;
    }
    t.current = Math.min(1, t.current + Math.min(raw, 0.05) / 4.5);
    const start = (index / total) * 0.45;
    const bp = THREE.MathUtils.clamp((t.current - start) / 0.35, 0, 1);
    const g = ref.current?.geometry;
    if (g) g.instanceCount = Math.max(1, Math.floor(bp * (pts.length - 1)));
  });
  return <Line ref={ref as never} points={pts} color={PALETTE.line} lineWidth={1.2} transparent opacity={0.7} />;
}

export function SeedScene({ research, playKey }: { research: Research | null; playKey: number }) {
  return (
    <Canvas camera={{ position: [0, 0.4, 6], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 3, 4]} intensity={30} color="#f3dcae" />
      <pointLight position={[-4, -2, -3]} intensity={12} color="#7f9fc9" />
      <fog attach="fog" args={["#141a26", 6, 14]} />
      <Sparkles count={70} scale={[9, 4, 6]} size={1.6} speed={0.15} opacity={0.35} color="#e8d3a6" />
      <Seed open={research ? 1 : 0} />
      {research && research.branches.length > 0 && <Tree research={research} playKey={playKey} />}
    </Canvas>
  );
}
