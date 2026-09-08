/**
 * Top N 排行榜 Composable
 *
 * 职责:
 * - 通用分钟数格式化 (formatMinutes) - "Xh Ym" / "Xm" / "Xh"
 * - 通用封面图层叠加 (attachCoverOverlay) - 在 Top N 横向柱状图上叠加书籍封面
 * - 通用 Top N 横向柱状图渲染方法 (render)
 *   - ECharts markRaw + dispose 前置清理
 *   - 内部维护 150ms 防抖的 window resize 监听（封面位置需随窗口尺寸调整）
 *   - 卸载时自动清理
 *
 * 依赖:
 * - echarts
 * - vue-router (Router 实例，封面点击跳转)
 *
 * 由 /home/project/QCBookLog/src/views/Reading/components/StatsPage.vue 拆分而来
 */
import { onUnmounted, onMounted, markRaw, type Ref } from 'vue';
import * as echarts from 'echarts';
import type { Router } from 'vue-router';

/** 把分钟数格式化为 "Xh Ym" / "Xm" / "Xh" */
export function formatMinutes(min: number): string {
  if (!min || isNaN(min)) return '0m';
  const total = Math.max(0, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** 在 Top N 横向柱状图上叠加封面图层 */
function attachCoverOverlay(chart: any, rows: any[], router: Router) {
  const elements: any[] = [];
  rows.forEach((book: any, i: number) => {
    let yPx: number;
    try {
      yPx = chart.convertToPixel({ yAxisIndex: 0 }, i);
    } catch {
      return;
    }
    if (typeof yPx !== 'number' || isNaN(yPx)) return;
    elements.push({
      type: 'image',
      id: `top-cover-${chart.id || 'c'}-${i}-${book.id || i}`,
      style: {
        image: book.coverUrl || book.localCoverData || '',
        x: 10,
        y: yPx - 14,
        width: 28,
        height: 40
      },
      onclick: () => {
        if (book.id) router.push(`/book/detail/${book.id}`);
      },
      $action: 'merge'
    } as any);
  });
  if (elements.length > 0) {
    chart.setOption({ graphic: elements } as any);
  }
}

export interface TopNChartOptions {
  /** 排序后的书籍列表（已过滤、按目标值降序） */
  rows: any[];
  /** 提取目标数值的字段名（如 'total_reading_time' / '_bmCount'） */
  valueKey: string;
  /** xAxis 名称（如 "分钟" / "条"） */
  xName: string;
  /** 柱状条颜色 */
  barColor: string;
  /** 标签格式化函数（柱状图右侧 label） */
  valueFormatter: (v: number) => string;
  /** tooltip 渲染函数 */
  tooltipFormatter: (row: any) => string;
  /** 网格 right 偏移（给封面留位置） */
  gridRight?: number;
  /** 空数据文案 */
  emptyText?: string;
}

export function useTopNChart(router: Router) {
  let resizeTimer: number | null = null;
  let pendingRefEl: HTMLElement | null = null;

  /**
   * 渲染 Top N 横向柱状图
   * - rows 应为按 valueKey 降序排好序的数组
   * - 自动按 valueKey 升序传入 ECharts（使最大值在最上面）
   */
  function render(
    refEl: Ref<HTMLElement | null>,
    options: TopNChartOptions,
    forceRecreate: boolean = false
  ) {
    const el = refEl.value;
    if (!el) return;
    pendingRefEl = el;

    const { rows, valueKey, xName, barColor, valueFormatter, tooltipFormatter, gridRight = 90, emptyText = '暂无数据' } = options;

    let chart = echarts.getInstanceByDom(el) as any;
    if (forceRecreate || !chart) {
      echarts.dispose(el);
      chart = markRaw(echarts.init(el));
    }
    if (rows.length === 0) {
      chart.clear();
      chart.setOption({
        title: { text: emptyText, left: 'center', top: 'middle', textStyle: { color: '#999' } }
      });
      return;
    }
    // 升序传入 ECharts（数值大的在最上面）
    const sorted = [...rows].sort((a: any, b: any) => (a[valueKey] || 0) - (b[valueKey] || 0));
    const labels = sorted.map((b: any) => b.title || '未命名');
    const values = sorted.map((b: any) => Math.round(b[valueKey] || 0));

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          const book = sorted[idx];
          if (!book) return '';
          return tooltipFormatter(book);
        }
      },
      grid: { left: 110, right: gridRight, top: 20, bottom: 30, containLabel: false },
      xAxis: { type: 'value', name: xName, nameTextStyle: { color: '#999' } },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { show: false }
      },
      series: [{
        type: 'bar',
        data: values,
        barWidth: 18,
        itemStyle: { color: barColor, borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => valueFormatter(p.value)
        }
      }]
    });

    // 清掉旧 graphic 后叠加封面
    chart.setOption({ graphic: [] } as any);
    attachCoverOverlay(chart, sorted, router);
  }

  /** 触发当前 refEl 的封面位置重算（用于 resize 后） */
  function refreshOverlay() {
    if (!pendingRefEl) return;
    const chart = echarts.getInstanceByDom(pendingRefEl) as any;
    if (!chart) return;
    // 触发 resize 即可（chart 内部会重新计算 graphic 位置）
    try {
      chart.resize();
    } catch (e) {
      // ignore
    }
  }

  /** 150ms 防抖的 window resize 监听 */
  function onWindowResize() {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      refreshOverlay();
    }, 150);
  }

  onMounted(() => {
    window.addEventListener('resize', onWindowResize);
  });
  onUnmounted(() => {
    window.removeEventListener('resize', onWindowResize);
    if (resizeTimer) window.clearTimeout(resizeTimer);
  });

  return { render };
}
