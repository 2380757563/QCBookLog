/**
 * 词云图 Composable
 *
 * 职责:
 * - 标签频次聚合 (wordCloudItems)
 * - 自定义螺旋布局算法 (layoutWordCloud)
 * - 容器尺寸监听 (wordCloudSize via ResizeObserver)
 * - 词云最终布局计算 (wordCloudLayout)
 *
 * 依赖:
 * - useTimeRange (filterBooksByTimeRange)
 * - useStatsSettings (wordCloudTopN / wordCloudFontSize)
 * - bookStore (Pinia)
 *
 * 由 /home/project/QCBookLog/src/views/Reading/components/StatsPage.vue 拆分而来
 */
import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue';
import { useBookStore } from '@/stores/book';
import type { useTimeRange } from './useTimeRange';
import type { useStatsSettings } from './useStatsSettings';
import { WORDCLOUD_FONT_PRESETS, WORDCLOUD_TOP_N } from './useStatsSettings';

export interface WordCloudItem {
  name: string;
  value: number;
  ratio: number;
}

export interface PlacedWord extends WordCloudItem {
  cx: number;       // 中心点 X
  cy: number;       // 中心点 Y
  bw: number;       // 旋转后 AABB 宽度
  bh: number;       // 旋转后 AABB 高度
  rotation: number; // 旋转角度（度）
  color: string;
  fontSize: number;
  fontWeight: number;
}

/** 字符串哈希（用于稳定的随机种子） */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/** 文本宽度测量（使用隐藏 canvas 精确测量） */
let _measureCanvas: HTMLCanvasElement | null = null;
let _measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!_measureCtx) {
    _measureCanvas = document.createElement('canvas');
    _measureCtx = _measureCanvas.getContext('2d');
  }
  return _measureCtx;
}
function measureTextWidth(text: string, fontSize: number, fontWeight: number): number {
  const ctx = getMeasureCtx();
  if (!ctx) {
    // SSR/降级：按字符类型估算
    let w = 0;
    for (const ch of text) {
      w += /[一-鿿]/.test(ch) ? fontSize : fontSize * 0.55;
    }
    return w;
  }
  ctx.font = `${fontWeight} ${fontSize}px "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif`;
  return ctx.measureText(text).width;
}

/** 颜色调色板：6 组共 18 色，按频次 + 哈希分配 */
const WORDCLOUD_COLOR_PALETTE = [
  '#ff6b35', '#ff8a5b', '#ffb088',     // 暖橙（高频）
  '#7b1fa2', '#ab47bc', '#ce93d8',     // 紫色（中频）
  '#1976d2', '#42a5f5', '#90caf9',     // 冷蓝（低频）
  '#388e3c', '#66bb6a', '#a5d6a7',     // 绿色
  '#f57c00', '#fbc02d', '#ffd54f',     // 黄橙
  '#c2185b', '#ec407a', '#f48fb1',     // 品红
];

function pickColor(name: string, ratio: number): string {
  // 高频=暖色组，中频=紫/绿，低频=冷色
  const tier = ratio > 0.66 ? 0 : ratio > 0.33 ? 3 : 6;
  const offset = Math.abs(hashStr(name)) % 3;
  return WORDCLOUD_COLOR_PALETTE[Math.min(tier + offset, WORDCLOUD_COLOR_PALETTE.length - 1)];
}

/** 按频次选择旋转角度集合（高频偏水平，小频次变化更丰富） */
function pickRotation(name: string, ratio: number): number {
  const seed = Math.abs(hashStr(name + '|rot'));
  if (ratio > 0.66) {
    return [-20, -10, 0, 0, 0, 10, 20][seed % 7];
  } else if (ratio > 0.33) {
    return [-60, -45, -30, -15, 0, 0, 15, 30, 45, 60, 90, -90][seed % 12];
  } else {
    return [-90, -75, -60, -45, -30, 30, 45, 60, 75, 90][seed % 10];
  }
}

/** 轴对齐包围盒（AABB） */
type AABB = { x: number; y: number; w: number; h: number };

function aabbOverlap(a: AABB, b: AABB, pad: number = 1): boolean {
  return !(
    a.x + a.w + pad < b.x ||
    b.x + b.w + pad < a.x ||
    a.y + a.h + pad < b.y ||
    b.y + b.h + pad < a.y
  );
}

/** 旋转后 AABB（覆盖旋转后矩形的最小水平矩形） */
function rotatedAABB(w: number, h: number, rad: number): { w: number; h: number } {
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { w: w * c + h * s, h: w * s + h * c };
}

/** 螺旋布局：将每个词放置在容器内不重叠的位置 */
function layoutWordCloud(
  words: WordCloudItem[],
  width: number,
  height: number,
  fontPreset: { min: number; max: number }
): PlacedWord[] {
  if (width <= 0 || height <= 0 || words.length === 0) return [];

  // 按频次降序：先放大词占位（更易找到位置）
  const sorted = [...words].sort((a, b) => b.ratio - a.ratio);
  const placed: PlacedWord[] = [];
  const cx0 = width / 2;
  const cy0 = height / 2;

  for (const word of sorted) {
    const fontSize = Math.max(
      fontPreset.min,
      Math.round(fontPreset.min + (fontPreset.max - fontPreset.min) * word.ratio)
    );
    const fontWeight = word.ratio > 0.66 ? 700 : word.ratio > 0.33 ? 600 : 500;
    const rotation = pickRotation(word.name, word.ratio);
    const rad = (rotation * Math.PI) / 180;
    const color = pickColor(word.name, word.ratio);

    const w = measureTextWidth(word.name, fontSize, fontWeight);
    const h = fontSize * 1.15;
    const { w: bw, h: bh } = rotatedAABB(w, h, rad);

    // Archimedean 螺旋搜索
    const seed = Math.abs(hashStr(word.name + '|theta'));
    let theta = (seed % 360) * (Math.PI / 180);
    const maxR = Math.hypot(width, height);

    let found: { x: number; y: number } | null = null;
    outer: for (let r = 0; r <= maxR; r += 1.5) {
      const nSteps = Math.max(8, Math.ceil((2 * Math.PI * r) / 10));
      const stepTheta = (2 * Math.PI) / nSteps;
      for (let i = 0; i < nSteps; i++) {
        const x = cx0 + r * Math.cos(theta);
        const y = cy0 + r * Math.sin(theta);
        theta += stepTheta;

        if (x - bw / 2 < 0 || x + bw / 2 > width) continue;
        if (y - bh / 2 < 0 || y + bh / 2 > height) continue;

        const aabb: AABB = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
        let collide = false;
        for (const p of placed) {
          if (aabbOverlap(aabb, { x: p.cx - p.bw / 2, y: p.cy - p.bh / 2, w: p.bw, h: p.bh }, 2)) {
            collide = true;
            break;
          }
        }
        if (!collide) { found = { x, y }; break outer; }
      }
    }

    if (found) {
      placed.push({
        ...word,
        cx: found.x, cy: found.y,
        bw, bh,
        rotation,
        color,
        fontSize,
        fontWeight,
      });
    }
  }

  return placed;
}

const WORDCLOUD_DEFAULT_W = 600;
const WORDCLOUD_DEFAULT_H = 360;

export type UseWordCloudTimeRange = ReturnType<typeof useTimeRange>;
export type UseWordCloudSettings = ReturnType<typeof useStatsSettings>;

export function useWordCloud(
  timeRange: UseWordCloudTimeRange,
  settings: UseWordCloudSettings
) {
  const bookStore = useBookStore();
  const { wordCloudTopN, wordCloudFontSize } = settings;

  /** 词云容器引用 - 由父组件绑定 */
  const wordCloudRef = ref<HTMLElement | null>(null);

  /** 标签频次数据 */
  const wordCloudItems: ComputedRef<WordCloudItem[]> = computed(() => {
    const { filterBooksByTimeRange } = timeRange;
    const books = filterBooksByTimeRange(bookStore.allBooks);

    const bookTagLists: string[][] = books
      .map((b: any) => {
        const raw = b.tags || b.tagList || [];
        if (Array.isArray(raw)) return raw as string[];
        if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
        return [];
      })
      .filter(arr => arr.length > 0);

    const tagCount = new Map<string, number>();
    for (const arr of bookTagLists) {
      const seen = new Set<string>();
      for (const t of arr) {
        if (!t || seen.has(t)) continue; // 一本书里重复标签不重复计
        seen.add(t);
        tagCount.set(t, (tagCount.get(t) || 0) + 1);
      }
    }

    const topN = wordCloudTopN.value;
    const entries = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    if (entries.length === 0) return [];
    const maxVal = entries[0][1];
    // 对数缩放 + 归一化
    return entries.map(([name, value]) => {
      const ratio = maxVal > 0 ? Math.log(value + 1) / Math.log(maxVal + 1) : 0;
      return { name, value, ratio };
    });
  });

  /** 容器尺寸（由 ResizeObserver 实时更新） */
  const wordCloudSize: Ref<{ w: number; h: number }> = ref({ w: 0, h: 0 });
  let _wcResizeObserver: ResizeObserver | null = null;

  /** 词云最终布局 */
  const wordCloudLayout: ComputedRef<PlacedWord[]> = computed(() => {
    const items = wordCloudItems.value;
    if (items.length === 0) return [];
    const w = wordCloudSize.value.w > 0 ? wordCloudSize.value.w : WORDCLOUD_DEFAULT_W;
    const h = wordCloudSize.value.h > 0 ? wordCloudSize.value.h : WORDCLOUD_DEFAULT_H;
    return layoutWordCloud(
      items,
      w,
      h,
      WORDCLOUD_FONT_PRESETS[wordCloudFontSize.value]
    );
  });

  /**
   * 监听容器 ref 变化（卡片可能因 v-if 反复挂载），按需挂载/卸载 ResizeObserver
   */
  watch(wordCloudRef, (el, _oldEl, onCleanup) => {
    if (_wcResizeObserver) {
      _wcResizeObserver.disconnect();
      _wcResizeObserver = null;
    }
    if (el) {
      // 同步读取一次尺寸（避免首帧空白）
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        wordCloudSize.value = { w: rect.width, h: rect.height };
      }
      _wcResizeObserver = new ResizeObserver((entries) => {
        for (const e of entries) {
          const cr = e.contentRect;
          if (cr.width > 0 && cr.height > 0) {
            wordCloudSize.value = { w: cr.width, h: cr.height };
          }
        }
      });
      _wcResizeObserver.observe(el);
      onCleanup(() => {
        if (_wcResizeObserver) {
          _wcResizeObserver.disconnect();
          _wcResizeObserver = null;
        }
      });
    } else {
      // 元素被卸载时重置 size
      wordCloudSize.value = { w: 0, h: 0 };
    }
  }, { flush: 'post' });

  // 组件卸载时清理 ResizeObserver
  onUnmounted(() => {
    if (_wcResizeObserver) {
      _wcResizeObserver.disconnect();
      _wcResizeObserver = null;
    }
  });

  return {
    wordCloudRef,
    wordCloudItems,
    wordCloudLayout,
    wordCloudSize,
    WORDCLOUD_TOP_N,
  };
}
