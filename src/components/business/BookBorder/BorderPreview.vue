<template>
  <div 
    class="border-preview"
    :class="{ 'border-preview--selected': selected }"
    @click="$emit('select')"
  >
    <div class="border-preview__frame" :style="frameStyle">
      <svg 
        class="border-preview__svg" 
        viewBox="0 0 80 110" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient 
            v-if="hasGradient" 
            id="preview-gradient" 
            x1="0%" 
            y1="0%" 
            x2="100%" 
            y2="100%"
          >
            <stop offset="0%" :stop-color="gradientStart" />
            <stop offset="100%" :stop-color="gradientEnd" />
          </linearGradient>
          <filter v-if="hasStrokeVariation" id="stroke-variation">
            <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="turbulence"/>
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="2" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
        
        <template v-if="borderId === 'pending-4'">
          <path 
            :d="gapPath"
            :stroke="strokeColor"
            :stroke-width="params.lineWidth"
            fill="none"
            stroke-linecap="round"
          />
        </template>
        
        <template v-else-if="borderId === 'pending-1'">
          <rect 
            x="4" 
            y="4" 
            width="72" 
            height="102" 
            :rx="params.borderRadius" 
            :ry="params.borderRadius"
            :stroke="strokeColor"
            :stroke-width="params.lineWidth"
            fill="none"
            :stroke-dasharray="dashArray"
          />
        </template>
        
        <template v-else-if="borderId === 'favorite-1'">
          <rect 
            x="4" 
            y="4" 
            width="72" 
            height="102" 
            :rx="params.borderRadius" 
            :ry="params.borderRadius"
            :stroke="params.color"
            :stroke-width="params.lineWidth"
            fill="none"
          />
          <rect 
            :x="4 + doubleLineGap" 
            :y="4 + doubleLineGap" 
            :width="72 - 2 * doubleLineGap" 
            :height="102 - 2 * doubleLineGap" 
            :rx="params.borderRadius" 
            :ry="params.borderRadius"
            :stroke="params.color"
            :stroke-width="params.lineWidth"
            fill="none"
          />
        </template>
        
        <template v-else-if="borderId === 'favorite-3'">
          <rect 
            x="4" 
            y="4" 
            width="72" 
            height="102" 
            :rx="params.borderRadius" 
            :ry="params.borderRadius"
            :stroke="params.color"
            :stroke-width="params.lineWidth"
            fill="none"
          />
          <path 
            :d="huiwenDecorations"
            :stroke="params.color"
            :stroke-width="params.lineWidth * 0.5"
            fill="none"
          />
        </template>
        
        <template v-else>
          <rect 
            x="4" 
            y="4" 
            width="72" 
            height="102" 
            :rx="params.borderRadius" 
            :ry="params.borderRadius"
            :stroke="strokeColor"
            :stroke-width="params.lineWidth"
            fill="none"
            :filter="hasStrokeVariation ? 'url(#stroke-variation)' : undefined"
          />
        </template>
      </svg>
      
      <div v-if="params.glow.enabled" class="border-preview__glow" :style="glowStyle"></div>
    </div>
    <div class="border-preview__name">{{ name }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getBorderDefinition } from '@/store/bookBorder/types';

const props = defineProps<{
  borderId: string;
  name: string;
  selected?: boolean;
}>();

defineEmits<{
  (e: 'select'): void;
}>();

const borderDefinition = computed(() => getBorderDefinition(props.borderId));

const params = computed(() => borderDefinition.value?.defaultParams || {
  type: 'normal-1' as const,
  lineWidth: 1.5,
  borderRadius: 8,
  color: '#a0a0a0',
  glow: { enabled: false, color: 'rgba(0, 0, 0, 0.3)', spread: 4, opacity: 50, gradientEnabled: false }
});

const hasGradient = computed(() => {
  return ['pending-5', 'favorite-2', 'favorite-5'].includes(props.borderId);
});

const hasStrokeVariation = computed(() => {
  return props.borderId === 'pending-3';
});

const gradientStart = computed(() => {
  if ('gradientStartColor' in params.value) {
    return params.value.gradientStartColor;
  }
  return params.value.color;
});

const gradientEnd = computed(() => {
  if ('gradientEndColor' in params.value) {
    return params.value.gradientEndColor;
  }
  return params.value.color;
});

const strokeColor = computed(() => {
  if (hasGradient.value) {
    return 'url(#preview-gradient)';
  }
  return params.value.color;
});

const dashArray = computed(() => {
  if (props.borderId === 'pending-1') {
    const ratio = 'dashRatio' in params.value ? params.value.dashRatio : 1;
    return `${6 * ratio}, ${6 * ratio}`;
  }
  return 'none';
});

const gapPath = computed(() => {
  if (props.borderId !== 'pending-4') return '';
  
  const gapLength = ('gapLength' in params.value ? params.value.gapLength : 15) * 0.6;
  const totalWidth = 80;
  const startX = (totalWidth - gapLength) / 2;
  const endX = startX + gapLength;
  
  return `M ${startX} 4 L ${endX} 4 M 76 4 L 76 106 M 76 106 L 4 106 M 4 106 L 4 4 M 4 4 L ${startX} 4`;
});

const doubleLineGap = computed(() => {
  return 'doubleLineGap' in params.value ? params.value.doubleLineGap : 4;
});

const huiwenDecorations = computed(() => {
  if (props.borderId !== 'favorite-3') return '';
  
  const s = ('patternSize' in params.value ? params.value.patternSize : 8) * 0.8;
  const corners = [
    { x: 8, y: 8 },
    { x: 72, y: 8 },
    { x: 8, y: 102 },
    { x: 72, y: 102 }
  ];
  
  return corners.map(c => {
    return `M ${c.x - s/2} ${c.y} L ${c.x} ${c.y - s/2} L ${c.x + s/2} ${c.y} L ${c.x} ${c.y + s/2} Z`;
  }).join(' ');
});

const frameStyle = computed(() => {
  const style: Record<string, string> = {};
  
  if (params.value.glow.enabled) {
    const glowColor = params.value.glow.color;
    const spread = params.value.glow.spread * 0.5;
    style.filter = `drop-shadow(0 0 ${spread}px ${glowColor})`;
  }
  
  return style;
});

const glowStyle = computed(() => {
  if (!params.value.glow.enabled) return {};
  
  const glowColor = params.value.glow.color;
  const spread = params.value.glow.spread;
  const opacity = params.value.glow.opacity / 100;
  
  return {
    position: 'absolute' as const,
    inset: `-${spread}px`,
    borderRadius: `${params.value.borderRadius + spread}px`,
    boxShadow: `0 0 ${spread}px ${glowColor}`,
    opacity: opacity,
    pointerEvents: 'none' as const,
    zIndex: -1
  };
});
</script>

<style scoped>
.border-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--bg-card, #fff);
  border: 2px solid transparent;
}

.border-preview:hover {
  background-color: var(--bg-hover, #f5f5f5);
}

.border-preview--selected {
  border-color: var(--primary-color, #ff6b35);
  background-color: rgba(255, 107, 53, 0.05);
}

.border-preview__frame {
  position: relative;
  width: 80px;
  height: 110px;
}

.border-preview__svg {
  width: 100%;
  height: 100%;
}

.border-preview__glow {
  position: absolute;
  inset: -10px;
  pointer-events: none;
  z-index: -1;
}

.border-preview__name {
  font-size: 12px;
  color: var(--text-secondary, #666);
  text-align: center;
  max-width: 100px;
  line-height: 1.3;
}
</style>
