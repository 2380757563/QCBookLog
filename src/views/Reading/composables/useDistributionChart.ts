/**
 * 分布图 Composable
 *
 * 职责:
 * - 通用聚合函数 (aggregateToPairs) - 把书籍列表按 pick 函数聚合为 [{label, count}]
 * - 通用 ECharts 渲染方法 (render) - 支持多种图表类型
 *   - 'pie' 普通饼图
 *   - 'rosePie' 玫瑰图（半径反映数量）
 *   - 'barH' 横向柱状图（数量大的在最上面）
 *   - 'donut' 环形图
 * - 空数据占位
 * - markRaw + dispose 前置清理
 *
 * 依赖:
 * - echarts
 *
 * 由 /home/project/QCBookLog/src/views/Reading/components/StatsPage.vue 拆分而来
 */
import { markRaw, type Ref } from 'vue';
import * as echarts from 'echarts';

export type ChartKind = 'pie' | 'rosePie' | 'barH' | 'donut';

export interface DistributionChartConfig {
  /** 图表类型 */
  kind: ChartKind;
  /** 从书籍对象提取 label 的函数 */
  pick: (b: any) => string | null | undefined;
  /** 自定义调色板（缺省按 kind 选默认） */
  palette?: string[];
  /** 排序方向：'desc'（默认，饼图） / 'asc'（横向柱状图，大值在上） */
  sortOrder?: 'asc' | 'desc';
  /** 空数据文案 */
  emptyText?: string;
}

const DEFAULT_PALETTES: Record<ChartKind, string[]> = {
  pie:     ['#4caf50', '#ff9800', '#9c27b0', '#03a9f4', '#e91e63'],
  rosePie: ['#ff6b35', '#4caf50', '#2196f3', '#9c27b0', '#ffc107'],
  barH:    ['#1976d2'],
  donut:   ['#9e9e9e', '#ff9800', '#4caf50', '#03a9f4', '#9c27b0', '#e91e63', '#795548'],
};

/** 把书籍列表按 pick 函数聚合为 [{label, count}]，按数量降序 */
export function aggregateToPairs<T>(items: T[], pick: (b: T) => string | null | undefined): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const b of items) {
    const k = pick(b) || '未指定';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** 设置空数据占位（保留 chart 实例，仅清空内容） */
function renderEmpty(refEl: HTMLElement, text: string) {
  const chart = echarts.getInstanceByDom(refEl) as any;
  if (chart) {
    chart.clear();
    chart.setOption({
      title: { text, left: 'center', top: 'middle', textStyle: { color: '#999' } }
    });
  }
}

/** 构建 ECharts option */
function buildOption(pairs: { label: string; count: number }[], config: DistributionChartConfig) {
  const palette = config.palette ?? DEFAULT_PALETTES[config.kind];

  if (config.kind === 'barH') {
    // 横向柱状图：升序（数值大的在最上面）
    const sorted = [...pairs].sort((a, b) => a.count - b.count);
    const color = palette[0];
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 120, right: 30, top: 20, bottom: 30 },
      xAxis: { type: 'value', name: '书籍数' },
      yAxis: { type: 'category', data: sorted.map(p => p.label), axisLabel: { fontSize: 12 } },
      series: [{
        type: 'bar',
        data: sorted.map(p => p.count),
        barWidth: 16,
        itemStyle: { color, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', formatter: '{c}' }
      }]
    };
  }

  if (config.kind === 'rosePie') {
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} 本 ({d}%)' },
      legend: { bottom: '5%', left: 'center', icon: 'circle' },
      series: [{
        type: 'pie',
        radius: ['25%', '70%'],
        center: ['50%', '45%'],
        roseType: 'radius',
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{c|本} ', rich: { c: { color: '#666', fontSize: 10 } } },
        data: pairs.map((p, i) => ({ name: p.label, value: p.count, itemStyle: { color: palette[i % palette.length] } }))
      }]
    };
  }

  // pie / donut 通用
  const isDonut = config.kind === 'donut';
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 本 ({d}%)' },
    legend: { bottom: '5%', left: 'center', icon: 'circle' },
    series: [{
      type: 'pie',
      radius: isDonut ? ['40%', '70%'] : ['35%', '70%'],
      center: ['50%', '45%'],
      itemStyle: { borderRadius: isDonut ? 4 : 6, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: true,
        formatter: isDonut ? '{b}\n{c} ({d}%)' : '{b}\n{c} 本 ({d}%)'
      },
      data: pairs.map((p, i) => ({ name: p.label, value: p.count, itemStyle: { color: palette[i % palette.length] } }))
    }]
  };
}

export function useDistributionChart() {
  /**
   * 渲染分布图
   * - 当 refEl 为空时直接返回
   * - 当 pairs 为空时显示占位文案
   * - 强制重建：forceRecreate = true（初次挂载或 HMR）
   */
  function render<T>(
    refEl: Ref<HTMLElement | null>,
    items: T[],
    config: DistributionChartConfig,
    forceRecreate: boolean = false
  ) {
    const el = refEl.value;
    if (!el) return;

    const pairs = aggregateToPairs(items, config.pick);
    if (pairs.length === 0) {
      renderEmpty(el, config.emptyText ?? '暂无数据');
      return;
    }

    let chart = echarts.getInstanceByDom(el) as any;
    if (forceRecreate || !chart) {
      echarts.dispose(el);
      chart = markRaw(echarts.init(el));
    }
    chart.setOption(buildOption(pairs, config), true);
  }

  /** 销毁某个 refEl 上的 ECharts 实例 */
  function dispose(refEl: Ref<HTMLElement | null>) {
    const el = refEl.value;
    if (el) echarts.dispose(el);
  }

  return { render, dispose };
}
