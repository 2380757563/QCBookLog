<template>
  <div
    v-if="hasValue"
    class="rating-display"
    :class="[`rating-display--${size}`, { 'rating-display--clickable': clickable }]"
    :title="titleText"
  >
    <div class="rating-display__stars">
      <span
        v-for="i in totalStars"
        :key="i"
        class="rating-display__star"
        :class="{
          'rating-display__star--filled': i <= fullStars,
          'rating-display__star--half':
            i === fullStars + 1 && hasHalfStar,
          'rating-display__star--empty': i > fullStars + (hasHalfStar ? 1 : 0)
        }"
        @click="clickable && onSelect(i)"
      >
        ★
      </span>
    </div>
    <span v-if="showValue" class="rating-display__value">{{ displayValue.toFixed(1) }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * RatingDisplay - 通用评分展示组件
 *
 * 重要约定：
 *   - value 为数据库原始评分（0-10 浮点，如 7.8、9.0、8、7）
 *   - 不得对 value 进行除以 2 等缩放处理
 *   - 五星制：每颗星代表 2 分（10 / 5 = 2）
 *   - 十星制：每颗星代表 1 分（10 / 10 = 1）
 *
 * 例如：value=7.8
 *   - 十星制：7 颗满星 + 1 颗 0.8 填充星 + 2 颗空星
 *   - 五星制：3 颗满星 + 1 颗 0.9 填充星 + 1 颗空星（7.8/2=3.9）
 */
import { computed } from 'vue';
import { useRatingDisplayMode } from '@/composables/useRatingDisplayMode';

const props = withDefaults(
  defineProps<{
    /** 数据库原始评分（0-10） */
    value?: number | null;
    /** 显式指定模式（不传则取全局偏好） */
    mode?: '5' | '10';
    /** 是否显示数字（如 7.8） */
    showValue?: boolean;
    /** 尺寸 */
    size?: 'small' | 'medium' | 'large';
    /** 是否可点击选择（编辑场景） */
    clickable?: boolean;
  }>(),
  {
    value: null,
    mode: undefined,
    showValue: true,
    size: 'medium',
    clickable: false
  }
);

const emit = defineEmits<{
  (e: 'select', value: number): void;
}>();

const { mode: globalMode } = useRatingDisplayMode();
const activeMode = computed(() => props.mode ?? globalMode.value);

const hasValue = computed(() => {
  if (props.value === null || props.value === undefined) return false;
  const n = Number(props.value);
  return !Number.isNaN(n) && n > 0;
});

const displayValue = computed(() => {
  if (!hasValue.value) return 0;
  return Number(props.value);
});

const totalStars = computed(() => (activeMode.value === '5' ? 5 : 10));

/** 每颗星代表的实际分值（10/5=2 或 10/10=1） */
const perStar = computed(() => 10 / totalStars.value);

/** 在当前模式下，value 对应的星级数（带小数） */
const scaledRating = computed(() => displayValue.value / perStar.value);

/** 满星数（向下取整，尾数 ≥ 0.75 视为下一颗满星） */
const fullStars = computed(() => {
  const raw = scaledRating.value;
  const frac = raw - Math.floor(raw);
  return Math.floor(raw) + (frac >= 0.75 ? 1 : 0);
});

/** 是否有半星（0.25 ≤ 尾数 < 0.75 视为半填充） */
const hasHalfStar = computed(() => {
  const raw = scaledRating.value;
  const frac = raw - Math.floor(raw);
  return frac >= 0.25 && frac < 0.75;
});

/** 末颗半填充的比例（用于高级样式） */
const lastFraction = computed(() => {
  const frac = scaledRating.value - fullStars.value;
  if (frac >= 0.75) return 1;
  if (frac < 0.25) return 0;
  return 0.5;
});

const titleText = computed(() => {
  if (!hasValue.value) return '';
  return `${displayValue.value.toFixed(1)} / 10`;
});

function onSelect(starIndex: number) {
  if (!props.clickable) return;
  // 点击第 N 颗星 -> 设置评分为 N * perStar（10 制原始值）
  const newRaw = starIndex * perStar.value;
  emit('select', newRaw);
}
</script>

<style scoped>
.rating-display {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}

.rating-display__stars {
  display: inline-flex;
}

.rating-display__star {
  color: #ddd;
  transition: color 0.15s ease, transform 0.1s ease;
  user-select: none;
}

.rating-display__star--filled {
  color: #f39c12;
}

.rating-display__star--half {
  color: #ddd;
  position: relative;
  background: linear-gradient(
    90deg,
    #f39c12 50%,
    #ddd 50%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.rating-display__star--empty {
  color: #ddd;
}

.rating-display--clickable .rating-display__star {
  cursor: pointer;
}

.rating-display--clickable .rating-display__star:hover {
  transform: scale(1.1);
}

.rating-display__value {
  font-weight: 500;
  color: #f39c12;
}

/* 尺寸 */
.rating-display--small .rating-display__star {
  font-size: 12px;
}
.rating-display--small .rating-display__value {
  font-size: 12px;
}

.rating-display--medium .rating-display__star {
  font-size: 14px;
}
.rating-display--medium .rating-display__value {
  font-size: 14px;
}

.rating-display--large .rating-display__star {
  font-size: 22px;
}
.rating-display--large .rating-display__value {
  font-size: 16px;
}
</style>
