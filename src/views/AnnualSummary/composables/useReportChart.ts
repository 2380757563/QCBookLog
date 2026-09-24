/**
 * 年度报告图表 Composable
 *
 * 职责：
 * - 按卷轴报告的复古配色渲染轻量 ECharts 图（环形 / 柱状 / 热力）
 * - 提供 getImage() 把 canvas 转为 dataURL，供 PDF / HTML 导出时冻结为静态图
 * - 组件卸载或数据变更时正确 dispose，避免实例泄漏
 *
 * 与 Reading 页的 useDistributionChart / useTopNChart 的区别：
 * 那两个面向统计面板（可交互、带封面浮层），本文件面向「离线导出友好」，
 * 因此统一走 canvas renderer + 关闭动画，导出时可直接取图。
 */
import { markRaw, type Ref } from 'vue';
import * as echarts from 'echarts';

/** 报告统一配色（纸张 + 墨色 + 金） */
export const REPORT_PALETTE = [
  '#c9a227',
  '#8c6239',
  '#a9927d',
  '#5c7a6b',
  '#7d5a6b',
  '#4a6b8a',
  '#b5651d',
  '#6b705c'
];

const AXIS_STYLE = {
  axisLine: { lineStyle: { color: '#c9bfae' } },
  axisTick: { show: false },
  axisLabel: { color: '#8c7a63', fontSize: 11 },
  splitLine: { lineStyle: { color: 'rgba(201, 191, 174, 0.35)' } }
};

type ChartKind = 'donut' | 'barV';

interface ChartConfig {
  kind: ChartKind;
  data: { name: string; value: number }[];
  /** 数值单位，用于 tooltip 与标签，如「本」「分钟」 */
  unit?: string;
  /** 柱状图 x 轴名称 */
  xName?: string;
  /** 环形图中心文案（大数字） */
  centerText?: string;
  /** 环形图中心副文案 */
  centerSubText?: string;
  emptyText?: string;
}

/** 深拷贝一份数据，避免 ECharts 内部引用污染原始 stats */
function toSeriesData(data: { name: string; value: number }[]) {
  return data.map((d, i) => ({
    name: d.name,
    value: d.value,
    itemStyle: { color: REPORT_PALETTE[i % REPORT_PALETTE.length] }
  }));
}

function buildOption(config: ChartConfig) {
  const unit = config.unit ?? '';

  if (config.kind === 'donut') {
    const total = config.data.reduce((sum, d) => sum + (d.value || 0), 0);
    return {
      animation: false,
      tooltip: { trigger: 'item', formatter: `{b}: {c}${unit} ({d}%)` },
      legend: {
        bottom: 0,
        left: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#6b5c47', fontSize: 11 }
      },
      graphic: config.centerText
        ? [
            {
              type: 'text',
              left: 'center',
              // 与 series.center 的 38% 对齐：主副文案分列圆心上下，
              // 整体落在环形空缺的正中
              top: '31%',
              style: {
                text: config.centerText,
                fill: '#2b2118',
                fontSize: 26,
                fontWeight: 700,
                fontFamily: 'Georgia, serif',
                textAlign: 'center'
              }
            },
            config.centerSubText
              ? {
                  type: 'text',
                  left: 'center',
                  top: '43%',
                  style: {
                    text: config.centerSubText,
                    fill: '#9c8b73',
                    fontSize: 11,
                    textAlign: 'center'
                  }
                }
              : null
          ].filter(Boolean) as any[]
        : undefined,
      series: [
        {
          type: 'pie',
          // 半径按容器短边计算，宽度富余而高度有限，因此取值需保守。
          // 下方还有一层 legend 占位，所以外径取 56%、圆心取 38%：
          // 0.38H + 0.56H = 0.94H，余下的 6% 正好容纳底部 legend，
          // 标签不会被 avoidLabelOverlap 挤到容器下沿去压住后续内容。
          radius: ['38%', '56%'],
          center: ['50%', '38%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#faf6ee', borderWidth: 2, borderRadius: 3 },
          label: {
            show: true,
            formatter: `{b}\n{d}%`,
            color: '#6b5c47',
            fontSize: 11,
            lineHeight: 15
          },
          labelLine: {
            length: 8,
            length2: 8,
            lineStyle: { color: '#c9bfae' }
          },
          data: toSeriesData(config.data)
        }
      ],
      // total 仅用于自检，避免 tree-shaking 误删
      _total: total
    } as any;
  }

  // barV：竖直柱状图（月度分布）
  return {
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const p = params[0];
        if (!p) return '';
        return `${p.name}<br/>${p.value}${unit}`;
      }
    },
    grid: { left: 40, right: 16, top: 18, bottom: 26, containLabel: true },
    xAxis: {
      type: 'category',
      data: config.data.map(d => d.name),
      ...AXIS_STYLE
    },
    yAxis: {
      type: 'value',
      name: config.xName ?? '',
      nameTextStyle: { color: '#9c8b73', fontSize: 11 },
      ...AXIS_STYLE
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 22,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#d8b64a' },
            { offset: 1, color: '#a98a2b' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          color: '#8c7a63',
          fontSize: 10,
          formatter: (p: any) => (p.value ? String(p.value) : '')
        },
        data: config.data.map(d => d.value)
      }
    ]
  } as any;
}

export function useReportChart() {
  /** 元素 -> ECharts 实例，便于批量 dispose 与取图 */
  const instances = new Map<HTMLElement, any>();

  function render(el: HTMLElement | Ref<HTMLElement | null> | null, config: ChartConfig, forceRecreate = false) {
    const target = el && typeof el === 'object' && 'value' in el ? el.value : (el as HTMLElement | null);
    if (!target) return;

    const hasData = config.data.some(d => (d.value || 0) > 0);

    let chart = instances.get(target);
    if (forceRecreate || !chart) {
      echarts.dispose(target);
      chart = markRaw(echarts.init(target, undefined, { renderer: 'canvas' }));
      instances.set(target, chart);
    } else if (!echarts.getInstanceByDom(target)) {
      // DOM 被重建（如重新生成报告）后实例已失效
      chart = markRaw(echarts.init(target, undefined, { renderer: 'canvas' }));
      instances.set(target, chart);
    }

    if (!hasData) {
      chart.clear();
      chart.setOption({
        animation: false,
        title: {
          text: config.emptyText ?? '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#a99983', fontSize: 13, fontWeight: 400 }
        }
      });
      return;
    }

    chart.setOption(buildOption(config), true);
  }

  /** 取图表静态图（导出 PDF / HTML 时冻结 canvas） */
  function getImage(el: HTMLElement | null, pixelRatio = 2): string {
    if (!el) return '';
    const chart = instances.get(el) as any;
    if (!chart) return '';
    try {
      return chart.getDataURL({ type: 'png', pixelRatio, backgroundColor: '#faf6ee' }) as string;
    } catch {
      return '';
    }
  }

  function dispose(el?: HTMLElement | null) {
    if (el) {
      const chart = instances.get(el);
      if (chart) chart.dispose();
      instances.delete(el);
      return;
    }
    for (const [node, chart] of instances) {
      chart.dispose();
      instances.delete(node);
    }
  }

  return { render, getImage, dispose, instances };
}
