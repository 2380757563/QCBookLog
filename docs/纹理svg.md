以下是严格按照你要求的**三层包裹结构、统一左上方45°光源、分材质真实感**的成品SVG代码，每个都包含完整的纹理、光影和层级结构，可直接引入项目通过CSS变量动态控制。

---

## 一、精装书系列（三层结构+分材质）
### 1. 精装布面（binding2=3）：织物纹理+哑光漫反射
```svg
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 布面织物纹理 -->
    <pattern id="fabricTexture" width="4" height="4" patternUnits="userSpaceOnUse">
      <path d="M0 0h4v1H0zM0 2h4v1H0zM0 0v4h1V0zM2 0v4h1V0z" fill="rgba(0,0,0,0.08)" />
    </pattern>
    <!-- 封面贴合面渐变（哑光） -->
    <linearGradient id="fabricCoverGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--corner-color, #7a6b5a)" />
      <stop offset="100%" stop-color="var(--corner-color-dark, #5a4d3e)" />
    </linearGradient>
    <!-- 侧边包裹面渐变 -->
    <linearGradient id="fabricSideGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--corner-color-dark, #5a4d3e)" />
      <stop offset="100%" stop-color="var(--corner-color-darker, #4a3d2e)" />
    </linearGradient>
    <!-- 内阴影滤镜 -->
    <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feOffset dx="2" dy="2" result="offset" />
      <feGaussianBlur stdDeviation="1.5" in="offset" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadow" />
    </filter>
  </defs>

  <!-- 中层：包角主体层 -->
  <!-- 封面贴合面（直角三角形） -->
  <path class="binding-border__cover-face" d="M40 0 L40 40 L0 40" fill="url(#fabricCoverGrad)" />
  <path d="M40 0 L40 40 L0 40" fill="url(#fabricTexture)" opacity="0.8" />
  <!-- 右侧边包裹面（模拟书厚度） -->
  <path class="binding-border__side-edge--right" d="M40 0 L40 40 L35 35 L35 0" fill="url(#fabricSideGrad)" />
  <!-- 下侧边包裹面 -->
  <path class="binding-border__side-edge--bottom" d="M0 40 L40 40 L35 35 L0 35" fill="url(#fabricSideGrad)" />

  <!-- 顶层：光影叠加层 -->
  <!-- 折痕棱线高光（左上侧受光） -->
  <path class="binding-border__crease-highlight" d="M40 2 L2 40" stroke="rgba(255,255,255,0.25)" stroke-width="1.2" stroke-linecap="round" />
  <!-- 折痕棱线暗线（右下侧背光） -->
  <path class="binding-border__crease-shadow" d="M40 4 L4 40" stroke="rgba(0,0,0,0.2)" stroke-width="1" stroke-linecap="round" />
  <!-- 内投影（模拟材料厚度） -->
  <path class="binding-border__inner-shadow" d="M40 0 L40 40 L0 40" fill="none" filter="url(#innerShadow)" opacity="0.6" />
</svg>
```

### 2. 精装真皮牛皮（binding2=5）：荔枝纹+立体凸起油边
```svg
<svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 荔枝纹纹理 -->
    <pattern id="leatherCowTexture" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.8" fill="rgba(0,0,0,0.12)" />
      <circle cx="4" cy="3" r="0.6" fill="rgba(0,0,0,0.1)" />
      <circle cx="2" cy="5" r="0.7" fill="rgba(0,0,0,0.11)" />
    </pattern>
    <!-- 封面贴合面渐变 -->
    <linearGradient id="cowCoverGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--corner-color, #8B4513)" />
      <stop offset="100%" stop-color="var(--corner-color-dark, #654321)" />
    </linearGradient>
    <!-- 油边高光渐变 -->
    <linearGradient id="edgeHighlightGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,220,180,0.6)" />
      <stop offset="100%" stop-color="rgba(255,220,180,0)" />
    </linearGradient>
    <filter id="cowInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feOffset dx="2.5" dy="2.5" result="offset" />
      <feGaussianBlur stdDeviation="2" in="offset" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadow" />
    </filter>
  </defs>

  <!-- 中层：包角主体层 -->
  <path class="binding-border__cover-face" d="M45 0 L45 45 L0 45" fill="url(#cowCoverGrad)" />
  <path d="M45 0 L45 45 L0 45" fill="url(#leatherCowTexture)" opacity="0.9" />
  <path class="binding-border__side-edge--right" d="M45 0 L45 45 L39 39 L39 0" fill="url(#cowCoverGrad)" />
  <path class="binding-border__side-edge--bottom" d="M0 45 L45 45 L39 39 L0 39" fill="url(#cowCoverGrad)" />

  <!-- 顶层：光影叠加层 -->
  <!-- 立体凸起油边 -->
  <path d="M45 0 L45 45 L0 45" fill="none" stroke="var(--corner-color-dark, #654321)" stroke-width="2.5" stroke-linejoin="round" />
  <!-- 油边高光 -->
  <path class="binding-border__crease-highlight" d="M45 1.5 L1.5 45" stroke="url(#edgeHighlightGrad)" stroke-width="1.8" stroke-linecap="round" />
  <!-- 折痕暗线 -->
  <path class="binding-border__crease-shadow" d="M45 4 L4 45" stroke="rgba(0,0,0,0.25)" stroke-width="1.2" stroke-linecap="round" />
  <!-- 内投影 -->
  <path class="binding-border__inner-shadow" d="M45 0 L45 45 L0 45" fill="none" filter="url(#cowInnerShadow)" opacity="0.7" />
</svg>
```

### 3. 精装PU皮（binding2=4）：均匀细纹理+柔和高光
```svg
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- PU皮细纹理 -->
    <pattern id="puTexture" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="3" fill="transparent" />
      <circle cx="1.5" cy="1.5" r="0.3" fill="rgba(0,0,0,0.06)" />
    </pattern>
    <linearGradient id="puCoverGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--corner-color, #2c3e50)" />
      <stop offset="100%" stop-color="var(--corner-color-dark, #1a252f)" />
    </linearGradient>
    <filter id="puInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feOffset dx="2" dy="2" result="offset" />
      <feGaussianBlur stdDeviation="1.5" in="offset" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadow" />
    </filter>
  </defs>

  <!-- 中层 -->
  <path class="binding-border__cover-face" d="M40 0 L40 40 L0 40" fill="url(#puCoverGrad)" />
  <path d="M40 0 L40 40 L0 40" fill="url(#puTexture)" opacity="0.9" />
  <path class="binding-border__side-edge--right" d="M40 0 L40 40 L35 35 L35 0" fill="url(#puCoverGrad)" />
  <path class="binding-border__side-edge--bottom" d="M0 40 L40 40 L35 35 L0 35" fill="url(#puCoverGrad)" />

  <!-- 顶层 -->
  <path class="binding-border__crease-highlight" d="M40 2 L2 40" stroke="rgba(255,255,255,0.2)" stroke-width="1.2" stroke-linecap="round" />
  <path class="binding-border__crease-shadow" d="M40 4 L4 40" stroke="rgba(0,0,0,0.18)" stroke-width="1" stroke-linecap="round" />
  <path class="binding-border__inner-shadow" d="M40 0 L40 40 L0 40" fill="none" filter="url(#puInnerShadow)" opacity="0.6" />
</svg>
```

---

## 二、电子书Matrix变体（2.5D玻璃+绿色数字流）
```svg
<svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 绿色数字流纹理（透明度从内到外衰减） -->
    <pattern id="matrixStream" width="8" height="8" patternUnits="userSpaceOnUse">
      <text x="1" y="6" font-size="5" fill="rgba(0, 255, 0, 0.8)" font-family="monospace">1</text>
      <text x="4" y="3" font-size="4" fill="rgba(0, 255, 0, 0.5)" font-family="monospace">0</text>
    </pattern>
    <!-- 玻璃渐变（淡绿色） -->
    <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(0, 255, 0, 0.15)" />
      <stop offset="50%" stop-color="rgba(0, 255, 0, 0.08)" />
      <stop offset="100%" stop-color="rgba(0, 255, 0, 0.02)" />
    </linearGradient>
    <!-- 玻璃高光渐变 -->
    <linearGradient id="glassHighlightGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(150, 255, 150, 0.4)" />
      <stop offset="100%" stop-color="rgba(150, 255, 150, 0)" />
    </linearGradient>
    <!-- 外发光滤镜 -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- 中层：玻璃主体层 -->
  <path class="binding-border__cover-face" d="M35 0 L35 35 L0 35" fill="url(#glassGrad)" rx="8" />
  <path d="M35 0 L35 35 L0 35" fill="url(#matrixStream)" opacity="0.6" rx="8" />
  <!-- 右侧边玻璃厚度 -->
  <path class="binding-border__side-edge--right" d="M35 0 L35 35 L31 31 L31 0" fill="url(#glassGrad)" />
  <!-- 下侧边玻璃厚度 -->
  <path class="binding-border__side-edge--bottom" d="M0 35 L35 35 L31 31 L0 31" fill="url(#glassGrad)" />

  <!-- 顶层：光影叠加层 -->
  <!-- 玻璃高光 -->
  <path class="binding-border__crease-highlight" d="M35 1.5 L1.5 35" stroke="url(#glassHighlightGrad)" stroke-width="2" stroke-linecap="round" filter="url(#glow)" />
  <!-- 轻微暗线 -->
  <path class="binding-border__crease-shadow" d="M35 4 L4 35" stroke="rgba(0, 100, 0, 0.2)" stroke-width="1" stroke-linecap="round" />
  <!-- 外发光 -->
  <path d="M35 0 L35 35 L0 35" fill="none" stroke="rgba(0, 255, 0, 0.3)" stroke-width="1" filter="url(#glow)" opacity="0.5" />
</svg>
```
### 一、修正版：电子普通屏幕边角（低通透高存在感玻璃）
```
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 低通透玻璃基底（保证存在感，不会完全透明） -->
    <linearGradient id="screenGlassBase" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(180, 200, 220, 0.4)" />
      <stop offset="40%" stop-color="rgba(180, 200, 220, 0.25)" />
      <stop offset="100%" stop-color="rgba(180, 200, 220, 0.15)" />
    </linearGradient>
    <!-- 主高光（左上45°弧边反光） -->
    <linearGradient id="screenMainHighlight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.75)" />
      <stop offset="55%" stop-color="rgba(255,255,255,0.2)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </linearGradient>
    <!-- 次高光（玻璃内部折射光） -->
    <linearGradient id="screenSubHighlight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(220, 235, 255, 0.35)" />
      <stop offset="75%" stop-color="rgba(220, 235, 255, 0)" />
    </linearGradient>
    <!-- 玻璃细微颗粒质感 -->
    <pattern id="glassGrain" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="1.2" cy="2.3" r="0.2" fill="rgba(0,0,0,0.04)" />
      <circle cx="4.1" cy="1.2" r="0.15" fill="rgba(255,255,255,0.07)" />
      <circle cx="3.2" cy="5.1" r="0.25" fill="rgba(0,0,0,0.03)" />
    </pattern>
    <!-- 内投影（模拟玻璃压屏厚度） -->
    <filter id="screenInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feOffset dx="2" dy="2" result="offset" />
      <feGaussianBlur stdDeviation="1.5" in="offset" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadow" />
    </filter>
  </defs>

  <!-- 中层：包角主体层（和其他边角统一40x40尺寸） -->
  <path class="binding-border__cover-face" d="M40 0 L40 40 L0 40" fill="url(#screenGlassBase)" rx="6" />
  <path d="M40 0 L40 40 L0 40" fill="url(#glassGrain)" opacity="0.7" rx="6" />
  <!-- 右侧边包裹面（和普通纸张款统一3px厚度） -->
  <path class="binding-border__side-edge--right" d="M40 0 L40 40 L37 37 L37 0" fill="url(#screenGlassBase)" />
  <!-- 下侧边包裹面（和普通纸张款统一3px厚度） -->
  <path class="binding-border__side-edge--bottom" d="M0 40 L40 40 L37 37 L0 37" fill="url(#screenGlassBase)" />

  <!-- 顶层：光影叠加层 -->
  <path class="binding-border__crease-highlight" d="M40 1 L1 40" stroke="url(#screenMainHighlight)" stroke-width="2.2" stroke-linecap="round" />
  <path d="M40 3 L3 40" stroke="url(#screenSubHighlight)" stroke-width="1.5" stroke-linecap="round" />
  <path class="binding-border__crease-shadow" d="M40 4.5 L4.5 40" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" stroke-linecap="round" />
  <path class="binding-border__inner-shadow" d="M40 0 L40 40 L0 40" fill="none" filter="url(#screenInnerShadow)" opacity="0.6" />
</svg>


---

## 三、特殊装帧系列
### 1. 线装（绫绢纹理+立体缝线）
```svg
<svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 绫绢纹理 -->
    <pattern id="silkTexture" width="5" height="5" patternUnits="userSpaceOnUse">
      <path d="M0 0h5v0.5H0zM0 2.5h5v0.5H0zM0 0v5h0.5V0zM2.5 0v5h0.5V0z" fill="rgba(139, 90, 43, 0.1)" />
    </pattern>
    <linearGradient id="silkCoverGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--corner-color, #f5e6d3)" />
      <stop offset="100%" stop-color="var(--corner-color-dark, #e6d5c3)" />
    </linearGradient>
    <!-- 缝线高光 -->
    <linearGradient id="threadHighlightGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.5)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </linearGradient>
  </defs>

  <!-- 中层 -->
  <path class="binding-border__cover-face" d="M38 0 L38 38 L0 38" fill="url(#silkCoverGrad)" />
  <path d="M38 0 L38 38 L0 38" fill="url(#silkTexture)" opacity="0.9" />
  <path class="binding-border__side-edge--right" d="M38 0 L38 38 L33 33 L33 0" fill="url(#silkCoverGrad)" />
  <path class="binding-border__side-edge--bottom" d="M0 38 L38 38 L33 33 L0 33" fill="url(#silkCoverGrad)" />

  <!-- 顶层：立体缝线 -->
  <path d="M38 4 L4 38 M38 8 L8 38 M38 12 L12 38 M38 16 L16 38 M38 20 L20 38 M38 24 L24 38 M38 28 L28 38 M38 32 L32 38" 
        stroke="var(--thread-color, #8b5a2b)" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="2 2" />
  <!-- 缝线高光 -->
  <path class="binding-border__crease-highlight" d="M38 4 L4 38 M38 8 L8 38" stroke="url(#threadHighlightGrad)" stroke-width="0.8" stroke-linecap="round" />
  <!-- 折痕暗线 -->
  <path class="binding-border__crease-shadow" d="M38 5 L5 38" stroke="rgba(0,0,0,0.15)" stroke-width="1" stroke-linecap="round" />
</svg>
```

### 2. 经折装（多层折页叠压+立体压痕）
```svg
<svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="foldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--corner-color, #f0e6d2)" />
      <stop offset="100%" stop-color="var(--corner-color-dark, #d9cbb8)" />
    </linearGradient>
    <filter id="foldShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feOffset dx="1.5" dy="1.5" result="offset" />
      <feGaussianBlur stdDeviation="1" in="offset" result="blur" />
    </filter>
  </defs>

  <!-- 中层：多层折页叠压 -->
  <!-- 第一层（最底层） -->
  <path d="M42 0 L42 42 L0 42" fill="url(#foldGrad)" />
  <!-- 第二层 -->
  <path d="M42 5 L42 42 L5 42" fill="url(#foldGrad)" opacity="0.95" />
  <!-- 第三层 -->
  <path d="M42 10 L42 42 L10 42" fill="url(#foldGrad)" opacity="0.9" />
  <!-- 第四层（顶层） -->
  <path class="binding-border__cover-face" d="M42 15 L42 42 L15 42" fill="url(#foldGrad)" />

  <!-- 顶层：立体压痕 -->
  <path d="M42 5 L5 42" stroke="rgba(0,0,0,0.18)" stroke-width="1" stroke-linecap="round" />
  <path d="M42 10 L10 42" stroke="rgba(0,0,0,0.18)" stroke-width="1" stroke-linecap="round" />
  <path d="M42 15 L15 42" stroke="rgba(0,0,0,0.18)" stroke-width="1" stroke-linecap="round" />
  <!-- 折痕高光 -->
  <path class="binding-border__crease-highlight" d="M42 4 L4 42" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round" />
  <!-- 压痕阴影 -->
  <path d="M42 6 L6 42" stroke="rgba(0,0,0,0.12)" stroke-width="0.8" filter="url(#foldShadow)" />
</svg>
```

---
## 平装
### 最终修正版：平装撕边纸张SVG（斜边长度100%对齐+细腻小锯齿）


```svg
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 天然纸张纤维纹理 -->
    <pattern id="tornPaperFiber" width="5" height="5" patternUnits="userSpaceOnUse">
      <path d="M0 1h5v0.25H0zM0 3h5v0.25H0zM1 0v5h0.25V0zM3 0v5h0.25V0z" fill="rgba(0,0,0,0.05)" />
      <path d="M0.5 0.5 L4.5 4.5" stroke="rgba(0,0,0,0.02)" stroke-width="0.2" />
      <circle cx="2" cy="3" r="0.2" fill="rgba(0,0,0,0.03)" />
    </pattern>
    <!-- 纸张基底渐变（和普通纸张款完全一致） -->
    <linearGradient id="tornPaperGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--paper-color, #fefdf9)" />
      <stop offset="100%" stop-color="var(--paper-color-dark, #f7f5ee)" />
    </linearGradient>
    <!-- 撕边细微毛边阴影滤镜 -->
    <filter id="fiberShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feOffset dx="0.5" dy="0.5" result="offset" />
      <feGaussianBlur stdDeviation="0.3" in="offset" result="blur" />
    </filter>
    <!-- 内投影滤镜（和普通纸张款完全一致） -->
    <filter id="paperInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feOffset dx="1.3" dy="1.3" result="offset" />
      <feGaussianBlur stdDeviation="1" in="offset" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadow" />
    </filter>
  </defs>

  <!-- 中层：包角主体层（和普通纸张1:1尺寸完全对齐） -->
  <!-- 封面贴合面：斜边严格贴合标准对角线，仅做高密度小锯齿起伏 -->
  <path 
    class="binding-border__cover-face"
    d="
      M 40 0
      L 38.5 1.2  L 39 1.8  L 37.5 3.1  L 38 3.7  L 36.5 5  L 37 5.6
      L 35.5 6.9  L 36 7.5  L 34.5 8.8  L 35 9.4  L 33.5 10.7 L 34 11.3
      L 32.5 12.6 L 33 13.2 L 31.5 14.5 L 32 15.1 L 30.5 16.4 L 31 17
      L 29.5 18.3 L 30 18.9 L 28.5 20.2 L 29 20.8 L 27.5 22.1 L 28 22.7
      L 26.5 24   L 27 24.6 L 25.5 25.9 L 26 26.5 L 24.5 27.8 L 25 28.4
      L 23.5 29.7 L 24 30.3 L 22.5 31.6 L 23 32.2 L 21.5 33.5 L 22 34.1
      L 20.5 35.4 L 21 36   L 19.5 37.3 L 20 37.9 L 18.5 39.2 L 19 40
      L 0 40
      L 40 40
      Z
    "
    fill="url(#tornPaperGrad)"
  />
  <!-- 纸张纤维纹理叠加 -->
  <path 
    d="
      M 40 0
      L 38.5 1.2  L 39 1.8  L 37.5 3.1  L 38 3.7  L 36.5 5  L 37 5.6
      L 35.5 6.9  L 36 7.5  L 34.5 8.8  L 35 9.4  L 33.5 10.7 L 34 11.3
      L 32.5 12.6 L 33 13.2 L 31.5 14.5 L 32 15.1 L 30.5 16.4 L 31 17
      L 29.5 18.3 L 30 18.9 L 28.5 20.2 L 29 20.8 L 27.5 22.1 L 28 22.7
      L 26.5 24   L 27 24.6 L 25.5 25.9 L 26 26.5 L 24.5 27.8 L 25 28.4
      L 23.5 29.7 L 24 30.3 L 22.5 31.6 L 23 32.2 L 21.5 33.5 L 22 34.1
      L 20.5 35.4 L 21 36   L 19.5 37.3 L 20 37.9 L 18.5 39.2 L 19 40
      L 0 40
      L 40 40
      Z
    "
    fill="url(#tornPaperFiber)"
    opacity="0.85"
  />
  <!-- 右侧边包裹面（和普通纸张款统一3px厚度，完全笔直） -->
  <path 
    class="binding-border__side-edge--right"
    d="M 40 0 L 40 40 L 37 37 L 37 0 Z"
    fill="var(--paper-color-dark, #f7f5ee)"
  />
  <!-- 下侧边包裹面（和普通纸张款统一3px厚度，完全笔直） -->
  <path 
    class="binding-border__side-edge--bottom"
    d="M 0 40 L 40 40 L 37 37 L 0 37 Z"
    fill="var(--paper-color-dark, #f7f5ee)"
  />

  <!-- 顶层：光影叠加层（左上45°统一光源，路径完全贴合小锯齿） -->
  <!-- 折痕棱线高光（斜边左上侧受光） -->
  <path 
    class="binding-border__crease-highlight"
    d="
      M 40 0.8
      L 38.5 2  L 39 2.6  L 37.5 3.9  L 38 4.5  L 36.5 5.8  L 37 6.4
      L 35.5 7.7  L 36 8.3  L 34.5 9.6  L 35 10.2 L 33.5 11.5 L 34 12.1
      L 32.5 13.4 L 33 14   L 31.5 15.3 L 32 15.9 L 30.5 17.2 L 31 17.8
      L 29.5 19.1 L 30 19.7 L 28.5 21   L 29 21.6 L 27.5 22.9 L 28 23.5
      L 26.5 24.8 L 27 25.4 L 25.5 26.7 L 26 27.3 L 24.5 28.6 L 25 29.2
      L 23.5 30.5 L 24 31.1 L 22.5 32.4 L 23 33   L 21.5 34.3 L 22 34.9
      L 20.5 36.2 L 21 36.8 L 19.5 38.1 L 20 38.7 L 18.5 40   L 19 40
    "
    stroke="rgba(255,255,255,0.7)"
    stroke-width="0.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <!-- 折痕棱线暗线（斜边右下侧背光） -->
  <path 
    class="binding-border__crease-shadow"
    d="
      M 40 1.2
      L 38.5 2.4  L 39 3    L 37.5 4.3  L 38 4.9  L 36.5 6.2  L 37 6.8
      L 35.5 8.1  L 36 8.7  L 34.5 10   L 35 10.6 L 33.5 11.9 L 34 12.5
      L 32.5 13.8 L 33 14.4 L 31.5 15.7 L 32 16.3 L 30.5 17.6 L 31 18.2
      L 29.5 19.5 L 30 20.1 L 28.5 21.4 L 29 22   L 27.5 23.3 L 28 23.9
      L 26.5 25.2 L 27 25.8 L 25.5 27.1 L 26 27.7 L 24.5 29   L 25 29.6
      L 23.5 30.9 L 24 31.5 L 22.5 32.8 L 23 33.4 L 21.5 34.7 L 22 35.3
      L 20.5 36.6 L 21 37.2 L 19.5 38.5 L 20 39.1 L 18.5 40   L 19 40
    "
    stroke="rgba(0,0,0,0.1)"
    stroke-width="0.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#fiberShadow)"
  />
  <!-- 内投影（和普通纸张款完全一致） -->
  <path 
    class="binding-border__inner-shadow"
    d="M 40 0 L 40 40 L 0 40 Z"
    fill="none"
    filter="url(#paperInnerShadow)"
    opacity="0.4"
  />
</svg>
```

---

### 对照基准：平装普通纸张SVG（100%尺寸对齐）
确保两款SVG引入时设置相同的`width`/`height`，即可实现完全一致的大小、位置、厚度：
```svg
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 高密度天然纸张纤维纹理 -->
    <pattern id="realPaperFiber" width="4" height="4" patternUnits="userSpaceOnUse">
      <path d="M0 1h4v0.2H0zM0 3h4v0.2H0zM1 0v4h0.2V0zM3 0v4h0.2V0z" fill="rgba(0,0,0,0.04)" />
      <path d="M0.5 0.5 L3.5 3.5" stroke="rgba(0,0,0,0.02)" stroke-width="0.2" />
      <circle cx="2" cy="3" r="0.18" fill="rgba(0,0,0,0.03)" />
    </pattern>
    <!-- 暖调米白纸张基底 -->
    <linearGradient id="realPaperBase" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--paper-color, #fefdf9)" />
      <stop offset="100%" stop-color="var(--paper-color-dark, #f7f5ee)" />
    </linearGradient>
    <!-- 纸张漫反射高光 -->
    <radialGradient id="paperDiffuse" cx="25%" cy="25%" r="75%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.4)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>
    <!-- 内投影滤镜 -->
    <filter id="realPaperInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feOffset dx="1.3" dy="1.3" result="offset" />
      <feGaussianBlur stdDeviation="1" in="offset" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadow" />
    </filter>
  </defs>

  <!-- 中层：包角主体层 -->
  <path class="binding-border__cover-face" d="M40 0 L40 40 L0 40" fill="url(#realPaperBase)" />
  <path d="M40 0 L40 40 L0 40" fill="url(#realPaperFiber)" opacity="0.9" />
  <path d="M40 0 L40 40 L0 40" fill="url(#paperDiffuse)" opacity="0.5" />
  <path class="binding-border__side-edge--right" d="M40 0 L40 40 L37 37 L37 0" fill="var(--paper-color-dark, #f7f5ee)" />
  <path class="binding-border__side-edge--bottom" d="M0 40 L40 40 L37 37 L0 37" fill="var(--paper-color-dark, #f7f5ee)" />

  <!-- 顶层：光影叠加层 -->
  <path class="binding-border__crease-highlight" d="M40 1 L1 40" stroke="rgba(255,255,255,0.75)" stroke-width="1.4" stroke-linecap="round" />
  <path class="binding-border__crease-shadow" d="M40 3 L3 40" stroke="rgba(0,0,0,0.09)" stroke-width="1" stroke-linecap="round" />
  <path class="binding-border__inner-shadow" d="M40 0 L40 40 L0 40" fill="none" filter="url(#realPaperInnerShadow)" opacity="0.4" />
</svg>
```

---



## 使用说明
1.  **CSS变量控制**：所有SVG都支持通过`--corner-color`（主色）、`--corner-color-dark`（深色）、`--thread-color`（线装缝线色）等CSS变量动态调整，完美适配你的自定义设置面板。
2.  **层级控制**：在Vue/HTML中引入时，给SVG外层容器设置`position: absolute; right: 0; bottom: 0; z-index: 5;`即可保证层级正确。
3.  **尺寸调整**：通过CSS的`width`/`height`直接缩放SVG，矢量图不失真。

需要针对某个材质做更细致的调整（如纹理密度、高光强度），可以直接修改SVG中`pattern`的尺寸、`linearGradient`的stop颜色或`stroke-width`的值。


