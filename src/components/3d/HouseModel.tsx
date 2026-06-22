'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

// DECISION: brand-consistent palette — gegarap's real primary is emerald
// (#059669), NOT the indigo in the prompt's token block. Reusing the live design
// system keeps the hero on-brand with the rest of the site (§5 "reuse, jangan
// tebak warna baru" → reuse the ACTUAL tokens).
const COLOR_WALL = '#f1f5f9'; // slate-100, reads as a light house body
const COLOR_ROOF = '#059669'; // primary-600 emerald
const COLOR_DOOR = '#065f46'; // emerald-800
const COLOR_WINDOW = '#7dd3fc'; // sky-300, reads as glass

/**
 * Procedural box-based house (master prompt §6 — no real 3D asset for this
 * version). Body = box, roof = 4-segment cone (square pyramid → gable look),
 * door + windows = small contrast boxes. Idle float driven by `useFrame`.
 */
export function HouseModel() {
  const group = useRef<Group>(null);

  // Idle float: amplitude 0.15, period ≈4s (angular speed = PI/2 per second).
  useFrame(({ clock }) => {
    if (group.current) {
      group.current.position.y = Math.sin(clock.elapsedTime * (Math.PI / 2)) * 0.15;
    }
  });

  // TODO(ALLOWED): swap this procedural group for `useGLTF('/models/house.glb')`
  // once a real model is available — keep the same idle-float wrapper.
  return (
    <group ref={group} rotation={[0, -0.15, 0]}>
      {/* Body */}
      <mesh castShadow={false} position={[0, 0, 0]}>
        <boxGeometry args={[2, 1.4, 2]} />
        <meshStandardMaterial color={COLOR_WALL} roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Roof — cone with 4 radial segments = square pyramid; rotate 45° so the
          base edges line up with the box walls. */}
      <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.65, 1, 4]} />
        <meshStandardMaterial color={COLOR_ROOF} roughness={0.5} metalness={0.1} flatShading />
      </mesh>

      {/* Door (front face, +Z) */}
      <mesh position={[0, -0.3, 1.01]}>
        <boxGeometry args={[0.5, 0.8, 0.06]} />
        <meshStandardMaterial color={COLOR_DOOR} roughness={0.6} />
      </mesh>

      {/* Windows */}
      <mesh position={[-0.58, 0.22, 1.01]}>
        <boxGeometry args={[0.42, 0.42, 0.06]} />
        <meshStandardMaterial color={COLOR_WINDOW} roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[0.58, 0.22, 1.01]}>
        <boxGeometry args={[0.42, 0.42, 0.06]} />
        <meshStandardMaterial color={COLOR_WINDOW} roughness={0.2} metalness={0.3} />
      </mesh>
    </group>
  );
}
