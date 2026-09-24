<template>
  <Teleport to="body">
    <canvas v-show="playing" ref="canvasRef" class="confetti-canvas"></canvas>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';

/**
 * 礼花绽放动画（canvas 粒子实现，无第三方依赖）
 * 用法：组件常驻挂载，通过 ref 调用 fire() 触发一次绽放；动画结束自动停止并清空画布
 */

const canvasRef = ref<HTMLCanvasElement | null>(null);
const playing = ref(false);

const COLORS = ['#ff6b35', '#00b51d', '#ffd700', '#4da6ff', '#ff5c8a', '#9c6bff', '#ff9f43'];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  rot: number; vr: number;      // 旋转角度与角速度
  shape: 'rect' | 'circle';
  opacity: number;
}

let rafId = 0;
let particles: Particle[] = [];

/** 触发一次礼花：左右两门斜向上喷射 + 中间上抛，粒子受重力下落并渐隐 */
const fire = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  particles = [];
  const spawn = (x: number, y: number, baseAngle: number, count: number, speed: number) => {
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * (Math.PI / 3);
      const v = speed * (0.55 + Math.random() * 0.7);
      particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        size: 5 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        shape: Math.random() < 0.7 ? 'rect' : 'circle',
        opacity: 1
      });
    }
  };
  // 左下角向右上喷 / 右下角向左上喷 / 底部中央向上抛
  spawn(-10, H * 0.85, -Math.PI / 3.2, 60, 15);
  spawn(W + 10, H * 0.85, -Math.PI + Math.PI / 3.2, 60, 15);
  spawn(W / 2, H * 0.95, -Math.PI / 2, 50, 13);

  playing.value = true;
  cancelAnimationFrame(rafId);

  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 16.67, 3); // 归一化到 60fps 步长，切页卡顿时补偿
    last = now;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of particles) {
      p.vy += 0.32 * dt;            // 重力
      p.vx *= 0.995;                // 空气阻力
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > H * 0.55) p.opacity -= 0.006 * dt; // 过中线后渐隐（约 2.5s 落完）
      if (p.opacity <= 0 || p.y > H + 40) continue;
      alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (alive) {
      rafId = requestAnimationFrame(tick);
    } else {
      stop();
    }
  };
  rafId = requestAnimationFrame(tick);
};

const stop = () => {
  cancelAnimationFrame(rafId);
  particles = [];
  const canvas = canvasRef.value;
  if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  playing.value = false;
};

onBeforeUnmount(() => cancelAnimationFrame(rafId));

defineExpose({ fire });
</script>

<style scoped>
.confetti-canvas {
  position: fixed;
  inset: 0;
  /* 低于任务小窗（12000），高于普通弹窗遮罩（10500） */
  z-index: 11500;
  pointer-events: none;
}
</style>
