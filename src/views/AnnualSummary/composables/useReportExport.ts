/**
 * 年度报告导出
 * ------------------------------------------------------------------
 * 提供三种导出形态：
 * 1. exportPdf('scroll') —— 长图单页 PDF：整份卷轴等比铺满一页（A4 宽 210mm，页高按内容比例）
 * 2. exportPdf('a4')     —— 分页 A4 PDF：按 A4 比例切片分页，页间尽量对齐段落边界
 * 3. exportHtml()        —— 单文件 HTML：克隆 DOM + 内联样式 + 图片转 base64，离线可看
 *
 * 为什么要分段光栅化：
 * 浏览器单张 canvas 的尺寸上限约为 16384px（Chrome），报告长卷常超过该值。
 * 因此把长卷按 `MAX_SEGMENT_HEIGHT` 切段，逐段 html2canvas，再在离屏大 canvas 上拼接，
 * 最后一次性交给 jsPDF。
 *
 * html2canvas / jspdf 体积较大，全部通过动态 import() 懒加载，不进入首屏包。
 */

import { ref, type Ref } from 'vue';

/** 单段最大高度（px）—— 低于 Chrome 的 16384 上限留安全余量 */
const MAX_SEGMENT_HEIGHT = 8000;

/** 光栅化倍率：2 倍在清晰度与体积间取平衡（210mm 宽约 1588px @96dpi） */
const PIXEL_RATIO = 2;

/** 导出背景色：与卷轴底色一致，避免 PNG 透明处转 PDF 变黑 */
const EXPORT_BACKGROUND = '#faf6ee';

/** A4 尺寸（mm） */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export type PdfMode = 'scroll' | 'a4';

export interface ExportProgress {
  /** 0 ~ 100 */
  percent: number;
  /** 中文阶段描述 */
  text: string;
}

export interface UseReportExportOptions {
  /** 被导出的 DOM 根节点（卷轴容器） */
  root: Ref<HTMLElement | null>;
  /**
   * 导出前调用的钩子：负责开启导出模式（停动画 / 强制显示段落），
   * 返回 Promise 以便等待 DOM 更新完成。
   */
  beforeExport: () => Promise<void> | void;
  /** 导出结束后调用的钩子：关闭导出模式 */
  afterExport: () => void;
}

/** 文件名中的年份等文案 */
export interface ExportFileMeta {
  year: number | string;
  /** HTML 导出时是否内联动画脚本（淡入 + 礼花），默认 false */
  animated?: boolean;
}

export function useReportExport(options: UseReportExportOptions) {
  const { root, beforeExport, afterExport } = options;

  const exporting = ref(false);
  const progress = ref<ExportProgress>({ percent: 0, text: '' });
  const errorMessage = ref('');

  const setProgress = (percent: number, text: string) => {
    progress.value = { percent: Math.max(0, Math.min(100, Math.round(percent))), text };
  };

  /** 让出主线程一帧，避免长时间同步计算卡死 UI */
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve(null)));

  /* ---------------- 长图光栅化（分段拼接） ---------------- */

  /**
   * 把长卷逐段光栅化为一张离屏 canvas。
   * 每段通过临时改写 `top` / `clip` 的方式截取，避免为每段克隆 DOM。
   */
  const rasterize = async (
    html2canvas: typeof import('html2canvas').default,
    element: HTMLElement,
    onSegment: (done: number, total: number) => void
  ): Promise<HTMLCanvasElement> => {
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const segmentCount = Math.max(1, Math.ceil(height / MAX_SEGMENT_HEIGHT));

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(width * PIXEL_RATIO);
    canvas.height = Math.floor(height * PIXEL_RATIO);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建画布上下文');
    ctx.fillStyle = EXPORT_BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < segmentCount; i++) {
      const offsetY = i * MAX_SEGMENT_HEIGHT;
      const segmentHeight = Math.min(MAX_SEGMENT_HEIGHT, height - offsetY);

      const shot = await html2canvas(element, {
        backgroundColor: EXPORT_BACKGROUND,
        scale: PIXEL_RATIO,
        useCORS: true,
        logging: false,
        width,
        height: segmentHeight,
        // 通过 windowHeight 与 y 偏移，让 html2canvas 只渲染目标区间
        windowWidth: width,
        windowHeight: segmentHeight,
        y: offsetY
      });

      ctx.drawImage(shot, 0, Math.floor(offsetY * PIXEL_RATIO));
      onSegment(i + 1, segmentCount);
      await nextFrame();
    }

    return canvas;
  };

  /* ---------------- PDF：长图单页 ---------------- */

  const exportScrollPdf = async (
    html2canvas: typeof import('html2canvas').default,
    { jsPDF }: typeof import('jspdf'),
    element: HTMLElement,
    meta: ExportFileMeta
  ) => {
    setProgress(8, '正在光栅化长卷…');
    const canvas = await rasterize(html2canvas, element, (done, total) => {
      setProgress(8 + (done / total) * 62, `正在光栅化长卷…（${done}/${total}）`);
    });

    setProgress(74, '正在生成 PDF…');
    const imgWidthMm = A4_WIDTH_MM;
    const imgHeightMm = (canvas.height / canvas.width) * imgWidthMm;

    // 单位 mm，页面高度按内容等比延展 = 一张「长图单页」
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [imgWidthMm, imgHeightMm]
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidthMm, imgHeightMm, undefined, 'FAST');

    // 释放大 canvas，尽早回收内存
    canvas.width = 0;
    canvas.height = 0;

    setProgress(96, '正在下载…');
    pdf.save(`年度报告-${meta.year}.pdf`);
  };

  /* ---------------- PDF：分页 A4 ---------------- */

  const exportA4Pdf = async (
    html2canvas: typeof import('html2canvas').default,
    { jsPDF }: typeof import('jspdf'),
    element: HTMLElement,
    meta: ExportFileMeta
  ) => {
    setProgress(8, '正在光栅化长卷…');
    const canvas = await rasterize(html2canvas, element, (done, total) => {
      setProgress(8 + (done / total) * 62, `正在光栅化长卷…（${done}/${total}）`);
    });

    setProgress(74, '正在分页…');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // 1mm 对应的 canvas 像素数
    const pxPerMm = canvas.width / A4_WIDTH_MM;
    const pageSliceHeightPx = Math.floor(A4_HEIGHT_MM * pxPerMm);

    // 段落边界：用于把切点吸附到段落起点，避免同一行文字被劈成两页
    const boundaries = collectSectionBoundaries(element, pxPerMm);

    const pageCanvas = document.createElement('canvas');
    const pageCtx = pageCanvas.getContext('2d');
    if (!pageCtx) throw new Error('无法创建画布上下文');

    let offsetY = 0;
    let pageIndex = 0;
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageSliceHeightPx));

    while (offsetY < canvas.height) {
      const remaining = canvas.height - offsetY;
      let sliceHeight = Math.min(pageSliceHeightPx, remaining);

      // 若非最后一页，尝试把切点回退到最近一个段落边界（避免切断文字行）
      if (remaining > pageSliceHeightPx) {
        const snapped = snapToBoundary(offsetY + sliceHeight, offsetY, pageSliceHeightPx, boundaries);
        sliceHeight = snapped - offsetY;
      }

      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      pageCtx.fillStyle = EXPORT_BACKGROUND;
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(
        canvas,
        0,
        offsetY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      if (pageIndex > 0) pdf.addPage();
      // 实际内容高度（mm）：避免短页被拉伸变形
      const contentHeightMm = (sliceHeight / pxPerMm);
      pdf.addImage(
        pageCanvas.toDataURL('image/jpeg', 0.92),
        'JPEG',
        0,
        0,
        A4_WIDTH_MM,
        contentHeightMm,
        undefined,
        'FAST'
      );

      offsetY += sliceHeight;
      pageIndex++;
      setProgress(74 + (pageIndex / totalPages) * 22, `正在分页…（${pageIndex}/${totalPages}）`);
      await nextFrame();
    }

    canvas.width = 0;
    canvas.height = 0;
    pageCanvas.width = 0;
    pageCanvas.height = 0;

    setProgress(96, '正在下载…');
    pdf.save(`年度报告-${meta.year}-A4.pdf`);
  };

  /** 收集各段落顶边在 canvas 中的 y（px），按升序返回 */
  const collectSectionBoundaries = (element: HTMLElement, pxPerMm: number): number[] => {
    const rootTop = element.getBoundingClientRect().top;
    const nodes = element.querySelectorAll<HTMLElement>('.report-section, .report-hero, .report-foot');
    const list: number[] = [];
    nodes.forEach(node => {
      const top = node.getBoundingClientRect().top - rootTop;
      list.push(Math.round(top * PIXEL_RATIO));
    });
    // 兜底：pxPerMm 传入但此处只用像素，保留参数以备未来按 mm 对齐
    void pxPerMm;
    return list.sort((a, b) => a - b);
  };

  /**
   * 把理想切点吸附到不超过 `maxHeight` 的最近段落边界。
   * 若吸附后剩余高度过小（< 页高 55%），说明该边界太靠上，放弃吸附以避免大量留白。
   */
  const snapToBoundary = (
    idealBottom: number,
    top: number,
    pageHeight: number,
    boundaries: number[]
  ): number => {
    let best = idealBottom;
    for (const b of boundaries) {
      if (b <= top) continue;
      if (b > idealBottom) break;
      best = b;
    }
    // 吸附后页高不得低于 55%，否则留白过多，退回原始切点
    if (best - top < pageHeight * 0.55) return idealBottom;
    return best;
  };

  /* ---------------- 单文件 HTML ---------------- */

  const exportHtml = async (element: HTMLElement, meta: ExportFileMeta) => {
    setProgress(30, '正在打包 HTML…');

    const animated = meta.animated === true;

    const clone = element.cloneNode(true) as HTMLElement;
    // 清理仅在线需要的交互元素
    clone.classList.remove('export-mode', 'print-mode');
    // BGM 无论是否带动画都不导出（需内联音频，体积过大）
    clone.querySelectorAll('.report-bgm, .confetti-canvas, audio').forEach(n => n.remove());

    // 带动画时保留卷首提示文案，否则它在离线文件里没有意义
    if (!animated) {
      clone.querySelectorAll('.report-hero__hint').forEach(n => n.remove());
    }

    setProgress(52, '正在内联样式…');
    const css = collectStyleText();
    await inlineImages(clone);
    inlineCharts(clone, element);

    const html = buildHtmlDocument(css, clone.outerHTML, meta, animated ? buildAnimationScript() : '');

    setProgress(90, '正在下载…');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, `年度报告-${meta.year}.html`);
  };

  /** 抓取页面全部样式表文本（含 Vite 注入的 scoped 样式） */
  const collectStyleText = (): string => {
    const chunks: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules;
        if (!rules) continue;
        for (const rule of Array.from(rules)) chunks.push(rule.cssText);
      } catch {
        // 跨域样式表无法读取，跳过（本项目样式均为同源）
      }
    }
    return chunks.join('\n');
  };

  /** 把 img 转成 base64，保证离线打开仍有图 */
  const inlineImages = async (container: HTMLElement) => {
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        img =>
          new Promise<void>(resolve => {
            const src = img.getAttribute('src') || '';
            if (!src || src.startsWith('data:')) return resolve();
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                canvas.getContext('2d')?.drawImage(image, 0, 0);
                img.setAttribute('src', canvas.toDataURL('image/png'));
              } catch {
                /* 转换失败则保留原 src */
              }
              resolve();
            };
            image.onerror = () => resolve();
            image.src = src;
          })
      )
    );
  };

  /**
   * echarts 在线时是 canvas，克隆后内容为空；
   * 用原节点中已经渲染好的 canvas 导出图替换克隆节点中的 canvas。
   */
  const inlineCharts = (clone: HTMLElement, source: HTMLElement) => {
    const srcCharts = Array.from(source.querySelectorAll<HTMLElement>('[data-chart]'));
    const cloneCharts = Array.from(clone.querySelectorAll<HTMLElement>('[data-chart]'));
    srcCharts.forEach((srcNode, index) => {
      const cloneNode = cloneCharts[index];
      if (!cloneNode) return;
      const srcCanvas = srcNode.querySelector('canvas');
      if (!srcCanvas) return;
      const img = document.createElement('img');
      img.src = srcCanvas.toDataURL('image/png');
      img.style.width = '100%';
      // 必须同时锁定高度：图片按自身宽高比随宽度缩放，而导出文档的可用宽度
      // 通常与在线时不同（如 .chart--donut 在线 472px、导出后 637px），
      // 只设宽度会让图片按比例长高并溢出错位，压住下方的常读作者表格。
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      cloneNode.innerHTML = '';
      cloneNode.appendChild(img);
    });
  };

  /**
   * 生成注入到导出 HTML 中的动画脚本。
   *
   * 为什么需要它：
   * 应用内的动画由 Vue 运行时驱动（响应式状态 + 组件），而导出的是静态快照，
   * 不含任何 JS，因此段落淡入与卷首礼花全部失效。这里用原生 JS 重放这两项效果，
   * 不依赖 Vue，保证离线文件自足。
   *
   * 包含两部分：
   * 1. 段落淡入：IntersectionObserver 观察 .report-section，进入视口时加 --revealed 类
   * 2. 点击礼花：改写自 ConfettiBurst.vue 的粒子逻辑，点击卷首时绽放
   *
   * 注意：脚本内不能出现 `</script>` 字面量，否则会提前闭合标签。
   */
  const buildAnimationScript = (): string => {
    return `
(function () {
  'use strict';

  /* ---------- 1. 段落滚动淡入 ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('.report-section'));

  var reveal = function (el) { el.classList.add('report-section--revealed'); };

  // 必须在「页面加载完成、布局稳定」之后再接管，原因有两个：
  // 1. 脚本位于 </body> 前同步执行时，浏览器尚未完成布局，元素 rect 全是 0，
  //    IntersectionObserver 会把所有段落一次性判定为 intersecting，动画全部失效；
  // 2. 提前摘掉 --static 会让页面先空白、再闪出内容。
  // 因此这里保持 --static 不动（段落可见），等到 load 后再交接给 observer。
  var start = function () {
    if (!sections.length) return;

    // 交接：摘掉 --static，段落回到 opacity: 0 的初始态，由 observer 逐个唤醒。
    // 同步摘类 + 后续分帧 observe，保证浏览器能观测到 opacity 0 → 1 的过渡。
    sections.forEach(function (el) { el.classList.remove('report-section--static'); });

    if (typeof IntersectionObserver === 'undefined') {
      // 环境不支持时直接显示，避免永久停留在 opacity: 0
      sections.forEach(reveal);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    // 下一帧再 observe：给浏览器一次重算样式的机会，使 opacity: 0 成为过渡起点。
    requestAnimationFrame(function () {
      sections.forEach(function (el) { observer.observe(el); });

      // 兜底：若 observer 因任何原因未回调（如异常滚动容器），首屏会整片空白。
      // 这里仅对「确实处在首屏内」的段落强制显示，不影响下方段落的滚动动画。
      //
      // 注意：必须用 offsetTop（相对文档的绝对位置）而不是 getBoundingClientRect。
      // 在 load 之后图片解码等仍可能让布局短暂处于未完成状态，此时 rect 会返回 0，
      // 导致末尾段落被误判为「在首屏内」而提前显示，滚动到该段时就没有动画了。
      requestAnimationFrame(function () {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
        var limit = window.innerHeight * 0.88;
        sections.forEach(function (el) {
          if (el.classList.contains('report-section--revealed')) return;
          var top = el.offsetTop - scrollTop;
          if (top >= 0 && top < limit) reveal(el);
        });
      });
    });
  };

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start);
  }

  /* ---------- 2. 点击卷首放礼花 ---------- */
  var hero = document.querySelector('.report-hero');
  if (!hero) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  document.body.appendChild(canvas);

  var COLORS = ['#ff6b35', '#00b51d', '#ffd700', '#4da6ff', '#ff5c8a', '#9c6bff', '#ff9f43'];
  var particles = [];
  var rafId = 0;

  var fire = function () {
    var W = window.innerWidth;
    var H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.display = 'block';
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    particles = [];
    var spawn = function (x, y, baseAngle, count, speed) {
      for (var i = 0; i < count; i++) {
        var angle = baseAngle + (Math.random() - 0.5) * (Math.PI / 3);
        var v = speed * (0.55 + Math.random() * 0.7);
        particles.push({
          x: x, y: y,
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
    spawn(-10, H * 0.85, -Math.PI / 3.2, 60, 15);
    spawn(W + 10, H * 0.85, -Math.PI + Math.PI / 3.2, 60, 15);
    spawn(W / 2, H * 0.95, -Math.PI / 2, 50, 13);

    cancelAnimationFrame(rafId);
    var last = performance.now();

    var tick = function (now) {
      var dt = Math.min((now - last) / 16.67, 3);
      last = now;
      ctx.clearRect(0, 0, W, H);
      var alive = false;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.vy += 0.32 * dt;
        p.vx *= 0.995;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > H * 0.55) p.opacity -= 0.006 * dt;
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
        ctx.clearRect(0, 0, W, H);
        canvas.style.display = 'none';
      }
    };
    rafId = requestAnimationFrame(tick);
  };

  hero.style.cursor = 'pointer';
  hero.addEventListener('click', fire);
})();
`;
  };

  /** 组装单文件 HTML 文档 */
  const buildHtmlDocument = (css: string, bodyHtml: string, meta: ExportFileMeta, script: string): string => {
    // 脚本为空时（纯静态导出）不输出 <script> 标签，避免多一个空标签
    const scriptTag = script ? `<script>${script}</script>` : '';
    // 礼花画布由脚本动态创建，不带 Vue 的 data-v 哈希，因此 scoped 规则命中不了，
    // 这里补一份非 scoped 的兜底样式，保证固定定位与层级正确
    const confettiCss = (animated: boolean) =>
      animated
        ? '.confetti-canvas { position: fixed; inset: 0; z-index: 11500; pointer-events: none; display: none; }'
        : '';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>年度报告 ${meta.year} · 青橙读书记录</title>
<style>
${css}
${confettiCss(!!script)}
/* 应用外壳样式（style.css）也会被 collectStyleText 抓进来，其中的
   html,body{height:100%} 会把导出文档的高度钉死为一屏，
   导致长卷超出部分失去背景。这里放在最后并强制复位。 */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: auto !important;
  min-height: 100%;
  overflow: visible !important;
  background: #f2efe6;
}
body {
  display: block;
  padding: 24px 12px;
  box-sizing: border-box;
}
</style>
</head>
<body>
${bodyHtml}
${scriptTag}
</body>
</html>`;
  };

  /** 触发浏览器下载 */
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ---------------- 对外入口 ---------------- */

  /** 统一的执行包装：导出模式 → 执行 → 复位 → 错误兜底 */
  const runExport = async (task: () => Promise<void>) => {
    if (exporting.value) return;
    const element = root.value;
    if (!element) {
      errorMessage.value = '报告尚未渲染完成，请稍后再试。';
      return;
    }

    exporting.value = true;
    errorMessage.value = '';
    setProgress(2, '正在准备导出…');

    try {
      await beforeExport();
      // 等两帧：确保 DOM 类名与布局都已稳定
      await nextFrame();
      await nextFrame();
      await task();
      setProgress(100, '导出完成');
    } catch (e: any) {
      errorMessage.value = e?.message || '导出失败，请改用「打印 / 另存为 PDF」重试。';
    } finally {
      afterExport();
      exporting.value = false;
      // 保留“导出完成”提示 1.2s 后清空
      setTimeout(() => {
        if (progress.value.percent >= 100) progress.value = { percent: 0, text: '' };
      }, 1200);
    }
  };

  const exportPdf = (mode: PdfMode, meta: ExportFileMeta) =>
    runExport(async () => {
      setProgress(5, '正在加载导出组件…');
      const [{ default: html2canvas }, jspdfModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      const element = root.value as HTMLElement;
      if (mode === 'scroll') {
        await exportScrollPdf(html2canvas, jspdfModule, element, meta);
      } else {
        await exportA4Pdf(html2canvas, jspdfModule, element, meta);
      }
    });

  const exportHtmlFile = (meta: ExportFileMeta) =>
    runExport(async () => {
      await exportHtml(root.value as HTMLElement, meta);
    });

  /** 浏览器打印兜底：无需任何依赖，长卷会被拆成多页 */
  const printReport = () => {
    setProgress(0, '');
    window.print();
  };

  return {
    exporting,
    progress,
    errorMessage,
    exportPdf,
    exportHtml: exportHtmlFile,
    printReport
  };
}

export default useReportExport;
