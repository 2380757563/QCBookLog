<template>
  <div 
    class="book-border-frame" 
    :class="[
      `book-border-frame--${params.type}`,
      { 
        'book-border-frame--hover-enabled': 'hoverEnabled' in params && params.hoverEnabled,
        'book-border-frame--glow': params.glow.enabled,
        'book-border-frame--pulse': params.glow.pulseEnabled
      }
    ]"
    :style="borderStyle"
  >
    <slot></slot>
    <svg 
      v-if="hasPattern" 
      class="book-border-pattern"
      :style="patternStyle"
    >
      <defs>
        <pattern 
          id="huiwen-pattern" 
          :width="patternSize" 
          :height="patternSize" 
          patternUnits="userSpaceOnUse"
        >
          <path 
            :d="huiwenPath" 
            :stroke="params.color" 
            :stroke-width="params.lineWidth * 0.6"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </pattern>
      </defs>
      <rect 
        x="0" 
        y="0" 
        width="100%" 
        height="100%" 
        fill="url(#huiwen-pattern)"
      />
    </svg>
    <div v-if="hasDoubleLine" class="book-border-inner-line" :style="innerLineStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BorderParams } from '@/store/bookBorder/types';

const props = defineProps<{
  params: BorderParams;
  width?: number;
  height?: number;
}>();

const hasPattern = computed(() => {
  return props.params.type === 'favorite-3';
});

const hasDoubleLine = computed(() => {
  return props.params.type === 'favorite-1';
});

const patternSize = computed(() => {
  if (props.params.type === 'favorite-3') {
    return props.params.patternSize || 8;
  }
  return 8;
});

const huiwenPath = computed(() => {
  const s = patternSize.value;
  const lineWidth = (props.params.lineWidth || 2) * 0.5;
  const offset = lineWidth / 2;
  
  return `
    M ${s * 0.2 + offset} ${s * 0.5} 
    L ${s * 0.5} ${s * 0.2 + offset} 
    L ${s * 0.8 - offset} ${s * 0.5} 
    L ${s * 0.5} ${s * 0.8 - offset} 
    Z
    M ${s * 0.3} ${s * 0.5} 
    L ${s * 0.5} ${s * 0.3} 
    L ${s * 0.7} ${s * 0.5} 
    L ${s * 0.5} ${s * 0.7} 
    Z
  `;
});

const borderStyle = computed(() => {
  const p = props.params;
  const style: Record<string, string | number> = {
    borderRadius: `${p.borderRadius}px`
  };

  if (p.glow.enabled) {
    const glowColor = p.glow.color;
    const spread = p.glow.spread;
    const opacity = p.glow.opacity / 100;
    
    if (p.glow.pulseEnabled && p.type === 'favorite-5') {
      style.boxShadow = `0 0 ${spread}px ${glowColor}, 0 0 ${spread * 2}px ${glowColor}`;
      style.animation = `pulse-glow ${60 / (p.pulseFrequency || 2)}s ease-in-out infinite`;
    } else if (p.glow.gradientEnabled && 'gradientStartColor' in p && 'gradientEndColor' in p) {
      style.boxShadow = `0 0 ${spread}px ${p.gradientStartColor}, 0 0 ${spread * 1.5}px ${p.gradientEndColor}`;
    } else {
      style.boxShadow = `0 0 ${spread}px ${glowColor}`;
    }
  }

  switch (p.type) {
    case 'normal-1':
    case 'normal-2':
    case 'normal-3':
    case 'normal-4':
    case 'normal-5':
    case 'pending-2':
    case 'favorite-4':
      style.border = `${p.lineWidth}px solid ${p.color}`;
      break;

    case 'pending-1':
      const dashLength = 8 * (p.dashRatio || 1);
      const gapLength = 8 * (p.dashRatio || 1);
      style.border = `${p.lineWidth}px dashed ${p.color}`;
      style.borderDashArray = `${dashLength}px ${gapLength}px`;
      break;

    case 'pending-3':
      style.border = `${p.lineWidth}px solid ${p.color}`;
      style.filter = `url(#stroke-variation-${p.strokeVariation || 0.3})`;
      break;

    case 'pending-4':
      style.border = `${p.lineWidth}px solid ${p.color}`;
      break;

    case 'pending-5':
    case 'favorite-2':
    case 'favorite-5':
      if ('gradientStartColor' in p && 'gradientEndColor' in p) {
        style.borderImage = `linear-gradient(135deg, ${p.gradientStartColor}, ${p.gradientEndColor}) 1`;
        style.border = `${p.lineWidth}px solid`;
      }
      break;

    case 'favorite-1':
      style.border = `${p.lineWidth}px solid ${p.color}`;
      break;

    case 'favorite-3':
      style.border = `${p.lineWidth}px solid ${p.color}`;
      break;
  }

  return style;
});

const innerLineStyle = computed(() => {
  if (props.params.type !== 'favorite-1') return {};
  const p = props.params;
  const gap = 'doubleLineGap' in p ? p.doubleLineGap : 4;
  return {
    position: 'absolute' as const,
    inset: `${gap}px`,
    borderRadius: `${p.borderRadius}px`,
    border: `${p.lineWidth}px solid ${p.color}`,
    pointerEvents: 'none' as const
  };
});

const patternStyle = computed(() => {
  return {
    position: 'absolute' as const,
    inset: '0',
    pointerEvents: 'none' as const,
    overflow: 'hidden' as const,
    borderRadius: `${props.params.borderRadius}px`
  };
});
</script>

<style scoped>
.book-border-frame {
  position: relative;
  display: inline-block;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.book-border-frame--hover-enabled {
  border-color: transparent !important;
  box-shadow: none !important;
}

.book-border-frame--hover-enabled:hover {
  border-color: initial !important;
}

.book-border-frame--pulse {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.book-border-inner-line {
  position: absolute;
  pointer-events: none;
}

.book-border-pattern {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
