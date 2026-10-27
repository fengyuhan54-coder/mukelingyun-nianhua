'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { MulingPetState } from '@/lib/muling-pet-types';

interface MulingGLBProps {
  state: MulingPetState;
  onClick: () => void;
  onDoubleClick: () => void;
}

export default function MulingGLB({ state, onClick, onDoubleClick }: MulingGLBProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const handlersRef = useRef({ onClick, onDoubleClick });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { handlersRef.current = { onClick, onDoubleClick }; }, [onClick, onDoubleClick]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    camera.position.set(0, .15, 5.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff4df, 0x513520, 2.7));
    const key = new THREE.DirectionalLight(0xffead2, 4.3);
    key.position.set(3, 5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9aae83, 2.1);
    fill.position.set(-4, 2, 3);
    scene.add(fill);

    const motion = new THREE.Group();
    const pivot = new THREE.Group();
    motion.add(pivot);
    scene.add(motion);
    let officialModel: THREE.Object3D | undefined;
    let disposed = false;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      '/models/muling-official-v1-web.glb',
      gltf => {
        if (disposed) return;
        officialModel = gltf.scene;
        officialModel.traverse(object => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.frustumCulled = true;
          }
        });
        const box = new THREE.Box3().setFromObject(officialModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        officialModel.position.sub(center);
        const scale = 1.88 / Math.max(size.y, .001);
        officialModel.scale.setScalar(scale);
        pivot.add(officialModel);
        setLoading(false);
      },
      undefined,
      () => {
        if (!disposed) { setLoading(false); setError('正式模型加载失败，请刷新页面重试。'); }
      },
    );

    let targetX = 0;
    let targetY = 0;
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const canvas = renderer.domElement;
    const down = (event: PointerEvent) => {
      dragging = true; moved = false; lastX = event.clientX; lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      targetY += dx * .014;
      targetX = THREE.MathUtils.clamp(targetX + dy * .008, -.45, .45);
      lastX = event.clientX; lastY = event.clientY;
    };
    const up = (event: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!moved) handlersRef.current.onClick();
    };
    const cancel = () => { dragging = false; };
    const doubleClick = () => handlersRef.current.onDoubleClick();
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('dblclick', doubleClick);

    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      const t = clock.getElapsedTime();
      pivot.rotation.y += (targetY - pivot.rotation.y) * .13;
      pivot.rotation.x += (targetX - pivot.rotation.x) * .13;
      motion.position.y = Math.sin(t * 2) * .035;
      motion.rotation.set(0, 0, 0);
      motion.scale.set(1, 1 + Math.sin(t * 2) * .012, 1);
      const current = stateRef.current;
      if (current === 'acknowledge') motion.rotation.x = Math.sin(t * 5.8) * .13 + .07;
      if (current === 'thinking') { motion.rotation.z = -.13; motion.rotation.y = Math.sin(t * 1.4) * .06; }
      if (current === 'present') { motion.rotation.y = Math.sin(t * 2.5) * .16; motion.position.y += .07; }
      if (current === 'sad') { motion.rotation.x = .2; motion.position.y -= .08; }
      if (current === 'curious') motion.rotation.z = -.2 + Math.sin(t * 2) * .025;
      if (current === 'wave') motion.rotation.z = Math.sin(t * 7.5) * .18;
      if (current === 'remind') motion.rotation.z = Math.sin(t * 3) * .075;
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('dblclick', doubleClick);
      if (officialModel) {
        officialModel.traverse(object => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(item => {
              const withMaps = item as THREE.MeshStandardMaterial;
              withMaps.map?.dispose();
              withMaps.normalMap?.dispose();
              withMaps.roughnessMap?.dispose();
              item.dispose();
            });
          }
        });
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="muling-model-host">
      <div ref={hostRef} aria-label="可拖动旋转的正式三维木灵模型" />
      {loading && <span className="muling-model-status">木灵正在出现…</span>}
      {error && <span className="muling-model-status">{error}</span>}
    </div>
  );
}


