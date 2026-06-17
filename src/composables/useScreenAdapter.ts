import { ref, onMounted, onBeforeUnmount, computed, type CSSProperties } from 'vue';

/**
 * 屏幕适配 Composable
 *
 * 根据浏览器视口大小、屏幕分辨率及 DPI 动态计算缩放比例。
 * 所有尺寸调整都通过 transform: scale() 实现，保持元素比例一致。
 *
 * 使用示例：
 *   const { scaleRatio, containerStyle, screenInfo } = useScreenAdapter({
 *     baseWidth: 1280,   // 设计基准宽度（CSS像素）
 *     baseHeight: 800,   // 设计基准高度
 *     baseDpr: 1,        // 基准设备像素比
 *     minScale: 0.5,     // 最小缩放比例
 *     maxScale: 1.5      // 最大缩放比例
 *   });
 *
 *   <div :style="containerStyle">...</div>
 */

export interface ScreenInfo {
  /** 视口宽度（CSS像素） */
  viewportWidth: number;
  /** 视口高度（CSS像素） */
  viewportHeight: number;
  /** 屏幕宽度（物理像素） */
  screenWidth: number;
  /** 屏幕高度（物理像素） */
  screenHeight: number;
  /** 设备像素比（DPR） */
  devicePixelRatio: number;
  /** 缩放比例（基于配置计算） */
  scaleRatio: number;
}

export interface ScreenAdapterOptions {
  /** 基准设计宽度（CSS像素），用于横向缩放参考 */
  baseWidth?: number;
  /** 基准设计高度（CSS像素），用于纵向缩放参考 */
  baseHeight?: number;
  /** 基准设备像素比 */
  baseDpr?: number;
  /** 最小缩放比例 */
  minScale?: number;
  /** 最大缩放比例 */
  maxScale?: number;
  /** 是否根据视口宽度缩放 */
  enableWidthScale?: boolean;
  /** 是否根据视口高度缩放 */
  enableHeightScale?: boolean;
  /** 是否根据设备像素比缩放 */
  enableDprScale?: boolean;
}

const DEFAULT_OPTIONS: Required<ScreenAdapterOptions> = {
  baseWidth: 1280,
  baseHeight: 800,
  baseDpr: 1,
  minScale: 0.5,
  maxScale: 1.5,
  enableWidthScale: true,
  enableHeightScale: false,
  enableDprScale: true,
};

export function useScreenAdapter(options: ScreenAdapterOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 响应式屏幕信息
  const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : opts.baseWidth);
  const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : opts.baseHeight);
  const screenWidth = ref(typeof window !== 'undefined' ? window.screen.width : opts.baseWidth);
  const screenHeight = ref(typeof window !== 'undefined' ? window.screen.height : opts.baseHeight);
  const devicePixelRatio = ref(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

  /**
   * 计算缩放比例
   * 取宽度比、高度比、DPR 调整中的最大或平均值（取横向为主导）
   */
  const scaleRatio = computed(() => {
    const ratios: number[] = [];

    if (opts.enableWidthScale) {
      ratios.push(viewportWidth.value / opts.baseWidth);
    }
    if (opts.enableHeightScale) {
      ratios.push(viewportHeight.value / opts.baseHeight);
    }
    if (opts.enableDprScale) {
      // DPR 调整：高 DPR 屏幕（如 Retina）可适当放大
      const dprRatio = Math.max(1, devicePixelRatio.value / opts.baseDpr);
      ratios.push(dprRatio);
    }

    // 默认取最大值，确保元素在小屏上不至于过小
    let scale = ratios.length > 0 ? Math.max(...ratios) : 1;

    // 限制在最小/最大范围内
    scale = Math.max(opts.minScale, Math.min(opts.maxScale, scale));

    return Number(scale.toFixed(3));
  });

  /** 屏幕信息汇总 */
  const screenInfo = computed<ScreenInfo>(() => ({
    viewportWidth: viewportWidth.value,
    viewportHeight: viewportHeight.value,
    screenWidth: screenWidth.value,
    screenHeight: screenHeight.value,
    devicePixelRatio: devicePixelRatio.value,
    scaleRatio: scaleRatio.value,
  }));

  /** 容器样式 - 应用于外层包装元素，使内部所有内容按比例缩放 */
  const containerStyle = computed<CSSProperties>(() => {
    const scale = scaleRatio.value;
    return {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      // 缩放后实际占据的空间需要按比例补偿，否则会溢出
      width: `${100 / scale}%`,
      height: `${100 / scale}%`,
    };
  });

  /** 用于行内子元素的缩放样式（仅 transform，不调整外层尺寸） */
  const contentStyle = computed<CSSProperties>(() => {
    const scale = scaleRatio.value;
    return {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    };
  });

  /** 监听窗口尺寸变化 */
  const handleResize = () => {
    if (typeof window === 'undefined') return;
    viewportWidth.value = window.innerWidth;
    viewportHeight.value = window.innerHeight;
    screenWidth.value = window.screen.width;
    screenHeight.value = window.screen.height;
  };

  /** 监听 DPR 变化（如多屏切换、缩放） */
  const handleDprChange = () => {
    if (typeof window === 'undefined') return;
    devicePixelRatio.value = window.devicePixelRatio || 1;
  };

  // 用于匹配 DPR 变化的 media query
  let dprMediaQuery: MediaQueryList | null = null;

  onMounted(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', handleResize);
    // 监听 DPR 变化（通过 mediaQueryList）
    dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    if (dprMediaQuery) {
      dprMediaQuery.addEventListener('change', handleDprChange);
    }
    // 初始化
    handleResize();
    handleDprChange();
  });

  onBeforeUnmount(() => {
    if (typeof window === 'undefined') return;
    window.removeEventListener('resize', handleResize);
    if (dprMediaQuery) {
      dprMediaQuery.removeEventListener('change', handleDprChange);
    }
  });

  return {
    /** 当前缩放比例 */
    scaleRatio,
    /** 详细屏幕信息 */
    screenInfo,
    /** 容器包装样式（缩放 + 尺寸补偿） */
    containerStyle,
    /** 内容缩放样式（仅 transform） */
    contentStyle,
  };
}

/**
 * 全局缩放 - 用于整个应用或某个区域
 * 简化版本：仅根据视口宽度 + DPR 计算缩放
 */
export function useGlobalScale() {
  return useScreenAdapter({
    baseWidth: 1920,
    baseHeight: 1080,
    baseDpr: 1,
    minScale: 0.6,
    maxScale: 1.8,
    enableWidthScale: true,
    enableHeightScale: false,
    enableDprScale: true,
  });
}

export default useScreenAdapter;
