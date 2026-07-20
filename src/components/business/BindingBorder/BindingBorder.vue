<template>
  <div v-if="borderEnabled" class="binding-border" :style="borderContainerStyle">
    <svg
      :width="computedSize"
      :height="computedSize"
      :viewBox="`0 0 ${computedSize} ${computedSize}`"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="binding-border__svg"
    >
      <defs>
        <!-- ========== 精装布面纹理 binding2=3 ========== -->
        <pattern v-if="textureType === 'cloth'" id="fabricTexture" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0h4v1H0zM0 2h4v1H0zM0 0v4h1V0zM2 0v4h1V0z" fill="rgba(0,0,0,0.08)" />
        </pattern>
        <linearGradient v-if="textureType === 'cloth'" id="fabricCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>
        <linearGradient v-if="textureType === 'cloth'" id="fabricSideGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" :stop-color="darkColor" />
          <stop offset="100%" :stop-color="darkerColor" />
        </linearGradient>

        <!-- ========== 精装真皮牛皮纹理 binding2=5 ========== -->
        <pattern v-if="textureType === 'real-leather'" id="leatherCowTexture" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="rgba(0,0,0,0.12)" />
          <circle cx="4" cy="3" r="0.6" fill="rgba(0,0,0,0.1)" />
          <circle cx="2" cy="5" r="0.7" fill="rgba(0,0,0,0.11)" />
        </pattern>
        <linearGradient v-if="textureType === 'real-leather'" id="cowCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>
        <linearGradient v-if="textureType === 'real-leather'" id="edgeHighlightGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,220,180,0.6)" />
          <stop offset="100%" stop-color="rgba(255,220,180,0)" />
        </linearGradient>

        <!-- ========== 精装PU皮纹理 binding2=4 ========== -->
        <pattern v-if="textureType === 'pu-leather'" id="puTexture" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="transparent" />
          <circle cx="1.5" cy="1.5" r="0.3" fill="rgba(0,0,0,0.06)" />
        </pattern>
        <linearGradient v-if="textureType === 'pu-leather'" id="puCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>

        <!-- ========== 精装羊皮纹理 binding2=6 ========== -->
        <pattern v-if="textureType === 'sheepskin'" id="sheepskinTexture" width="5" height="5" patternUnits="userSpaceOnUse">
          <ellipse cx="2.5" cy="2.5" rx="1.5" ry="1" fill="rgba(0,0,0,0.06)" />
        </pattern>
        <linearGradient v-if="textureType === 'sheepskin'" id="sheepskinCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>

        <!-- ========== 精装仿皮纹理 binding2=7 ========== -->
        <pattern v-if="textureType === 'faux-leather'" id="fauxLeatherTexture" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.4" fill="rgba(0,0,0,0.05)" />
        </pattern>
        <linearGradient v-if="textureType === 'faux-leather'" id="fauxCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>

        <!-- ========== 精装哑光纹理 binding2=0/1/2 ========== -->
        <linearGradient v-if="textureType === 'matte'" id="matteCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="lightColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>

        <!-- ========== 电子书Matrix变体 binding2=2 ========== -->
        <pattern v-if="textureType === 'matrix'" id="matrixStream" width="8" height="8" patternUnits="userSpaceOnUse">
          <text x="1" y="6" font-size="5" :fill="effectiveColor" opacity="0.8" font-family="monospace">{{ matrixDigits[0] }}</text>
          <text x="4" y="3" font-size="4" :fill="effectiveColor" opacity="0.5" font-family="monospace">{{ matrixDigits[1] }}</text>
        </pattern>
        <linearGradient v-if="textureType === 'matrix'" id="glassGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(0, 255, 0, 0.15)" />
          <stop offset="50%" stop-color="rgba(0, 255, 0, 0.08)" />
          <stop offset="100%" stop-color="rgba(0, 255, 0, 0.02)" />
        </linearGradient>
        <linearGradient v-if="textureType === 'matrix'" id="glassHighlightGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(150, 255, 150, 0.4)" />
          <stop offset="100%" stop-color="rgba(150, 255, 150, 0)" />
        </linearGradient>
        <filter v-if="textureType === 'matrix'" id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <!-- ========== 电子书发光效果滤镜 ========== -->
        <filter v-if="(textureType === 'screen' || textureType === 'matrix') && glowEnabled" id="outerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur :stdDeviation="glowSpread" result="blur" />
          <feFlood :flood-color="glowColor" result="glowColor" />
          <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- ========== 电子书普通屏幕 binding2=0/1/3 ========== -->
        <linearGradient v-if="textureType === 'screen'" id="screenGlassBase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(180, 200, 220, 0.4)" />
          <stop offset="40%" stop-color="rgba(180, 200, 220, 0.25)" />
          <stop offset="100%" stop-color="rgba(180, 200, 220, 0.15)" />
        </linearGradient>
        <linearGradient v-if="textureType === 'screen'" id="screenMainHighlight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.75)" />
          <stop offset="55%" stop-color="rgba(255,255,255,0.2)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient v-if="textureType === 'screen'" id="screenSubHighlight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(220, 235, 255, 0.35)" />
          <stop offset="75%" stop-color="rgba(220, 235, 255, 0)" />
        </linearGradient>
        <pattern v-if="textureType === 'screen'" id="glassGrain" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="2.3" r="0.2" fill="rgba(0,0,0,0.04)" />
          <circle cx="4.1" cy="1.2" r="0.15" fill="rgba(255,255,255,0.07)" />
          <circle cx="3.2" cy="5.1" r="0.25" fill="rgba(0,0,0,0.03)" />
        </pattern>

        <!-- ========== 线装纹理 binding2=1 ========== -->
        <pattern v-if="textureType === 'thread'" id="silkTexture" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 0h5v0.5H0zM0 2.5h5v0.5H0zM0 0v5h0.5V0zM2.5 0v5h0.5V0z" fill="rgba(139, 90, 43, 0.1)" />
        </pattern>
        <linearGradient v-if="textureType === 'thread'" id="silkCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>
        <linearGradient v-if="textureType === 'thread'" id="threadHighlightGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.5)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </linearGradient>

        <!-- ========== 经折装纹理 binding2=2 ========== -->
        <linearGradient v-if="textureType === 'accordion'" id="foldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>
        <filter v-if="textureType === 'accordion'" id="foldShadow">
          <feOffset dx="1.5" dy="1.5" result="offset" />
          <feGaussianBlur stdDeviation="1" in="offset" result="blur" />
        </filter>

        <!-- ========== 平装撕边纹理 ========== -->
        <pattern v-if="textureType === 'torn'" id="tornPaperFiber" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 1h5v0.25H0zM0 3h5v0.25H0zM1 0v5h0.25V0zM3 0v5h0.25V0z" fill="rgba(0,0,0,0.05)" />
          <path d="M0.5 0.5 L4.5 4.5" stroke="rgba(0,0,0,0.02)" stroke-width="0.2" />
          <circle cx="2" cy="3" r="0.2" fill="rgba(0,0,0,0.03)" />
        </pattern>
        <linearGradient v-if="textureType === 'torn'" id="tornPaperGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>
        <filter v-if="textureType === 'torn'" id="fiberShadow">
          <feOffset dx="0.5" dy="0.5" result="offset" />
          <feGaussianBlur stdDeviation="0.3" in="offset" result="blur" />
        </filter>

        <!-- ========== 精装油边渐变 ========== -->
        <linearGradient v-if="oilEdgeEnabled && isHardcover" id="oilEdgeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="oilEdgeColor" />
          <stop offset="50%" :stop-color="adjustColor(oilEdgeColor, 20)" />
          <stop offset="100%" :stop-color="oilEdgeColor" />
        </linearGradient>

        <!-- ========== 平装普通纸张纹理 ========== -->
        <pattern v-if="textureType === 'paper'" id="realPaperFiber" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 1h4v0.2H0zM0 3h4v0.2H0zM1 0v4h0.2V0zM3 0v4h0.2V0z" fill="rgba(0,0,0,0.04)" />
          <path d="M0.5 0.5 L3.5 3.5" stroke="rgba(0,0,0,0.02)" stroke-width="0.2" />
          <circle cx="2" cy="3" r="0.18" fill="rgba(0,0,0,0.03)" />
        </pattern>
        <linearGradient v-if="textureType === 'paper'" id="realPaperBase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="effectiveColor" />
          <stop offset="100%" :stop-color="darkColor" />
        </linearGradient>
        <radialGradient v-if="textureType === 'paper'" id="paperDiffuse" cx="25%" cy="25%" r="75%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.4)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>

        <!-- ========== 通用内阴影滤镜 ========== -->
        <filter id="innerShadow">
          <feOffset :dx="innerShadowOffset" :dy="innerShadowOffset" result="offset" />
          <feGaussianBlur :stdDeviation="innerShadowBlur" in="offset" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="-1" k3="1" result="shadow" />
        </filter>
      </defs>

      <!-- ========== 根据纹理类型渲染不同的SVG结构 ========== -->
      
      <!-- 精装布面 -->
      <g v-if="textureType === 'cloth'">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#fabricCoverGrad)" />
        <path :d="trianglePath" fill="url(#fabricTexture)" opacity="0.8" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#fabricSideGrad)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#fabricSideGrad)" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="rgba(255,255,255,0.25)" stroke-width="1.2" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.2)" stroke-width="1" stroke-linecap="round" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.6" />
        <!-- 油边效果 -->
        <path v-if="oilEdgeEnabled" :d="trianglePath" fill="none" :stroke="oilEdgeColor" stroke-width="3" stroke-linejoin="round" />
      </g>

      <!-- 精装真皮牛皮 -->
      <g v-else-if="textureType === 'real-leather'">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#cowCoverGrad)" />
        <path :d="trianglePath" fill="url(#leatherCowTexture)" opacity="0.9" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#cowCoverGrad)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#cowCoverGrad)" />
        <path :d="trianglePath" fill="none" :stroke="darkColor" stroke-width="2.5" stroke-linejoin="round" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="url(#edgeHighlightGrad)" stroke-width="1.8" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.25)" stroke-width="1.2" stroke-linecap="round" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.7" />
        <!-- 油边效果 -->
        <path v-if="oilEdgeEnabled" :d="trianglePath" fill="none" :stroke="oilEdgeColor" stroke-width="3.5" stroke-linejoin="round" />
      </g>

      <!-- 精装PU皮 -->
      <g v-else-if="textureType === 'pu-leather'">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#puCoverGrad)" />
        <path :d="trianglePath" fill="url(#puTexture)" opacity="0.9" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#puCoverGrad)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#puCoverGrad)" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="rgba(255,255,255,0.2)" stroke-width="1.2" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.18)" stroke-width="1" stroke-linecap="round" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.6" />
        <!-- 油边效果 -->
        <path v-if="oilEdgeEnabled" :d="trianglePath" fill="none" :stroke="oilEdgeColor" stroke-width="3" stroke-linejoin="round" />
      </g>

      <!-- 精装羊皮 -->
      <g v-else-if="textureType === 'sheepskin'">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#sheepskinCoverGrad)" />
        <path :d="trianglePath" fill="url(#sheepskinTexture)" opacity="0.85" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#sheepskinCoverGrad)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#sheepskinCoverGrad)" />
        <path :d="trianglePath" fill="none" :stroke="darkColor" stroke-width="2" stroke-linejoin="round" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="url(#edgeHighlightGrad)" stroke-width="1.5" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.2)" stroke-width="1" stroke-linecap="round" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.65" />
        <!-- 油边效果 -->
        <path v-if="oilEdgeEnabled" :d="trianglePath" fill="none" :stroke="oilEdgeColor" stroke-width="3" stroke-linejoin="round" />
      </g>

      <!-- 精装仿皮 -->
      <g v-else-if="textureType === 'faux-leather'">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#fauxCoverGrad)" />
        <path :d="trianglePath" fill="url(#fauxLeatherTexture)" opacity="0.85" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#fauxCoverGrad)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#fauxCoverGrad)" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="rgba(255,255,255,0.18)" stroke-width="1" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.15)" stroke-width="0.8" stroke-linecap="round" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.5" />
        <!-- 油边效果 -->
        <path v-if="oilEdgeEnabled" :d="trianglePath" fill="none" :stroke="oilEdgeColor" stroke-width="2.5" stroke-linejoin="round" />
      </g>

      <!-- 精装哑光 -->
      <g v-else-if="textureType === 'matte'">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#matteCoverGrad)" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#matteCoverGrad)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#matteCoverGrad)" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.18)" stroke-width="0.8" stroke-linecap="round" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.5" />
        <!-- 油边效果 -->
        <path v-if="oilEdgeEnabled" :d="trianglePath" fill="none" :stroke="oilEdgeColor" stroke-width="2.5" stroke-linejoin="round" />
      </g>

      <!-- 电子书Matrix -->
      <g v-else-if="textureType === 'matrix'" :filter="glowEnabled ? 'url(#outerGlow)' : undefined">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#glassGrad)" />
        <path :d="trianglePath" fill="url(#matrixStream)" opacity="0.6" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#glassGrad)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#glassGrad)" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="url(#glassHighlightGrad)" stroke-width="2" stroke-linecap="round" filter="url(#glow)" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0, 100, 0, 0.2)" stroke-width="1" stroke-linecap="round" />
        <path :d="trianglePath" fill="none" stroke="rgba(0, 255, 0, 0.3)" stroke-width="1" filter="url(#glow)" opacity="0.5" />
      </g>

      <!-- 电子书普通屏幕 -->
      <g v-else-if="textureType === 'screen'" :filter="glowEnabled ? 'url(#outerGlow)' : undefined">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#screenGlassBase)" />
        <path :d="trianglePath" fill="url(#glassGrain)" opacity="0.7" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#screenGlassBase)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#screenGlassBase)" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="url(#screenMainHighlight)" stroke-width="2.2" stroke-linecap="round" />
        <path :d="creaseSubHighlightPath" stroke="url(#screenSubHighlight)" stroke-width="1.5" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" stroke-linecap="round" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.6" />
      </g>

      <!-- 线装 -->
      <g v-else-if="textureType === 'thread'">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#silkCoverGrad)" />
        <path :d="trianglePath" fill="url(#silkTexture)" opacity="0.9" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" fill="url(#silkCoverGrad)" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" fill="url(#silkCoverGrad)" />
        <!-- 缝线 -->
        <g :stroke="threadColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="2 2">
          <line v-for="i in 8" :key="i" :x1="computedSize" :y1="i * 4" :x2="i * 4" :y2="computedSize" />
        </g>
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="url(#threadHighlightGrad)" stroke-width="0.8" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.15)" stroke-width="1" stroke-linecap="round" />
      </g>

      <!-- 经折装 -->
      <g v-else-if="textureType === 'accordion'">
        <path :d="trianglePath" fill="url(#foldGrad)" />
        <path :d="getAccordionPath(5)" fill="url(#foldGrad)" opacity="0.95" />
        <path :d="getAccordionPath(10)" fill="url(#foldGrad)" opacity="0.9" />
        <path class="binding-border__cover-face" :d="getAccordionPath(15)" fill="url(#foldGrad)" />
        <path :d="getAccordionLine(5)" stroke="rgba(0,0,0,0.18)" stroke-width="1" stroke-linecap="round" />
        <path :d="getAccordionLine(10)" stroke="rgba(0,0,0,0.18)" stroke-width="1" stroke-linecap="round" />
        <path :d="getAccordionLine(15)" stroke="rgba(0,0,0,0.18)" stroke-width="1" stroke-linecap="round" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round" />
        <path :d="creaseSubShadowPath" stroke="rgba(0,0,0,0.12)" stroke-width="0.8" filter="url(#foldShadow)" />
      </g>

      <!-- 平装撕边 -->
      <g v-else-if="textureType === 'torn'">
        <path class="binding-border__cover-face" :d="tornEdgePath" :fill="`url(#tornPaperGrad)`" />
        <path :d="tornEdgePath" fill="url(#tornPaperFiber)" opacity="0.85" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" :fill="darkColor" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" :fill="darkColor" />
        <path class="binding-border__crease-highlight" :d="tornHighlightPath" stroke="rgba(255,255,255,0.7)" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" />
        <path class="binding-border__crease-shadow" :d="tornShadowPath" stroke="rgba(0,0,0,0.1)" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#fiberShadow)" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.4" />
      </g>

      <!-- 平装普通纸张 -->
      <g v-else-if="textureType === 'paper'">
        <path class="binding-border__cover-face" :d="trianglePath" fill="url(#realPaperBase)" />
        <path :d="trianglePath" fill="url(#realPaperFiber)" opacity="0.9" />
        <path :d="trianglePath" fill="url(#paperDiffuse)" opacity="0.5" />
        <path class="binding-border__side-edge--right" :d="rightEdgePath" :fill="darkColor" />
        <path class="binding-border__side-edge--bottom" :d="bottomEdgePath" :fill="darkColor" />
        <path class="binding-border__crease-highlight" :d="creaseHighlightPath" stroke="rgba(255,255,255,0.75)" stroke-width="1.4" stroke-linecap="round" />
        <path class="binding-border__crease-shadow" :d="creaseShadowPath" stroke="rgba(0,0,0,0.09)" stroke-width="1" stroke-linecap="round" />
        <path class="binding-border__inner-shadow" :d="trianglePath" fill="none" filter="url(#innerShadow)" opacity="0.4" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import {
  Binding1Type,
  Binding2Type,
  BindingBorderParams,
  getBindingType,
  getHardcoverTexture,
  getSpecialPattern,
  getPaperbackVariant,
  getEbookVariant,
  shouldShowOilEdge
} from '@/stores/bindingBorder/types';

const props = defineProps<{
  binding1: Binding1Type;
  binding2?: Binding2Type;
  params: BindingBorderParams;
  coverColor?: string;
}>();

// Matrix随机数字
const matrixDigits = ref(['1', '0']);
onMounted(() => {
  matrixDigits.value = [
    String(Math.floor(Math.random() * 10)),
    String(Math.floor(Math.random() * 10))
  ];
});

const bindingType = computed(() => getBindingType(props.binding1));
const isEbook = computed(() => props.binding1 === 0);
const isPaperback = computed(() => props.binding1 === 1);
const isHardcover = computed(() => props.binding1 === 2);
const isSpecial = computed(() => props.binding1 === 3);

// 是否启用包边
const borderEnabled = computed(() => {
  return props.params.enabled !== false; // 默认为 true（兼容旧数据）
});

// ==================== 纹理类型计算 ====================

// 优先使用 params.texture（设置页面的值），否则根据 binding2 计算
const textureType = computed(() => {
  // 如果 params 有 texture 字段，优先使用它
  if (props.params && 'texture' in props.params && props.params.texture) {
    return props.params.texture as string;
  }
  // 否则根据 binding2 计算
  if (isEbook.value) {
    const variant = getEbookVariant(props.binding2 ?? 0);
    return variant === 'matrix' ? 'matrix' : 'screen';
  }
  if (isPaperback.value) {
    const variant = getPaperbackVariant(props.binding2 ?? 0);
    return variant === 'torn' ? 'torn' : 'paper';
  }
  if (isHardcover.value) {
    return getHardcoverTexture(props.binding2 ?? 0);
  }
  if (isSpecial.value) {
    return getSpecialPattern(props.binding2 ?? 0);
  }
  return 'paper';
});

// ==================== 尺寸计算 ====================

const computedSize = computed(() => props.params.size || 40);
const sideWidth = computed(() => {
  if (isHardcover.value && [4, 5, 6, 7].includes(props.binding2 ?? 0)) return 3;
  if (isHardcover.value) return 2.5;
  if (isSpecial.value) return 2.5;
  return 3;
});

// ==================== 默认颜色定义 ====================

const defaultColors = {
  ebook: '#4a9eff',
  paperback: '#fefdf9',
  hardcover: '#7a6b5a',
  special: '#f5e6d3'
};

// ==================== 颜色计算 ====================

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// 根据装帧类型获取默认颜色
const typeDefaultColor = computed(() => {
  if (isEbook.value) return defaultColors.ebook;
  if (isPaperback.value) return defaultColors.paperback;
  if (isHardcover.value) return defaultColors.hardcover;
  if (isSpecial.value) return defaultColors.special;
  return defaultColors.paperback;
});

// 是否启用自定义颜色
const useCustomColor = computed(() => {
  return props.params.customColorEnabled === true;
});

// 实际使用的颜色（考虑 customColorEnabled）
const effectiveColor = computed(() => {
  if (useCustomColor.value) {
    return props.params.color || typeDefaultColor.value;
  }
  return typeDefaultColor.value;
});

const lightColor = computed(() => adjustColor(effectiveColor.value, 15));
const darkColor = computed(() => adjustColor(effectiveColor.value, -15));
const darkerColor = computed(() => adjustColor(effectiveColor.value, -25));
const threadColor = computed(() => adjustColor(effectiveColor.value, -30));

// ==================== 电子书发光效果 ====================

const glowEnabled = computed(() => {
  return 'glowEnabled' in props.params ? props.params.glowEnabled : false;
});

const glowColor = computed(() => {
  return 'glowColor' in props.params ? props.params.glowColor : 'rgba(74, 158, 255, 0.4)';
});

const glowSpread = computed(() => {
  return 'glowSpread' in props.params ? props.params.glowSpread : 3;
});

// ==================== 平装撕裂强度 ====================

const tornIntensity = computed(() => {
  return 'tornIntensity' in props.params ? props.params.tornIntensity : 45;
});

// ==================== 精装油边效果 ====================

const oilEdgeEnabled = computed(() => {
  return 'oilEdgeEnabled' in props.params ? props.params.oilEdgeEnabled : false;
});

const oilEdgeColor = computed(() => {
  return 'oilEdgeColor' in props.params ? props.params.oilEdgeColor : '#3d3d3d';
});

// ==================== 内阴影参数 ====================

const innerShadowOffset = computed(() => {
  if (textureType.value === 'real-leather') return 2.5;
  return 2;
});

const innerShadowBlur = computed(() => {
  if (textureType.value === 'real-leather') return 2;
  return 1.5;
});

// ==================== SVG路径计算 ====================

const s = computed(() => computedSize.value);
const sw = computed(() => sideWidth.value);

// 主三角形路径
const trianglePath = computed(() => 
  `M${s.value} 0 L${s.value} ${s.value} L0 ${s.value}`
);

// 右侧边路径
const rightEdgePath = computed(() => 
  `M${s.value} 0 L${s.value} ${s.value} L${s.value - sw.value} ${s.value - sw.value} L${s.value - sw.value} 0`
);

// 下侧边路径
const bottomEdgePath = computed(() => 
  `M0 ${s.value} L${s.value} ${s.value} L${s.value - sw.value} ${s.value - sw.value} L0 ${s.value - sw.value}`
);

// 折痕高光路径
const creaseHighlightPath = computed(() => 
  `M${s.value} 1 L1 ${s.value}`
);

// 折痕暗线路径
const creaseShadowPath = computed(() => 
  `M${s.value} 3 L3 ${s.value}`
);

// 次高光路径（电子书屏幕）
const creaseSubHighlightPath = computed(() => 
  `M${s.value} 3 L3 ${s.value}`
);

// 次暗线路径（经折装）
const creaseSubShadowPath = computed(() => 
  `M${s.value} 6 L6 ${s.value}`
);

// 经折装路径
function getAccordionPath(offset: number) {
  return `M${s.value} ${offset} L${s.value} ${s.value} L${offset} ${s.value}`;
}

function getAccordionLine(offset: number) {
  return `M${s.value} ${offset} L${offset} ${s.value}`;
}

// 撕边路径 - 使用 tornIntensity 控制撕裂强度
const tornEdgePath = computed(() => {
  const size = s.value;
  const intensity = tornIntensity.value / 100; // 转换为 0-1 范围
  const points: number[][] = [];
  let x = size;
  let y = 0;
  
  // 根据强度调整步长和偏移
  const baseStep = 1.5;
  const stepVariation = 0.5 * intensity;
  const offsetRange = 0.8 * intensity;
  
  while (x > 0 && y < size) {
    points.push([x, y]);
    const step = baseStep + Math.random() * stepVariation;
    x -= step;
    y += step;
  }
  
  let path = `M ${size} 0`;
  for (const [px, py] of points) {
    const dx = px + (Math.random() - 0.5) * offsetRange;
    const dy = py + (Math.random() - 0.5) * offsetRange;
    path += ` L ${dx.toFixed(1)} ${dy.toFixed(1)}`;
  }
  path += ` L 0 ${size} L ${size} ${size} Z`;
  
  return path;
});

const tornHighlightPath = computed(() => {
  const size = s.value;
  return `M ${size} 0.8 L ${size * 0.95} 2 L ${size * 0.9} 4 L ${size * 0.85} 6 L ${size * 0.8} 8 L ${size * 0.75} 10 L ${size * 0.7} 12 L ${size * 0.65} 14 L ${size * 0.6} 16 L ${size * 0.55} 18 L ${size * 0.5} 20 L ${size * 0.45} 22 L ${size * 0.4} 24 L ${size * 0.35} 26 L ${size * 0.3} 28 L ${size * 0.25} 30 L ${size * 0.2} 32 L ${size * 0.15} 34 L ${size * 0.1} 36 L ${size * 0.05} 38 L 0 ${size}`;
});

const tornShadowPath = computed(() => {
  const size = s.value;
  return `M ${size} 1.2 L ${size * 0.95} 2.4 L ${size * 0.9} 4.4 L ${size * 0.85} 6.4 L ${size * 0.8} 8.4 L ${size * 0.75} 10.4 L ${size * 0.7} 12.4 L ${size * 0.65} 14.4 L ${size * 0.6} 16.4 L ${size * 0.55} 18.4 L ${size * 0.5} 20.4 L ${size * 0.45} 22.4 L ${size * 0.4} 24.4 L ${size * 0.35} 26.4 L ${size * 0.3} 28.4 L ${size * 0.25} 30.4 L ${size * 0.2} 32.4 L ${size * 0.15} 34.4 L ${size * 0.1} 36.4 L ${size * 0.05} 38.4 L 0 ${size}`;
});

// ==================== 样式计算 ====================

const borderContainerStyle = computed(() => ({
  position: 'absolute' as const,
  right: '0',
  bottom: '0',
  width: `${computedSize.value}px`,
  height: `${computedSize.value}px`,
  pointerEvents: 'none' as const,
  zIndex: 10,
  opacity: (props.params.opacity ?? 100) / 100
}));
</script>

<style scoped>
.binding-border {
  position: absolute;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}

.binding-border__svg {
  display: block;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .binding-border {
    filter: brightness(0.9);
  }
}

:root[data-theme="dark"] .binding-border,
.dark .binding-border {
  filter: brightness(0.9);
}
</style>
