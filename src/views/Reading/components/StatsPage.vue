<template>
  <div class="stats-page" :style="{ '--card-opacity': cardOpacity / 100 }">
    <!-- 阅读概览（5 张数据卡片 + 1 张"全部图表"快捷卡片） -->
    <div class="stats-overview">
      <div
        class="stat-card stat-card--clickable"
        :class="{ 'is-active': activeChart === 'book' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'book'"
        @click="activeChart = activeChart === 'book' ? null : 'book'"
        @keydown.enter.prevent="activeChart = activeChart === 'book' ? null : 'book'"
        @keydown.space.prevent="activeChart = activeChart === 'book' ? null : 'book'"
      >
        <div class="stat-icon">📚</div>
        <div class="stat-value">{{ readingStats.totalBooks }}</div>
        <div class="stat-label">藏书总量</div>
        <div v-if="readingStats.bindingStats.length > 0" class="stat-extra">
          <span
            v-for="b in readingStats.bindingStats"
            :key="b.label"
            class="stat-extra-chip"
            :title="`${b.label} ${b.count} 本`"
          >
            {{ b.label }} <em>{{ b.count }}</em>
          </span>
        </div>
      </div>
      <div
        class="stat-card stat-card--clickable"
        :class="{ 'is-active': activeChart === 'read' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'read'"
        @click="activeChart = activeChart === 'read' ? null : 'read'"
        @keydown.enter.prevent="activeChart = activeChart === 'read' ? null : 'read'"
        @keydown.space.prevent="activeChart = activeChart === 'read' ? null : 'read'"
      >
        <div class="stat-icon">✅</div>
        <div class="stat-value">{{ readingStats.readBooks }}</div>
        <div class="stat-label">已读完</div>
        <div class="stat-extra stat-extra--status">
          <span
            v-for="s in readingStats.readStatusBreakdown"
            :key="s.label"
            class="stat-extra-chip"
            :style="{ color: s.color }"
            :title="`${s.label} ${s.count} 本`"
          >
            <span class="status-dot" :style="{ background: s.color }"></span>
            {{ s.label }} <em :style="{ color: s.color }">{{ s.count }}</em>
          </span>
        </div>
      </div>
      <div
        class="stat-card stat-card--clickable"
        :class="{ 'is-active': activeChart === 'bookmark' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'bookmark'"
        @click="activeChart = activeChart === 'bookmark' ? null : 'bookmark'"
        @keydown.enter.prevent="activeChart = activeChart === 'bookmark' ? null : 'bookmark'"
        @keydown.space.prevent="activeChart = activeChart === 'bookmark' ? null : 'bookmark'"
      >
        <div class="stat-icon">📝</div>
        <div class="stat-value">{{ readingStats.totalBookmarks }}</div>
        <div class="stat-label">书摘数量</div>
      </div>
      <!-- 合并卡：标准总价 / 购书花费 -->
      <div
        class="stat-card stat-card--clickable stat-card--dual"
        :class="{ 'is-active': activeChart === 'price' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'price'"
        @click="activeChart = activeChart === 'price' ? null : 'price'"
        @keydown.enter.prevent="activeChart = activeChart === 'price' ? null : 'price'"
        @keydown.space.prevent="activeChart = activeChart === 'price' ? null : 'price'"
      >
        <div class="stat-icon">🏷️</div>
        <div class="stat-value stat-value--dual">
          <span class="dual-part">
            <span class="dual-currency">¥</span>{{ readingStats.totalStandardPrice }}
          </span>
          <span class="dual-divider">/</span>
          <span class="dual-part dual-part--alt">
            <span class="dual-currency">¥</span>{{ readingStats.totalSpent }}
          </span>
        </div>
        <div class="stat-label">标准总价/购书花费</div>
        <div class="stat-extra stat-extra--price">
          <span class="stat-extra-chip">
            标准 <em>¥{{ readingStats.totalStandardPrice }}</em>
          </span>
          <span class="stat-extra-chip stat-extra-chip--paid">
            实付 <em>¥{{ readingStats.totalSpent }}</em>
          </span>
          <span v-if="readingStats.totalStandardPrice > 0" class="stat-extra-chip stat-extra-chip--saved">
            省 <em>{{ Math.round((1 - readingStats.totalSpent / readingStats.totalStandardPrice) * 100) }}%</em>
          </span>
        </div>
      </div>
      <!-- "全部"卡片：合订视图入口 -->
      <div
        class="stat-card stat-card--clickable stat-card--toggle"
        :class="{ 'is-active': activeChart === 'all' }"
        role="button" tabindex="0"
        :aria-pressed="activeChart === 'all'"
        @click="activeChart = activeChart === 'all' ? null : 'all'"
        @keydown.enter.prevent="activeChart = activeChart === 'all' ? null : 'all'"
        @keydown.space.prevent="activeChart = activeChart === 'all' ? null : 'all'"
      >
        <div class="stat-icon">{{ activeChart === 'all' ? '📉' : '📊' }}</div>
        <div class="stat-value">{{ activeChart === 'all' ? '收起' : '全部' }}</div>
        <div class="stat-label">图表视图</div>
        <div class="stat-extra stat-extra--hint">
          {{ activeChart === 'all' ? '点击收起' : '点击查看全部图表' }}
        </div>
      </div>
    </div>

    <!-- 图表区域：受 activeChart 控制（null=不显示，'all'=全部，'book'/'read'/'bookmark'/'price'=对应类别） -->
    <div v-if="activeChart" class="all-charts-wrapper">

    <!-- 📚 藏书 - 装帧分布（玫瑰图） -->
    <div v-if="activeChart === 'book' || activeChart === 'all'" class="card card--binding">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--book">📚 藏书</span>
            <span class="card-title-sep">·</span>
            <span>装帧分布</span>
          </span>
          <span class="card-subtitle">按 binding1 字段聚合：电子书 / 平装 / 精装 / 特殊装帧</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'binding' }"
            @click.stop="toggleSettingsMenu('binding')"
            :aria-expanded="openSettingsMenu === 'binding'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'binding'"
            @update:modelValue="onSettingsCardToggle('binding', $event)"
            title="装帧分布 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="bindingChartRef"></div>
    </div>

    <!-- 📚 藏书 - 图表类型分布（饼图：电子书/纸质书/其他） -->
    <div v-if="activeChart === 'book' || activeChart === 'all'" class="card card--binding">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--book">📚 藏书</span>
            <span class="card-title-sep">·</span>
            <span>图表类型分布</span>
          </span>
          <span class="card-subtitle">电子书 / 纸质书 / 其他 占比</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'bookType' }"
            @click.stop="toggleSettingsMenu('bookType')"
            :aria-expanded="openSettingsMenu === 'bookType'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'bookType'"
            @update:modelValue="onSettingsCardToggle('bookType', $event)"
            title="图表类型分布 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input type="date" v-model="customStartDate" :max="customEndDate || todayStr" class="settings-date-input" />
                <span class="settings-range-sep">至</span>
                <input type="date" v-model="customEndDate" :min="customStartDate" :max="todayStr" class="settings-date-input" />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="bookTypeChartRef"></div>
    </div>

    <!-- 📚 藏书 - 纸张类型分布（柱状图） -->
    <div v-if="activeChart === 'book' || activeChart === 'all'" class="card card--binding">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--book">📚 藏书</span>
            <span class="card-title-sep">·</span>
            <span>纸张类型分布</span>
          </span>
          <span class="card-subtitle">不同纸张的书籍数量（点击柱体筛选）</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'paper' }"
            @click.stop="toggleSettingsMenu('paper')"
            :aria-expanded="openSettingsMenu === 'paper'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'paper'"
            @update:modelValue="onSettingsCardToggle('paper', $event)"
            title="纸张类型分布 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input type="date" v-model="customStartDate" :max="customEndDate || todayStr" class="settings-date-input" />
                <span class="settings-range-sep">至</span>
                <input type="date" v-model="customEndDate" :min="customStartDate" :max="todayStr" class="settings-date-input" />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="paperChartRef"></div>
    </div>

    <!-- 📚 藏书 - 刷边处理情况分布（环形图） -->
    <div v-if="activeChart === 'book' || activeChart === 'all'" class="card card--binding">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--book">📚 藏书</span>
            <span class="card-title-sep">·</span>
            <span>刷边处理情况</span>
          </span>
          <span class="card-subtitle">是否刷边 / 刷边类型占比（点击扇区筛选）</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'edge' }"
            @click.stop="toggleSettingsMenu('edge')"
            :aria-expanded="openSettingsMenu === 'edge'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'edge'"
            @update:modelValue="onSettingsCardToggle('edge', $event)"
            title="刷边处理情况 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input type="date" v-model="customStartDate" :max="customEndDate || todayStr" class="settings-date-input" />
                <span class="settings-range-sep">至</span>
                <input type="date" v-model="customEndDate" :min="customStartDate" :max="todayStr" class="settings-date-input" />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="edgeChartRef"></div>
    </div>

    <!-- 📚 藏书 - 书籍来源渠道分布（柱状图） -->
    <div v-if="activeChart === 'book' || activeChart === 'all'" class="card card--binding">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--book">📚 藏书</span>
            <span class="card-title-sep">·</span>
            <span>书籍来源渠道</span>
          </span>
          <span class="card-subtitle">不同来源渠道的书籍数量（点击柱体筛选）</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'source' }"
            @click.stop="toggleSettingsMenu('source')"
            :aria-expanded="openSettingsMenu === 'source'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'source'"
            @update:modelValue="onSettingsCardToggle('source', $event)"
            title="书籍来源渠道 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input type="date" v-model="customStartDate" :max="customEndDate || todayStr" class="settings-date-input" />
                <span class="settings-range-sep">至</span>
                <input type="date" v-model="customEndDate" :min="customStartDate" :max="todayStr" class="settings-date-input" />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="sourceChartRef"></div>
    </div>

    <!-- 📚 藏书 - 词云图（基于标签添加频次） -->
    <div v-if="activeChart === 'book' || activeChart === 'all'" class="card card--binding">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--book">📚 藏书</span>
            <span class="card-title-sep">·</span>
            <span>词云图</span>
          </span>
          <span class="card-subtitle">按添加频次显示前 {{ WORDCLOUD_TOP_N }} 标签</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'wordCloud' }"
            @click.stop="toggleSettingsMenu('wordCloud')"
            :aria-expanded="openSettingsMenu === 'wordCloud'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'wordCloud'"
            @update:modelValue="onSettingsCardToggle('wordCloud', $event)"
            title="词云图 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">显示标签数</div>
              <div class="settings-options">
                <button
                  v-for="opt in WORDCLOUD_COUNT_OPTIONS"
                  :key="opt"
                  :class="['settings-opt', { active: wordCloudTopN === opt }]"
                  @click="wordCloudTopN = opt"
                >Top {{ opt }}</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">字号范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in WORDCLOUD_FONT_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: wordCloudFontSize === opt.value }]"
                  @click="wordCloudFontSize = opt.value"
                >{{ opt.label }}</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input type="date" v-model="customStartDate" :max="customEndDate || todayStr" class="settings-date-input" />
                <span class="settings-range-sep">至</span>
                <input type="date" v-model="customEndDate" :min="customStartDate" :max="todayStr" class="settings-date-input" />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="wordcloud-container" ref="wordCloudRef">
        <div
          v-if="bookStore.allBooks.length === 0"
          class="wordcloud-empty"
        >
          <div class="wordcloud-empty-title">书籍数据加载中…</div>
          <div class="wordcloud-empty-hint">首次进入统计页会从后端拉取数据</div>
        </div>
        <div
          v-else-if="wordCloudItems.length === 0"
          class="wordcloud-empty"
        >
          <div class="wordcloud-empty-title">该时间段内暂无标签数据</div>
          <div class="wordcloud-empty-hint">提示：请在书籍编辑页为藏书添加标签，或放宽时间范围（当前共 {{ bookStore.allBooks.length }} 本书，过滤后 {{ filterBooksByTimeRange(bookStore.allBooks).length }} 本有记录）</div>
        </div>
        <div
          v-else-if="wordCloudLayout.length === 0"
          class="wordcloud-empty"
        >
          <div class="wordcloud-empty-title">布局计算中…</div>
        </div>
        <div
          v-for="item in wordCloudLayout"
          :key="item.name"
          class="wordcloud-item"
          :style="{
            transform: `translate(${item.cx}px, ${item.cy}px) translate(-50%, -50%) rotate(${item.rotation}deg)`,
            fontSize: item.fontSize + 'px',
            fontWeight: item.fontWeight,
            color: item.color,
            zIndex: Math.round(item.ratio * 1000),
          }"
          :title="`${item.name} · ${item.value} 次`"
        >{{ item.name }}</div>
      </div>
    </div>

    <!-- ✅ 已读完 - 阅读状态分布（饼图） -->
    <div v-if="activeChart === 'read' || activeChart === 'all'" class="card card--status">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--read">✅ 已读完</span>
            <span class="card-title-sep">·</span>
            <span>阅读状态分布</span>
          </span>
          <span class="card-subtitle">已读 / 在读 / 未读 占比</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'status' }"
            @click.stop="toggleSettingsMenu('status')"
            :aria-expanded="openSettingsMenu === 'status'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'status'"
            @update:modelValue="onSettingsCardToggle('status', $event)"
            title="阅读状态分布 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="statusChartRef"></div>
    </div>

    <!-- ✅ 已读完 - 月度阅读趋势（折线图） -->
    <div v-if="activeChart === 'read' || activeChart === 'all'" class="card card--status">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--read">✅ 已读完</span>
            <span class="card-title-sep">·</span>
            <span>月度阅读趋势</span>
          </span>
          <span class="card-subtitle">按月统计读完的书籍数量</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'trend' }"
            @click.stop="toggleSettingsMenu('trend')"
            :aria-expanded="openSettingsMenu === 'trend'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'trend'"
            @update:modelValue="onSettingsCardToggle('trend', $event)"
            title="月度阅读趋势 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="trendChartRef"></div>
    </div>

    <!-- ✅ 已读完 - 阅读时间最多 Top N（横向柱状图 + 封面） -->
    <div v-if="activeChart === 'read' || activeChart === 'all'" class="card card--status">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--read">✅ 已读完</span>
            <span class="card-title-sep">·</span>
            <span>阅读时间最多前 {{ topReadTimeN }} 名</span>
          </span>
          <span class="card-subtitle">基于总阅读时长排序，左侧封面右侧数据（点击封面跳转详情）</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'topReadTime' }"
            @click.stop="toggleSettingsMenu('topReadTime')"
            :aria-expanded="openSettingsMenu === 'topReadTime'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'topReadTime'"
            @update:modelValue="onSettingsCardToggle('topReadTime', $event)"
            title="阅读时间最多 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">显示数量</div>
              <div class="settings-options">
                <button
                  v-for="opt in TOP_N_OPTIONS"
                  :key="opt"
                  :class="['settings-opt', { active: topReadTimeN === opt }]"
                  @click="topReadTimeN = opt"
                >Top {{ opt }}</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input type="date" v-model="customStartDate" :max="customEndDate || todayStr" class="settings-date-input" />
                <span class="settings-range-sep">至</span>
                <input type="date" v-model="customEndDate" :min="customStartDate" :max="todayStr" class="settings-date-input" />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container chart-container--tall" ref="topReadTimeChartRef"></div>
    </div>

    <!-- 📝 书摘 - 月度书摘趋势（柱状图） -->
    <div v-if="activeChart === 'bookmark' || activeChart === 'all'" class="card card--bookmark">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--bookmark">📝 书摘</span>
            <span class="card-title-sep">·</span>
            <span>月度书摘趋势</span>
          </span>
          <span class="card-subtitle">按月统计新增书摘数量</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'bookmarkTrend' }"
            @click.stop="toggleSettingsMenu('bookmarkTrend')"
            :aria-expanded="openSettingsMenu === 'bookmarkTrend'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'bookmarkTrend'"
            @update:modelValue="onSettingsCardToggle('bookmarkTrend', $event)"
            title="月度书摘趋势 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="bookmarkTrendChartRef"></div>
    </div>

    <!-- 📝 书摘 - 书摘最多 Top N（横向柱状图 + 封面） -->
    <div v-if="activeChart === 'bookmark' || activeChart === 'all'" class="card card--bookmark">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--bookmark">📝 书摘</span>
            <span class="card-title-sep">·</span>
            <span>书摘最多前 {{ topBookmarksN }} 名</span>
          </span>
          <span class="card-subtitle">按书摘数量排序，左侧封面右侧数据（点击封面跳转详情）</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'topBookmarks' }"
            @click.stop="toggleSettingsMenu('topBookmarks')"
            :aria-expanded="openSettingsMenu === 'topBookmarks'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'topBookmarks'"
            @update:modelValue="onSettingsCardToggle('topBookmarks', $event)"
            title="书摘最多 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">显示数量</div>
              <div class="settings-options">
                <button
                  v-for="opt in TOP_N_OPTIONS"
                  :key="opt"
                  :class="['settings-opt', { active: topBookmarksN === opt }]"
                  @click="topBookmarksN = opt"
                >Top {{ opt }}</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input type="date" v-model="customStartDate" :max="customEndDate || todayStr" class="settings-date-input" />
                <span class="settings-range-sep">至</span>
                <input type="date" v-model="customEndDate" :min="customStartDate" :max="todayStr" class="settings-date-input" />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container chart-container--tall" ref="topBookmarksChartRef"></div>
    </div>

    <!-- 🏷️ 价格 - 购书花费分类（嵌套饼图） -->
    <div v-if="activeChart === 'price' || activeChart === 'all'" class="card card--price">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--price">🏷️ 价格</span>
            <span class="card-title-sep">·</span>
            <span>购书花费分类</span>
          </span>
          <span class="card-subtitle">点击下钻查看具体书籍</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'priceCategory' }"
            @click.stop="toggleSettingsMenu('priceCategory')"
            :aria-expanded="openSettingsMenu === 'priceCategory'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'priceCategory'"
            @update:modelValue="onSettingsCardToggle('priceCategory', $event)"
            title="购书花费分类 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">分类模式</div>
              <div class="settings-options">
                <button
                  :class="['settings-opt', { active: priceCategoryMode === 'group' }]"
                  @click="priceCategoryMode = 'group'"
                >分组</button>
                <button
                  :class="['settings-opt', { active: priceCategoryMode === 'tag' }]"
                  @click="priceCategoryMode = 'tag'"
                >标签</button>
              </div>
            </div>
            <!-- 标签模式专属：标签数量 + 特定标签模式 -->
            <template v-if="priceCategoryMode === 'tag'">
              <div class="settings-section">
                <div class="settings-section-title">标签数量</div>
                <div class="settings-options">
                  <button
                    v-for="opt in TAG_COUNT_OPTIONS"
                    :key="opt.value"
                    :class="['settings-opt', { active: priceTagCountPreset === opt.value && opt.value !== 'custom' }]"
                    @click="selectTagCountPreset(opt.value)"
                  >{{ opt.label }}</button>
                </div>
                <div v-if="priceTagCountPreset === 'custom'" class="settings-custom-range">
                  <span class="settings-range-sep">显示</span>
                  <input
                    type="number"
                    v-model.number="priceTagCustomCount"
                    :min="1"
                    :max="MAX_TAG_COUNT"
                    class="settings-date-input"
                    style="flex: 0 0 70px; text-align: center;"
                  />
                  <span class="settings-range-sep">个标签（1-{{ MAX_TAG_COUNT }}）</span>
                </div>
              </div>
              <div class="settings-section">
                <div class="settings-section-title">特定标签模式</div>
                <label class="settings-toggle">
                  <input type="checkbox" v-model="priceSpecificTagMode" />
                  <span>{{ priceSpecificTagMode ? '已开启：手动选择要显示的标签' : '开启后手动选择要显示的标签' }}</span>
                </label>
                <!-- 特定标签模式：搜索框 + 候选标签 + 已选标签 -->
                <div v-if="priceSpecificTagMode" class="specific-tag-block">
                  <input
                    v-model="priceSpecificTagSearch"
                    type="text"
                    class="settings-date-input"
                    placeholder="🔍 搜索标签（模糊匹配）"
                    @input="onSpecificTagSearchInput"
                  />
                  <!-- 搜索结果（未选中的候选标签） -->
                  <div v-if="priceSpecificTagSearch.trim() && priceSpecificTagCandidates.length > 0" class="specific-tag-candidates">
                    <span
                      v-for="t in priceSpecificTagCandidates"
                      :key="`cand-${t}`"
                      class="specific-tag-chip"
                      :class="{ disabled: priceSpecificTagSelected.length >= MAX_TAG_COUNT }"
                      @click="addSpecificTag(t)"
                    >+ {{ t }}</span>
                  </div>
                  <div v-else-if="priceSpecificTagSearch.trim()" class="specific-tag-empty">
                    没有找到匹配 “{{ priceSpecificTagSearch }}” 的标签
                  </div>
                  <!-- 已选中的特定标签 -->
                  <div class="specific-tag-selected">
                    <div class="specific-tag-selected-label">
                      已选 ({{ priceSpecificTagSelected.length }}/{{ MAX_TAG_COUNT }})：
                    </div>
                    <div v-if="priceSpecificTagSelected.length > 0" class="specific-tag-selected-list">
                      <span
                        v-for="t in priceSpecificTagSelected"
                        :key="`sel-${t}`"
                        class="specific-tag-chip specific-tag-chip--selected"
                        @click="removeSpecificTag(t)"
                      >{{ t }} ×</span>
                    </div>
                    <div v-else class="specific-tag-empty">未选择特定标签</div>
                  </div>
                  <div class="specific-tag-hint">
                    💡 特定标签与下方自动标签共享 {{ MAX_TAG_COUNT }} 个额度。已选满后，新加特定标签将依次替换按关联书籍数量排序中最末的普通标签。
                  </div>
                </div>
              </div>
            </template>
            <div class="settings-section">
              <div class="settings-section-title">价格口径</div>
              <div class="settings-options">
                <button
                  :class="['settings-opt', { active: priceType === 'paid' }]"
                  @click="priceType = 'paid'"
                >实际价格</button>
                <button
                  :class="['settings-opt', { active: priceType === 'standard' }]"
                  @click="priceType = 'standard'"
                >标准价格</button>
              </div>
            </div>
            <div v-if="priceType === 'paid'" class="settings-section">
              <div class="settings-section-title">排除 0 元</div>
              <label class="settings-toggle">
                <input type="checkbox" v-model="excludeZeroPaid" />
                <span>{{ excludeZeroPaid ? '已排除购买价为 0 的书' : '排除购买价为 0 的书' }}</span>
              </label>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div v-if="priceCategoryMode === 'tag'" class="mode-hint">
        <span class="mode-hint-icon">💡</span>
        一本书有多个标签时，花费按标签数平均分摊，所有分类金额合计等于总花费。
      </div>
      <div class="price-charts-row">
        <div class="price-chart-col">
          <div class="chart-container" ref="priceCategoryChartRef"></div>
          <!-- 空状态：按口径判断哪个金额为0 -->
          <div v-if="(priceType === 'paid' && priceStats.totalPaid === 0) || (priceType === 'standard' && priceStats.totalStandard === 0)" class="chart-empty-state">
            <div class="empty-icon">💰</div>
            <div class="empty-text">{{ priceType === 'paid' ? '还没有实际购书花费数据' : '还没有标准定价数据' }}</div>
            <div class="empty-hint">去书籍详情填写{{ priceType === 'paid' ? '"购入价格"' : '"标准定价"' }}后，这里会按分组/标签显示花费占比</div>
            <div v-if="priceType === 'paid' && excludeZeroPaid" class="empty-hint" style="margin-top:6px">💡 已排除购买价为 0 的书，试试取消"排除 0 元"</div>
          </div>
        </div>
        <div class="price-chart-col">
          <div class="discount-summary" v-if="priceStats.savings > 0">
            <div class="summary-item">
              <div class="summary-label">标准总价</div>
              <div class="summary-value">¥{{ priceStats.totalStandard.toFixed(2) }}</div>
            </div>
            <div class="summary-item summary-item--paid">
              <div class="summary-label">实付总价</div>
              <div class="summary-value">¥{{ priceStats.totalPaid.toFixed(2) }}</div>
            </div>
            <div class="summary-item summary-item--saved">
              <div class="summary-label">共省下</div>
              <div class="summary-value">¥{{ priceStats.savings.toFixed(2) }}</div>
              <div class="summary-percent">{{ priceStats.savingsPercent }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 🏷️ 价格 - 折扣对比（双环玫瑰图） -->
    <div v-if="activeChart === 'price' || activeChart === 'all'" class="card card--price">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--price">🏷️ 价格</span>
            <span class="card-title-sep">·</span>
            <span>购书折扣对比</span>
          </span>
          <span class="card-subtitle">外环标准价 / 内环实付价</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'discount' }"
            @click.stop="toggleSettingsMenu('discount')"
            :aria-expanded="openSettingsMenu === 'discount'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'discount'"
            @update:modelValue="onSettingsCardToggle('discount', $event)"
            title="购书折扣对比 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container chart-container--tall" ref="discountChartRef"></div>
    </div>

    <!-- 🏷️ 价格 - 购书花费时间趋势（折线/柱状） -->
    <div v-if="activeChart === 'price' || activeChart === 'all'" class="card card--price">
      <div class="card-header">
        <div class="card-header-left">
          <span class="card-title">
            <span class="card-title-tag card-title-tag--price">🏷️ 价格</span>
            <span class="card-title-sep">·</span>
            <span>购书花费时间趋势</span>
          </span>
          <span class="card-subtitle">按时间粒度展示购书金额变化</span>
        </div>
        <div class="card-header-actions">
          <button
            class="chart-settings-btn"
            :class="{ 'is-open': openSettingsMenu === 'priceTrend' }"
            @click.stop="toggleSettingsMenu('priceTrend')"
            :aria-expanded="openSettingsMenu === 'priceTrend'"
            title="图表设置"
          >⚙️</button>
          <StackedSettingsPanel
            :modelValue="openSettingsMenu === 'priceTrend'"
            @update:modelValue="onSettingsCardToggle('priceTrend', $event)"
            title="购书花费时间趋势 - 设置"
          >
            <div class="settings-section">
              <div class="settings-section-title">时间粒度</div>
              <div class="settings-options">
                <button
                  v-for="opt in PRICE_TREND_GRANULARITY_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: priceTrendGranularity === opt.value }]"
                  @click="priceTrendGranularity = opt.value"
                >{{ opt.label }}</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">时间范围</div>
              <div class="settings-options">
                <button
                  v-for="opt in TIME_RANGE_OPTIONS"
                  :key="opt.value"
                  :class="['settings-opt', { active: globalTimeRange === opt.value }]"
                  @click="selectTimeRange(opt.value)"
                >{{ opt.label }}</button>
              </div>
              <div v-if="globalTimeRange === 'custom'" class="settings-custom-range">
                <input
                  type="date"
                  v-model="customStartDate"
                  :max="customEndDate || todayStr"
                  class="settings-date-input"
                />
                <span class="settings-range-sep">至</span>
                <input
                  type="date"
                  v-model="customEndDate"
                  :min="customStartDate"
                  :max="todayStr"
                  class="settings-date-input"
                />
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">价格口径</div>
              <div class="settings-options">
                <button
                  :class="['settings-opt', { active: priceType === 'paid' }]"
                  @click="priceType = 'paid'"
                >实际价格</button>
                <button
                  :class="['settings-opt', { active: priceType === 'standard' }]"
                  @click="priceType = 'standard'"
                >标准价格</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-section-title">图表类型</div>
              <div class="settings-options">
                <button
                  :class="['settings-opt', { active: priceTrendChartType === 'bar' }]"
                  @click="priceTrendChartType = 'bar'"
                >柱状图</button>
                <button
                  :class="['settings-opt', { active: priceTrendChartType === 'line' }]"
                  @click="priceTrendChartType = 'line'"
                >折线图</button>
              </div>
            </div>
            <div v-if="priceTrendChartType === 'bar'" class="settings-section">
              <div class="settings-section-title">数据表格设置</div>
              <label class="settings-checkbox-row">
                <input
                  type="checkbox"
                  v-model="priceTrendShowGridLines"
                />
                <span class="settings-checkbox-label">显示网格线（横向+纵向）</span>
              </label>
            </div>
            <div class="settings-section">
              <CardOpacityControl
                :modelValue="cardOpacity"
                @update:modelValue="setCardOpacity"
              />
            </div>
          </StackedSettingsPanel>
        </div>
      </div>
      <div class="chart-container" ref="priceTrendChartRef"></div>
    </div>
    </div><!-- /all-charts-wrapper -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, watchEffect, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import { useBookStore } from '@/stores/book';
import { useBookmarkStore } from '@/stores/bookmark';
import { bookService } from '@/api/book';
import type { BookGroup } from '@/api/book/types';
import StackedSettingsPanel from './StackedSettingsPanel.vue';
import CardOpacityControl from './CardOpacityControl.vue';

const bookStore = useBookStore();
const bookmarkStore = useBookmarkStore();
const router = useRouter();

// 分组列表（id -> name 映射），用于把 book.groups 里的 ID 转成显示名称
const groups = ref<BookGroup[]>([]);
const groupIdToName = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const g of groups.value) {
    map[String(g.id)] = g.name || String(g.id);
  }
  return map;
});

// 图表引用
const statusChartRef = ref<HTMLElement | null>(null);
const trendChartRef = ref<HTMLElement | null>(null);
const priceCategoryChartRef = ref<HTMLElement | null>(null);
const discountChartRef = ref<HTMLElement | null>(null);
// 新增：装帧分布（藏书）、月度书摘（书摘）图表容器
const bindingChartRef = ref<HTMLElement | null>(null);
const bookmarkTrendChartRef = ref<HTMLElement | null>(null);

// 缓存各图表实例，方便模式切换时精准更新单个图表
const priceCategoryChart = ref<any>(null);

// 购书花费分类模式：'group' 按分组，'tag' 按标签
const priceCategoryMode = ref<'group' | 'tag'>('group');

// 价格口径：'paid' 实际购买价，'standard' 标准价
const priceType = ref<'paid' | 'standard'>('paid');

// 排除 0 元书籍（仅在 priceType === 'paid' 模式下生效；勾选后从聚合中过滤掉 purchasePrice 为 0 的书）
const excludeZeroPaid = ref(false);

// 时间趋势图 DOM 引用
const priceTrendChartRef = ref<HTMLElement | null>(null);

// 标签数量上限（含特定标签）：固定为 20
const MAX_TAG_COUNT = 20;
// 标签数量预设
const TAG_COUNT_OPTIONS: { value: 10 | 15 | 20 | 'custom'; label: string }[] = [
  { value: 10, label: '10 个' },
  { value: 15, label: '15 个' },
  { value: 20, label: '20 个' },
  { value: 'custom', label: '自定义' }
];
// 当前预设（默认 20），自定义时为 'custom'
const priceTagCountPreset = ref<10 | 15 | 20 | 'custom'>(20);
// 自定义 1-20
const priceTagCustomCount = ref<number>(10);
// 特定标签模式：开启后仅显示用户指定的标签（与自动标签共享 MAX_TAG_COUNT 个额度）
const priceSpecificTagMode = ref(false);
// 模糊搜索关键字
const priceSpecificTagSearch = ref('');
// 已选中的特定标签
const priceSpecificTagSelected = ref<string[]>([]);
// 当前搜索结果（不包含已选标签）
const priceSpecificTagCandidates = ref<string[]>([]);

const selectTagCountPreset = (val: 10 | 15 | 20 | 'custom') => {
  priceTagCountPreset.value = val;
  if (val !== 'custom') {
    // 切换预设时，自动夹紧当前选中数量
    const limit = val;
    if (priceSpecificTagSelected.value.length > limit) {
      priceSpecificTagSelected.value = priceSpecificTagSelected.value.slice(0, limit);
    }
  } else {
    // 自定义模式：夹紧到合法区间
    if (!priceTagCustomCount.value || priceTagCustomCount.value < 1) {
      priceTagCustomCount.value = 1;
    } else if (priceTagCustomCount.value > MAX_TAG_COUNT) {
      priceTagCustomCount.value = MAX_TAG_COUNT;
    }
  }
};

// 监听自定义数量，确保落在 1-20 区间
watch(priceTagCustomCount, (val) => {
  if (val === undefined || val === null) return;
  if (val < 1) priceTagCustomCount.value = 1;
  else if (val > MAX_TAG_COUNT) priceTagCustomCount.value = MAX_TAG_COUNT;
});

// 当前用户选择的最大标签数（含特定标签与自动标签）
const getMaxTagCount = (): number => {
  return priceTagCountPreset.value === 'custom'
    ? Math.max(1, Math.min(MAX_TAG_COUNT, priceTagCustomCount.value || 1))
    : priceTagCountPreset.value;
};

// 暴露供模板使用的所有可用标签名（从全量书籍中聚合）
const allTagNames = computed<string[]>(() => {
  const set = new Set<string>();
  // priceStats.tagAgg -> { tag: { count, spent, standard, bookIds, value } }
  // tagAgg 才是真实的标签聚合来源（与 renderPriceCategoryChart 使用同一份）
  const tagAgg = (priceStats.value as any)?.tagAgg;
  if (tagAgg && typeof tagAgg === 'object') {
    Object.keys(tagAgg).forEach(k => set.add(k));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
});

// 输入搜索时计算候选标签
const onSpecificTagSearchInput = () => {
  const kw = priceSpecificTagSearch.value.trim().toLowerCase();
  if (!kw) {
    priceSpecificTagCandidates.value = [];
    return;
  }
  // 模糊匹配：包含子串即可；排除已选项
  const selectedSet = new Set(priceSpecificTagSelected.value);
  const matches = allTagNames.value
    .filter(t => !selectedSet.has(t) && t.toLowerCase().includes(kw))
    .slice(0, 20);
  priceSpecificTagCandidates.value = matches;
};

// 添加一个特定标签
const addSpecificTag = (tag: string) => {
  if (!tag) return;
  const limit = getMaxTagCount();
  if (priceSpecificTagSelected.value.includes(tag)) return;
  if (priceSpecificTagSelected.value.length >= limit) {
    // 已满：弹出提示，不加入（替换逻辑在自动标签选择阶段处理）
    console.warn('特定标签数已满，删除部分标签后再添加');
    return;
  }
  priceSpecificTagSelected.value = [...priceSpecificTagSelected.value, tag];
  // 重新计算候选（排除刚加入的）
  onSpecificTagSearchInput();
};

// 移除一个特定标签
const removeSpecificTag = (tag: string) => {
  priceSpecificTagSelected.value = priceSpecificTagSelected.value.filter(t => t !== tag);
  // 重新计算候选
  onSpecificTagSearchInput();
};

// 切换特定标签模式时同步重置
watch(priceSpecificTagMode, (on) => {
  if (!on) {
    priceSpecificTagSearch.value = '';
    priceSpecificTagCandidates.value = [];
  }
});

// 装帧类型映射：binding1 -> 中文标签（参考 Book/Edit.vue 中的 binding1Options）
const BINDING_LABELS: Record<number, string> = {
  0: '电子书',
  1: '平装',
  2: '精装',
  3: '特殊装帧',
  4: '套装',
};

// 纸张类型映射：paper1 -> 中文标签（参考 Book/Edit.vue paper1Options）
const PAPER_LABELS: Record<number, string> = {
  0: '未指定',
  1: '胶版纸（双胶纸）',
  2: '轻型纸',
  3: '道林纸',
  4: '铜版纸',
  5: '牛皮纸',
  6: '宣纸',
  7: '进口特种纸',
};

// 刷边一级（位置）映射：edge1 -> 中文标签
// - 0 = 无刷边
// - 1/2/3 = 三面/天/地（与 Edit.vue 中 1=基础/2=烫边/3=磨边 等子类编号保持一致）
const EDGE_LABELS: Record<number, string> = {
  0: '无刷边',
  1: '基础单色刷边',
  2: '烫金/银刷边',
  3: '磨边（毛边）',
  4: '彩绘艺术刷边',
  5: '鎏金高端刷边',
};

// 书籍来源渠道显示映射（与 Book/Detail.vue sourceLabelMap 保持一致）
const SOURCE_LABELS: Record<string, string> = {
  douban: '豆瓣读书',
  dbr: '豆瓣读书 (DBR)',
  google: 'Google Books',
  openlibrary: 'Open Library',
  manual: '手动添加',
  import: '批量导入',
  calibre: 'Calibre 书库',
  talebook: 'Talebook 书库',
};
function getSourceDisplay(source: string): string {
  if (!source) return '未指定';
  const lower = source.toLowerCase();
  return SOURCE_LABELS[lower] || source;
}

// 当前激活的图表分类：null=不显示任何图表，'all'=全部图表，其他=对应分类
// - 'book'     藏书 → 装帧分布
// - 'read'     已读完 → 阅读状态分布 + 月度阅读趋势
// - 'bookmark' 书摘 → 月度书摘趋势
// - 'price'    标准/购书花费 → 购书花费分类 + 折扣对比
// - 'all'      全部图表
const activeChart = ref<'all' | 'book' | 'read' | 'bookmark' | 'price' | null>(null);

// 当前打开的图表设置菜单 id（同一时刻只显示一个下拉）
// 取值：'binding' | 'status' | 'trend' | 'bookmarkTrend' | 'priceCategory' | 'discount' | null
const openSettingsMenu = ref<string | null>(null);

function toggleSettingsMenu(id: string) {
  openSettingsMenu.value = openSettingsMenu.value === id ? null : id;
}

/**
 * StackedSettingsPanel 关闭/打开的统一回调：
 * - 当卡片请求关闭（autoClose=true 时点击遮罩/确认/取消/Esc/×）时，
 *   我们把 openSettingsMenu 置为 null（与旧的 dropdown 行为一致）。
 * - 当卡片被打开时（外部直接设置 modelValue），仍以当前 openSettingsMenu 状态为准。
 */
function onSettingsCardToggle(id: string, v: boolean) {
  if (!v) {
    if (openSettingsMenu.value === id) openSettingsMenu.value = null;
  }
}

// 点击空白关闭下拉
function handleOutsideClick() {
  openSettingsMenu.value = null;
}

// 全局时间范围（影响所有图表）
const globalTimeRange = ref<'all' | '3m' | '6m' | '12m' | '24m' | 'thisYear' | 'custom'>('all');

// 时间范围选项
const TIME_RANGE_OPTIONS = [
  { value: 'all',      label: '全部时间' },
  { value: '3m',       label: '近 3 个月' },
  { value: '6m',       label: '近 6 个月' },
  { value: '12m',      label: '近 12 个月' },
  { value: '24m',      label: '近 24 个月' },
  { value: 'thisYear', label: '本年' },
  { value: 'custom',   label: '自定义' },
] as const;

// 购书花费时间趋势：时间粒度（按日/周/月/年）
const PRICE_TREND_GRANULARITY_OPTIONS = [
  { value: 'day',   label: '日' },
  { value: 'week',  label: '周' },
  { value: 'month', label: '月' },
  { value: 'year',  label: '年' },
] as const;
type PriceTrendGranularity = typeof PRICE_TREND_GRANULARITY_OPTIONS[number]['value'];

// 时间趋势图当前选中的粒度
const priceTrendGranularity = ref<PriceTrendGranularity>('month');
// 时间趋势图柱状/折线类型
const priceTrendChartType = ref<'bar' | 'line'>('bar');
// 时间趋势图柱状图数据表格设置
const priceTrendShowGridLines = ref<boolean>(true); // 是否显示网格线（横/竖）

// 图表卡片透明度（0-100，默认 100 不透明）
// 用户通过设置面板中的滑块调整，使卡片下方的内容根据透明度显现
const cardOpacity = ref<number>(100);
const setCardOpacity = (v: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return;
  cardOpacity.value = Math.max(0, Math.min(100, Math.round(n)));
};

// 词云图：显示前 N 个标签（按添加频次）
const WORDCLOUD_COUNT_OPTIONS = [10, 20, 30, 50] as const;
const WORDCLOUD_TOP_N_DEFAULT = 30;
const WORDCLOUD_TOP_N = WORDCLOUD_TOP_N_DEFAULT; // 模板里用到的常量
const wordCloudTopN = ref<number>(WORDCLOUD_TOP_N_DEFAULT);
// 字号范围：基础/中/大
type WordCloudFontSize = 'small' | 'medium' | 'large';
const WORDCLOUD_FONT_OPTIONS: ReadonlyArray<{ value: WordCloudFontSize; label: string }> = [
  { value: 'small',  label: '紧凑' },
  { value: 'medium', label: '标准' },
  { value: 'large',  label: '醒目' },
];
const wordCloudFontSize = ref<WordCloudFontSize>('medium');
// 不同字号范围对应的最大/最小 px
const WORDCLOUD_FONT_PRESETS: Record<WordCloudFontSize, { min: number; max: number }> = {
  small:  { min: 12, max: 28 },
  medium: { min: 14, max: 40 },
  large:  { min: 16, max: 56 },
};

// 藏书页面新增图表的 DOM 引用
const bookTypeChartRef = ref<HTMLElement | null>(null);
const paperChartRef = ref<HTMLElement | null>(null);
const edgeChartRef = ref<HTMLElement | null>(null);
const sourceChartRef = ref<HTMLElement | null>(null);
const wordCloudRef = ref<HTMLElement | null>(null);

// 已读完 / 书摘 - Top 排行榜图表的 DOM 引用
const topReadTimeChartRef = ref<HTMLElement | null>(null);
const topBookmarksChartRef = ref<HTMLElement | null>(null);

// 排行榜显示前几名（可设置）
const TOP_N_OPTIONS = [3, 5, 10] as const;
const topReadTimeN = ref<5 | 3 | 10>(5);
const topBookmarksN = ref<5 | 3 | 10>(5);

// 自定义时间范围：起始 / 结束日期（YYYY-MM-DD）
const customStartDate = ref(formatDateInput(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)));
const customEndDate = ref(formatDateInput(new Date()));
// 用于限制结束日期不能超过今天
const todayStr = formatDateInput(new Date());

// 把 Date 转成 <input type="date"> 需要的 YYYY-MM-DD
function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 选择时间范围：自定义时不下拉，其他则关闭下拉
function selectTimeRange(value: typeof TIME_RANGE_OPTIONS[number]['value']) {
  globalTimeRange.value = value;
  if (value !== 'custom') {
    openSettingsMenu.value = null;
  }
}

// 时间范围工具：根据范围过滤书籍（用 createTime 字段）
// 签名宽松：传入任意带 createTime 属性的对象（Book 等）
// 根据当前 globalTimeRange 计算 [from, to] 时间区间；'all' 返回 null
function resolveTimeRange(): { from: Date; to: Date } | null {
  const range = globalTimeRange.value;
  if (range === 'all') return null;
  const now = new Date();
  if (range === 'custom') {
    const from = customStartDate.value
      ? new Date(customStartDate.value)
      : new Date(0);
    // 结束日期包含当天，扩展到 23:59:59
    const to = customEndDate.value
      ? new Date(customEndDate.value + 'T23:59:59')
      : now;
    return { from, to };
  }
  let from: Date;
  if (range === 'thisYear') {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    const months = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 24;
    from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  }
  return { from, to: now };
}

// 时间范围过滤（书籍）：兼容 createTime / purchaseDate / timestamp / last_modified
// 优先用 createTime，否则按 purchaseDate，再否则用 timestamp，再否则用 last_modified
// 全部取不到则视为不在范围内（与之前行为一致）
function filterBooksByTimeRange<T extends {
  createTime?: string | null;
  purchaseDate?: string | null;
  timestamp?: string | null;
  last_modified?: string | null;
}>(books: T[]): T[] {
  const span = resolveTimeRange();
  if (!span) return books;
  return books.filter(b => {
    const raw = b.createTime || b.purchaseDate || b.timestamp || b.last_modified;
    if (!raw) return false;
    const t = new Date(raw);
    return !isNaN(t.getTime()) && t >= span.from && t <= span.to;
  });
}

// 时间范围工具：根据范围过滤书摘（用 createTime/created_at 字段）
function filterBookmarksByTimeRange<T extends { createTime?: string; created_at?: string }>(items: T[]): T[] {
  const span = resolveTimeRange();
  if (!span) return items;
  return items.filter(b => {
    const t = b.createTime || b.created_at;
    if (!t) return false;
    const d = new Date(t);
    return !isNaN(d.getTime()) && d >= span.from && d <= span.to;
  });
}

// 阅读统计
const readingStats = computed(() => {
  // 应用全局时间范围过滤（基于 addTime 字段）
  const books = filterBooksByTimeRange(bookStore.allBooks);
  const bookmarks = filterBookmarksByTimeRange(bookmarkStore.allBookmarks);

  // 阅读状态分布
  const unreadCount = books.filter(b => b.readStatus === '未读').length;
  const readingCount = books.filter(b => b.readStatus === '在读').length;
  const readCount = books.filter(b => b.readStatus === '已读').length;

  // 装帧分布：按 binding1 聚合（缺失/null 归入"未设置"）
  // 电子书判定与书库高级筛选保持一致：以 book_type === 0 为准
  // 注：不再用 binding1 === 0 兜底，避免载体为实体书但装帧历史错填为 0 时误计为电子书
  const bindingMap: Record<string, number> = {};
  for (const b of books) {
    let key: string;
    if (b.book_type === 0) {
      key = '电子书';
    } else if (b.binding1 === null || b.binding1 === undefined) {
      key = '未设置';
    } else {
      key = BINDING_LABELS[b.binding1] ?? `装帧#${b.binding1}`;
    }
    bindingMap[key] = (bindingMap[key] || 0) + 1;
  }
  // 排序：按数量降序；过滤 0
  const bindingStats = Object.entries(bindingMap)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    totalBooks: books.length,
    readBooks: readCount,
    readingBooks: readingCount,
    unreadBooks: unreadCount,
    readStatusBreakdown: [
      { label: '未读', count: unreadCount, color: '#9e9e9e' },
      { label: '在读', count: readingCount, color: '#ff9800' },
      { label: '已读', count: readCount, color: '#4caf50' },
    ],
    bindingStats,
    totalBookmarks: bookmarks.length,
    totalSpent: books.reduce((sum, b) => sum + (b.purchasePrice || 0), 0),
    totalStandardPrice: books.reduce((sum, b) => sum + (b.standardPrice || 0), 0),
    // 月度阅读趋势：基于 resolveTimeRange 生成完整月份列表，按 readCompleteDate 聚合
    trendMonths: (() => {
      const span = resolveTimeRange();
      const counts = new Map<string, number>();
      for (const b of books) {
        if (b.readStatus !== '已读' || !b.readCompleteDate) continue;
        const d = new Date(b.readCompleteDate);
        if (isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return resolveMonthRangeFromCounts(span, counts);
    })(),
    trendCounts: (() => {
      const span = resolveTimeRange();
      // 用过滤后的 books，按 readCompleteDate 统计当月读完数量
      const counts = new Map<string, number>();
      for (const b of books) {
        if (b.readStatus !== '已读' || !b.readCompleteDate) continue;
        const d = new Date(b.readCompleteDate);
        if (isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const monthList = resolveMonthRangeFromCounts(span, counts);
      return monthList.map(m => counts.get(m) || 0);
    })(),
  };
});

// 月度书摘趋势：按 createTime 聚合近 12 个月
// - 横轴：月份（YYYY-MM）
// - 纵轴：当月书摘数量
// - 用最新有数据月份作为结束月，回溯 12 个月
// 生成 [from, to] 之间的完整月份列表，格式 YYYY-MM
function generateMonthRange(from: Date, to: Date): string[] {
  const months: string[] = [];
  const y = from.getFullYear();
  const m = from.getMonth() + 1;
  const toY = to.getFullYear();
  const toM = to.getMonth() + 1;
  let cy = y, cm = m;
  while (cy < toY || (cy === toY && cm <= toM)) {
    months.push(`${cy}-${String(cm).padStart(2, '0')}`);
    cm++;
    if (cm > 12) { cm = 1; cy++; }
  }
  return months;
}

// 在没有显式时间范围时，根据 counts 自动推导月份列表
// 优先覆盖"最早有数据的月 → 当前月"，确保 X 轴不会出现"暂无时间范围"占位
function resolveMonthRangeFromCounts(
  span: { from: Date; to: Date } | null,
  counts: Map<string, number>
): string[] {
  if (span) return generateMonthRange(span.from, span.to);
  if (counts.size > 0) {
    const sortedKeys = Array.from(counts.keys()).sort();
    const firstKey = sortedKeys[0];
    const lastKey = sortedKeys[sortedKeys.length - 1];
    const [fy, fm] = firstKey.split('-').map(Number);
    const [ly, lm] = lastKey.split('-').map(Number);
    const now = new Date();
    return generateMonthRange(new Date(fy, fm - 1, 1), now);
  }
  // 无数据时也至少显示当前月
  const now = new Date();
  return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
}

const bookmarkTrendStats = computed(() => {
  const span = resolveTimeRange();
  const bookmarks = filterBookmarksByTimeRange(bookmarkStore.allBookmarks);
  const counts = new Map<string, number>();
  for (const bm of bookmarks) {
    const t = bm.createTime || bm.created_at;
    if (!t) continue;
    const d = new Date(t);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const months = resolveMonthRangeFromCounts(span, counts);
  const hasData = Array.from(counts.values()).some(v => v > 0);
  return {
    months,
    counts: months.map(m => counts.get(m) || 0),
    hasData,
  };
});

// 价格统计（按书籍载体 + 分组分类）
const priceStats = computed(() => {
  // 过滤：
  // 1) 购买价格模式下开启"排除 0 元"时，从聚合中剔除 purchasePrice === 0 的书
  // 2) 应用全局时间范围过滤
  const baseBooks = filterBooksByTimeRange(bookStore.allBooks);
  const books = (priceType.value === 'paid' && excludeZeroPaid.value)
    ? baseBooks.filter(b => (b.purchasePrice || 0) > 0)
    : baseBooks;

  // 按 book_type 聚合（电子/纸质）
  const typeAgg: Record<string, { count: number; spent: number; standard: number }> = {
    电子书: { count: 0, spent: 0, standard: 0 },
    纸质书: { count: 0, spent: 0, standard: 0 },
  };
  // 按 分组 聚合（一本书可属于多个分组，按比例分摊金额，类似 tagAgg）
  // - spent/standard: 一本书有 N 个分组时，每个分组记入 spent/N（金额按比例分摊）
  // - count: 一本书的所有分组都计数（有 N 个分组则在 N 个分组里都 +1）
  // - 这样所有分组的 spent 之和 = 总花费，count 是"包含此分组的书籍数"
  const groupAgg: Record<string, { count: number; spent: number; standard: number }> = {
    未分组: { count: 0, spent: 0, standard: 0 },
  };

  // 按 标签 聚合（多标签按比例分摊，保证合计 = 总花费）
  // - spent: 一本书有 N 个标签时，每个标签记入 spent/N（金额按比例分摊）
  // - count: 一本书的所有标签都计数（有 N 个标签则在 N 个标签里都 +1）
  // - 这样所有标签的 spent 之和 = 总花费，count 是"包含此标签的书籍数"
  const tagAgg: Record<string, { count: number; spent: number; standard: number; bookIds: Set<number> }> = {};

  for (const b of books) {
    const typeKey = b.book_type === 0 ? '电子书' : '纸质书';
    typeAgg[typeKey].count += 1;
    typeAgg[typeKey].spent += b.purchasePrice || 0;
    typeAgg[typeKey].standard += b.standardPrice || 0;

    // b.groups 里存的是分组 ID（可能是数字或字符串），需要通过 groupIdToName 映射成显示名
    // 一本书可属于多个分组：对所有分组按比例分摊金额（与 tagAgg 一致）
    const rawGroupKeys: string[] = (b.groups && b.groups.length > 0)
      ? b.groups.map(g => String(g))
      : [];
    const groupKeys: string[] = rawGroupKeys.length === 0
      ? ['未分组']
      : rawGroupKeys.map(g => groupIdToName.value[g] || `分组#${g}`);
    const gN = groupKeys.length;
    const splitSpentByGroup = (b.purchasePrice || 0) / gN;
    const splitStandardByGroup = (b.standardPrice || 0) / gN;
    for (const groupKey of groupKeys) {
      if (!groupAgg[groupKey]) {
        groupAgg[groupKey] = { count: 0, spent: 0, standard: 0 };
      }
      groupAgg[groupKey].count += 1;
      groupAgg[groupKey].spent += splitSpentByGroup;
      groupAgg[groupKey].standard += splitStandardByGroup;
    }

    // 标签聚合：合并多种标签源，并去重
    // 注意：book 类型可能不包含 customTags，用 (b as any) 兜底
    const bAny = b as any;
    const allTags = new Set<string>();
    if (Array.isArray(b.tags)) b.tags.forEach((t: string) => t && allTags.add(t));
    if (Array.isArray(b.calibreTags)) b.calibreTags.forEach((t: string) => t && allTags.add(t));
    if (Array.isArray(bAny.customTags)) bAny.customTags.forEach((t: string) => t && allTags.add(t));

    if (allTags.size === 0) {
      // 没有标签的书籍归入"未标签"
      if (!tagAgg['未标签']) {
        tagAgg['未标签'] = { count: 0, spent: 0, standard: 0, bookIds: new Set() };
      }
      tagAgg['未标签'].count += 1;
      tagAgg['未标签'].spent += b.purchasePrice || 0;
      tagAgg['未标签'].standard += b.standardPrice || 0;
      tagAgg['未标签'].bookIds.add(b.id);
    } else {
      const n = allTags.size;
      const splitSpent = (b.purchasePrice || 0) / n;
      const splitStandard = (b.standardPrice || 0) / n;
      allTags.forEach(tag => {
        if (!tagAgg[tag]) {
          tagAgg[tag] = { count: 0, spent: 0, standard: 0, bookIds: new Set() };
        }
        tagAgg[tag].count += 1;
        tagAgg[tag].spent += splitSpent;
        tagAgg[tag].standard += splitStandard;
        tagAgg[tag].bookIds.add(b.id);
      });
    }
  }

  // 在聚合完成后，根据 priceType 给 groupAgg/tagAgg 每个分组加一个 value 字段（对外消费）
  // - value = 当前选中口径的金额（实付价 或 标准价）
  // - 这样上层 renderPriceCategoryChart 不需要关心是哪种口径
  const pickAmount = (v: { spent: number; standard: number }) => priceType.value === 'standard' ? v.standard : v.spent;
  for (const k in groupAgg) {
    (groupAgg[k] as any).value = pickAmount(groupAgg[k]);
  }
  for (const k in tagAgg) {
    (tagAgg[k] as any).value = pickAmount(tagAgg[k] as any);
  }

  const totalPaid = books.reduce((s, b) => s + (b.purchasePrice || 0), 0);
  const totalStandard = books.reduce((s, b) => s + (b.standardPrice || 0), 0);
  const savings = Math.max(0, totalStandard - totalPaid);
  const savingsPercent = totalStandard > 0 ? Math.round((savings / totalStandard) * 100) : 0;

  return { typeAgg, groupAgg, tagAgg, totalPaid, totalStandard, savings, savingsPercent };
});

// 购书花费时间趋势：按所选粒度（日/周/月/年）对当前价格口径下的金额进行时间分桶
// 返回 buckets: { key, label, total, count, books }
//  - key   用于排序的稳定 key（如 '2025-01'、'2025-W03'、'2025-01-15'、'2025'）
//  - label 坐标轴显示文案（更友好）
//  - total 该桶内"按当前口径"的总金额（实付/标准）
//  - count 该桶内书籍数量
//  - books 该桶内 book id 列表（用于交互）
const priceTrendStats = computed(() => {
  const baseBooks = filterBooksByTimeRange(bookStore.allBooks);
  const books = (priceType.value === 'paid' && excludeZeroPaid.value)
    ? baseBooks.filter(b => (b.purchasePrice || 0) > 0)
    : baseBooks;

  // 没有购买日期或时间不可解析时，使用 null 桶（不算入时间序列，避免误聚合）
  type Bucket = { key: string; label: string; total: number; count: number; books: number[] };
  const buckets = new Map<string, Bucket>();

  const pickAmount = (b: any) => priceType.value === 'standard' ? (b.standardPrice || 0) : (b.purchasePrice || 0);

  // 周键使用 ISO 周（年-周序号），保证全年周数稳定
  const isoWeekKey = (d: Date): string => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (t.getUTCDay() + 6) % 7; // 周一=0
    t.setUTCDate(t.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  };

  const toKey = (d: Date, gran: PriceTrendGranularity): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    if (gran === 'year')  return `${y}`;
    if (gran === 'month') return `${y}-${m}`;
    if (gran === 'week')  return isoWeekKey(d);
    return `${y}-${m}-${day}`;
  };

  const toLabel = (key: string, gran: PriceTrendGranularity): string => {
    if (gran === 'year')  return `${key}年`;
    if (gran === 'month') {
      const [y, m] = key.split('-');
      return `${String(y).slice(-2)}-${m}月`;
    }
    if (gran === 'week')  return key.replace('-W', ' W'); // '2025-W03' -> '2025 W03'
    return key.slice(5); // '2025-03-15' -> '03-15'
  };

  for (const b of books) {
    const ds = b.purchaseDate || (b as any).timestamp;
    if (!ds) continue;
    const d = new Date(ds);
    if (isNaN(d.getTime())) continue;
    const key = toKey(d, priceTrendGranularity.value);
    if (!buckets.has(key)) {
      buckets.set(key, { key, label: toLabel(key, priceTrendGranularity.value), total: 0, count: 0, books: [] });
    }
    const bucket = buckets.get(key)!;
    bucket.total += pickAmount(b);
    bucket.count += 1;
    bucket.books.push(b.id);
  }

  const list = Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
  return { buckets: list, granularity: priceTrendGranularity.value };
});

// 渲染购书花费时间趋势图表
function renderPriceTrendChart(forceRecreate = false) {
  if (!priceTrendChartRef.value) return;
  let chart = echarts.getInstanceByDom(priceTrendChartRef.value) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(priceTrendChartRef.value);
    chart = markRaw(echarts.init(priceTrendChartRef.value));
  }
  const { buckets } = priceTrendStats.value;
  const xLabels = buckets.map(b => b.label);
  const yValues = buckets.map(b => Math.round(b.total * 100) / 100);
  const useBar = priceTrendChartType.value === 'bar';
  const seriesType = useBar ? 'bar' : 'line';

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: useBar ? 'shadow' : 'line' },
      formatter: (params: any[]) => {
        const idx = params[0]?.dataIndex ?? 0;
        const bucket = buckets[idx];
        if (!bucket) return '';
        return `<b>${bucket.label}</b><br/>` +
          `金额: ¥${bucket.total.toFixed(2)}<br/>` +
          `书籍数: ${bucket.count} 本`;
      }
    },
    grid: { left: 50, right: 24, top: 24, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLine: { lineStyle: { color: '#ddd' } },
      axisLabel: { color: '#666', interval: 'auto', rotate: priceTrendGranularity.value === 'day' ? 45 : 0 },
      // 柱状图：纵向网格线（沿 x 轴方向延伸的线）由 splitLine 控制
      splitLine: useBar
        ? { show: priceTrendShowGridLines.value, lineStyle: { color: '#f5f5f5', type: 'dashed' } }
        : { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#666', formatter: '¥{value}' },
      // 柱状图：横向网格线（沿 y 轴方向延伸的线）由 splitLine 控制
      splitLine: useBar
        ? { show: priceTrendShowGridLines.value, lineStyle: { color: '#f0f0f0' } }
        : { show: true, lineStyle: { type: 'dashed', color: '#eee' } }
    },
    series: [{
      name: priceType.value === 'paid' ? '实际花费' : '标准价格',
      type: seriesType,
      data: yValues,
      smooth: !useBar,
      barWidth: useBar ? '55%' : undefined,
      itemStyle: useBar
        ? {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#ff6b35' },
                { offset: 1, color: '#ffab91' }
              ]
            }
          }
        : { color: '#ff6b35' },
      lineStyle: !useBar ? { width: 2 } : undefined,
      areaStyle: !useBar
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 107, 53, 0.3)' },
              { offset: 1, color: 'rgba(255, 107, 53, 0.05)' }
            ])
          }
        : undefined,
      label: {
        show: !useBar,
        position: 'top',
        fontSize: 10,
        color: '#666',
        formatter: (p: any) => `¥${p.value}`
      }
    }]
  });
}

// 通用：折算 % 占比，并按数量降序
function aggregateToPairs(books: any[], pick: (b: any) => string): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const b of books) {
    const k = pick(b) || '未指定';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// 藏书 - 图表类型分布（book_type: 0=电子书 / 1=纸质书 / 其他）
function renderBookTypeChart(forceRecreate = false) {
  if (!bookTypeChartRef.value) return;
  const books = filterBooksByTimeRange(bookStore.allBooks);
  const pairs = aggregateToPairs(books, (b: any) => {
    if (b.book_type === 0) return '电子书';
    if (b.book_type === 1) return '纸质书';
    return '其他';
  });
  if (pairs.length === 0) {
    // 空数据占位
    const chart = forceRecreate ? null : (echarts.getInstanceByDom(bookTypeChartRef.value) as any);
    if (chart) {
      chart.clear();
      chart.setOption({
        title: { text: '暂无数据', left: 'center', top: 'middle', textStyle: { color: '#999' } }
      });
    }
    return;
  }
  let chart = echarts.getInstanceByDom(bookTypeChartRef.value) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(bookTypeChartRef.value);
    chart = markRaw(echarts.init(bookTypeChartRef.value));
  }
  const palette = ['#4caf50', '#ff9800', '#9c27b0', '#03a9f4', '#e91e63'];
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 本 ({d}%)' },
    legend: { bottom: '5%', left: 'center', icon: 'circle' },
    series: [{
      type: 'pie',
      radius: ['35%', '70%'],
      center: ['50%', '45%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c} 本 ({d}%)' },
      data: pairs.map((p, i) => ({ name: p.label, value: p.count, itemStyle: { color: palette[i % palette.length] } }))
    }]
  });
}

// 藏书 - 纸张类型分布（横向柱状图，paper1 聚合）
function renderPaperChart(forceRecreate = false) {
  if (!paperChartRef.value) return;
  const books = filterBooksByTimeRange(bookStore.allBooks);
  const pairs = aggregateToPairs(books, (b: any) => {
    if (b.paper1 === null || b.paper1 === undefined) return '未指定';
    return PAPER_LABELS[b.paper1] ?? `纸张#${b.paper1}`;
  });
  let chart = echarts.getInstanceByDom(paperChartRef.value) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(paperChartRef.value);
    chart = markRaw(echarts.init(paperChartRef.value));
  }
  if (pairs.length === 0) {
    chart.clear();
    chart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'middle', textStyle: { color: '#999' } }
    });
    return;
  }
  // 数量升序：横向柱状图希望数值大的在最上面
  const sorted = [...pairs].sort((a, b) => a.count - b.count);
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 30, top: 20, bottom: 30 },
    xAxis: { type: 'value', name: '书籍数' },
    yAxis: { type: 'category', data: sorted.map(p => p.label), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: sorted.map(p => p.count),
      barWidth: 16,
      itemStyle: { color: '#1976d2', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: '{c}' }
    }]
  });
}

// 藏书 - 刷边处理情况（环形图：按 edge1 聚合 + "无/有"二级分布）
function renderEdgeChart(forceRecreate = false) {
  if (!edgeChartRef.value) return;
  const books = filterBooksByTimeRange(bookStore.allBooks);
  const pairs = aggregateToPairs(books, (b: any) => {
    if (b.edge1 === null || b.edge1 === undefined || b.edge1 === 0) return '无刷边';
    return EDGE_LABELS[b.edge1] ?? `刷边#${b.edge1}`;
  });
  let chart = echarts.getInstanceByDom(edgeChartRef.value) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(edgeChartRef.value);
    chart = markRaw(echarts.init(edgeChartRef.value));
  }
  if (pairs.length === 0) {
    chart.clear();
    chart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'middle', textStyle: { color: '#999' } }
    });
    return;
  }
  const palette = ['#9e9e9e', '#ff9800', '#4caf50', '#03a9f4', '#9c27b0', '#e91e63', '#795548'];
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 本 ({d}%)' },
    legend: { bottom: '5%', left: 'center', icon: 'circle' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c} ({d}%)' },
      data: pairs.map((p, i) => ({ name: p.label, value: p.count, itemStyle: { color: palette[i % palette.length] } }))
    }]
  });
}

// 藏书 - 书籍来源渠道分布（横向柱状图）
function renderSourceChart(forceRecreate = false) {
  if (!sourceChartRef.value) return;
  const books = filterBooksByTimeRange(bookStore.allBooks);
  const pairs = aggregateToPairs(books, (b: any) => getSourceDisplay(b.source));
  let chart = echarts.getInstanceByDom(sourceChartRef.value) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(sourceChartRef.value);
    chart = markRaw(echarts.init(sourceChartRef.value));
  }
  if (pairs.length === 0) {
    chart.clear();
    chart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'middle', textStyle: { color: '#999' } }
    });
    return;
  }
  const sorted = [...pairs].sort((a, b) => a.count - b.count);
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 30, top: 20, bottom: 30 },
    xAxis: { type: 'value', name: '书籍数' },
    yAxis: { type: 'category', data: sorted.map(p => p.label), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: sorted.map(p => p.count),
      barWidth: 16,
      itemStyle: { color: '#7b1fa2', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: '{c}' }
    }]
  });
}

// 藏书 - 词云图：基于螺旋布局算法的标签频次可视化
// 特点：横纵混合排列 + 多角度旋转 + 频次驱动的字号/字重/颜色差异化

// 标签频次数据
const wordCloudItems = computed<Array<{ name: string; value: number; ratio: number }>>(() => {
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
  // 对数缩放 + 归一化，避免最大项过大、最小项过小
  return entries.map(([name, value]) => {
    const ratio = maxVal > 0 ? Math.log(value + 1) / Math.log(maxVal + 1) : 0;
    return { name, value, ratio };
  });
});

// ===== 词云布局工具函数 =====

// 字符串哈希（用于稳定的随机种子）
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

// 文本宽度测量（使用隐藏 canvas 精确测量）
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

// 颜色调色板：6 组共 18 色，按频次 + 哈希分配
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

// 按频次选择旋转角度集合（高频偏水平，小频次变化更丰富）
function pickRotation(name: string, ratio: number): number {
  const seed = Math.abs(hashStr(name + '|rot'));
  if (ratio > 0.66) {
    // 大词：主要水平 + 少量斜向
    return [-20, -10, 0, 0, 0, 10, 20][seed % 7];
  } else if (ratio > 0.33) {
    // 中词：横纵混合 + 一些斜向
    return [-60, -45, -30, -15, 0, 0, 15, 30, 45, 60, 90, -90][seed % 12];
  } else {
    // 小词：变化最多，可横可纵可斜
    return [-90, -75, -60, -45, -30, 30, 45, 60, 75, 90][seed % 10];
  }
}

// 轴对齐包围盒（AABB）碰撞检测
type AABB = { x: number; y: number; w: number; h: number };
function aabbOverlap(a: AABB, b: AABB, pad: number = 1): boolean {
  return !(
    a.x + a.w + pad < b.x ||
    b.x + b.w + pad < a.x ||
    a.y + a.h + pad < b.y ||
    b.y + b.h + pad < a.y
  );
}

// 旋转后 AABB（覆盖旋转后矩形的最小水平矩形）
function rotatedAABB(w: number, h: number, rad: number): { w: number; h: number } {
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { w: w * c + h * s, h: w * s + h * c };
}

// 螺旋布局：将每个词放置在容器内不重叠的位置
type PlacedWord = {
  name: string;
  value: number;
  ratio: number;
  cx: number; cy: number;          // 中心点坐标
  bw: number; bh: number;          // 旋转后 AABB 尺寸
  rotation: number;                // 旋转角度（度）
  color: string;
  fontSize: number;
  fontWeight: number;
};
function layoutWordCloud(
  words: Array<{ name: string; value: number; ratio: number }>,
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

    // Archimedean 螺旋搜索：从中心向外扫描，找到第一个不碰撞的位置
    const seed = Math.abs(hashStr(word.name + '|theta'));
    let theta = (seed % 360) * (Math.PI / 180);
    const maxR = Math.hypot(width, height);

    let found: { x: number; y: number } | null = null;
    outer: for (let r = 0; r <= maxR; r += 1.5) {
      // 半径越大，每圈采样越多（保持密度均匀）
      const nSteps = Math.max(8, Math.ceil((2 * Math.PI * r) / 10));
      const stepTheta = (2 * Math.PI) / nSteps;
      for (let i = 0; i < nSteps; i++) {
        const x = cx0 + r * Math.cos(theta);
        const y = cy0 + r * Math.sin(theta);
        theta += stepTheta;

        // 边界检查
        if (x - bw / 2 < 0 || x + bw / 2 > width) continue;
        if (y - bh / 2 < 0 || y + bh / 2 > height) continue;

        // 碰撞检测
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

// 容器尺寸（由 ResizeObserver 实时更新；初始 0 时由 wordCloudLayout 提供默认值）
const wordCloudSize = ref<{ w: number; h: number }>({ w: 0, h: 0 });
let _wcResizeObserver: ResizeObserver | null = null;

// 词云最终布局：若尺寸未就绪，使用默认值（与 CSS 中 height: 360px 对齐，宽按容器估算）
const WORDCLOUD_DEFAULT_W = 600;
const WORDCLOUD_DEFAULT_H = 360;
const wordCloudLayout = computed<PlacedWord[]>(() => {
  const items = wordCloudItems.value;
  // 1) 完全没有数据
  if (items.length === 0) return [];
  // 2) 容器未挂载完成：使用默认尺寸
  const w = wordCloudSize.value.w > 0 ? wordCloudSize.value.w : WORDCLOUD_DEFAULT_W;
  const h = wordCloudSize.value.h > 0 ? wordCloudSize.value.h : WORDCLOUD_DEFAULT_H;
  return layoutWordCloud(
    items,
    w,
    h,
    WORDCLOUD_FONT_PRESETS[wordCloudFontSize.value]
  );
});

// 初始化图表
const initCharts = () => {
  // 防止重复 init：先 dispose 已存在的实例（折叠后再展开场景）
  if (statusChartRef.value) echarts.dispose(statusChartRef.value);
  if (trendChartRef.value) echarts.dispose(trendChartRef.value);
  if (priceCategoryChartRef.value) echarts.dispose(priceCategoryChartRef.value);
  if (discountChartRef.value) echarts.dispose(discountChartRef.value);
  if (bindingChartRef.value) echarts.dispose(bindingChartRef.value);
  if (bookmarkTrendChartRef.value) echarts.dispose(bookmarkTrendChartRef.value);
  if (priceTrendChartRef.value) echarts.dispose(priceTrendChartRef.value);
  priceCategoryChart.value = null;

  // 装帧分布（玫瑰图）— 藏书卡片图表
  if (bindingChartRef.value) {
    const palette = ['#ff6b35', '#4caf50', '#2196f3', '#9c27b0', '#ffc107'];
    const data = readingStats.value.bindingStats.map((b, i) => ({
      name: b.label,
      value: b.count,
      itemStyle: { color: palette[i % palette.length] }
    }));
    const chart = echarts.init(bindingChartRef.value);
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} 本 ({d}%)' },
      legend: { bottom: '5%', left: 'center', icon: 'circle' },
      series: [{
        type: 'pie',
        radius: ['25%', '70%'],
        center: ['50%', '45%'],
        roseType: 'radius',  // 玫瑰图：半径反映数量
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          formatter: '{b}\n{c|本} ',
          rich: { c: { color: '#666', fontSize: 10 } }
        },
        data
      }]
    });
  }

  // 月度书摘趋势（柱状图）— 书摘卡片图表
  if (bookmarkTrendChartRef.value) {
    const { months, counts, hasData } = bookmarkTrendStats.value;
    const chart = echarts.init(bookmarkTrendChartRef.value);
    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 30, left: 50, right: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: hasData ? months.map(m => m.slice(2)) : ['暂无数据'],
        axisLabel: { fontSize: 10, color: '#666' },
        axisLine: { lineStyle: { color: '#e0e0e0' } }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 10, color: '#666' },
        splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
      },
      series: [{
        type: 'bar',
        data: hasData ? counts : [0],
        barWidth: '55%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#4caf50' },
              { offset: 1, color: '#81c784' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: { show: true, position: 'top', fontSize: 10, color: '#666' }
      }]
    });
  }

  // 阅读状态分布图
  if (statusChartRef.value) {
    const chart = echarts.init(statusChartRef.value);
    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        bottom: '5%',
        left: 'center'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        data: [
          { value: readingStats.value.readBooks, name: '已读', itemStyle: { color: '#4caf50' } },
          { value: readingStats.value.readingBooks, name: '在读', itemStyle: { color: '#ff6b35' } },
          { value: readingStats.value.unreadBooks, name: '未读', itemStyle: { color: '#9e9e9e' } }
        ]
      }]
    });
  }

  // 月度趋势图
  if (trendChartRef.value) {
    const chart = echarts.init(trendChartRef.value);
    const { trendMonths, trendCounts } = readingStats.value;
    // 把 YYYY-MM 转成显示标签，如 "25-03月"
    const axisLabels = trendMonths.map(m => {
      const [y, mo] = m.split('-');
      return `${String(y).slice(-2)}-${mo}月`;
    });

    chart.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: axisLabels,
        axisLine: { lineStyle: { color: '#ddd' } },
        axisLabel: { color: '#666' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#666' },
        splitLine: { lineStyle: { color: '#f0f0f0' } }
      },
      series: [{
        data: trendCounts,
        type: 'line',
        smooth: true,
        itemStyle: { color: '#ff6b35' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 53, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 53, 0.05)' }
          ])
        }
      }]
    });
  }

  // 购书花费分类环形图（分组模式 or 标签模式）—— 初次初始化
  renderPriceCategoryChart(true);

  // 购书花费时间趋势（柱状/折线，可切换日/周/月/年）—— 初次初始化
  renderPriceTrendChart(true);

  // 藏书页面新增 4 个分布图 + 词云图（HTML/CSS 实现，无需 ECharts）
  renderBookTypeChart(true);
  renderPaperChart(true);
  renderEdgeChart(true);
  renderSourceChart(true);
  // 词云图：纯 HTML/CSS 实现，无需 ECharts 渲染

  // 已读完 - 阅读时间 Top N + 书摘 - 书摘数 Top N
  renderTopReadTimeChart(true);
  renderTopBookmarksChart(true);

  // 折扣对比环形图（外环标准价 + 内环实付价）
  if (discountChartRef.value) {
    const chart = echarts.init(discountChartRef.value);
    const { totalPaid, totalStandard, savings } = priceStats.value;

    // 外环：标准价（已购书的 standardPrice 之和）
    // 内环：实付价 + 节省 = 标准价
    const standardData = [
      { name: '实付', value: Math.round(totalPaid * 100) / 100, itemStyle: { color: '#ff6b35' } },
      { name: '省下', value: Math.round(savings * 100) / 100, itemStyle: { color: '#4caf50' } },
    ];

    // 内环：按载体类型再细分
    const { typeAgg } = priceStats.value;
    const innerData = [
      {
        name: '电子书实付',
        value: Math.round(typeAgg['电子书'].spent * 100) / 100,
        itemStyle: { color: '#66bb6a' }
      },
      {
        name: '纸质书实付',
        value: Math.round(typeAgg['纸质书'].spent * 100) / 100,
        itemStyle: { color: '#ff8a65' }
      },
    ].filter(d => d.value > 0);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}<br/>金额: ¥{c}<br/>占比: {d}%'
      },
      legend: {
        bottom: 10,
        left: 'center',
        textStyle: { fontSize: 12, color: '#666' }
      },
      title: {
        text: `实付占比\n${totalStandard > 0 ? Math.round((totalPaid / totalStandard) * 100) : 0}%`,
        left: '50%',
        top: '46%',
        textAlign: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          lineHeight: 20
        }
      },
      series: [
        {
          name: '外环(标准价)',
          type: 'pie',
          radius: ['52%', '72%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n¥{c}',
            fontSize: 11
          },
          data: standardData,
        },
        {
          name: '内环(实付构成)',
          type: 'pie',
          radius: ['24%', '44%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}\n¥{c}',
            fontSize: 10
          },
          data: innerData,
        }
      ]
    });
  }
};

// 单独渲染购书花费分类图表（供 initCharts 初次初始化 + watcher 模式切换复用）
function renderPriceCategoryChart(isInit: boolean) {
  if (!priceCategoryChartRef.value) return;

  const palette = ['#ff6b35', '#4caf50', '#2196f3', '#9c27b0', '#ffc107', '#e91e63', '#00bcd4', '#795548', '#607d8b', '#3f51b5', '#009688', '#cddc39', '#ff5722', '#673ab7'];
  const { groupAgg, tagAgg, typeAgg } = priceStats.value;
  const isTagMode = priceCategoryMode.value === 'tag';
  const sourceAgg = isTagMode ? tagAgg : groupAgg;
  const seriesName = isTagMode ? '按标签' : '按分组';
  const useUniqueCount = isTagMode;

  console.log('[购书花费分类] priceType=', priceType.value, 'mode=', priceCategoryMode.value, 'groupKeys=', Object.keys(sourceAgg), 'values=', Object.entries(sourceAgg).map(([, v]) => [(v as any).value, v.count]));
  // 按花费排序，取前 N 个，其他归入"其他"
  // 特殊处理：'未分组' 永远单独保留一个扇区（不并入"其他"），便于用户看到"未分组"书籍的占比和颜色
  // 标签模式下：优先按"关联书籍数量(count)"排序，相同时按花费值降序（替代之前按固定 ID 排序的逻辑）
  const sorted = Object.entries(sourceAgg)
    .map(([k, v]) => {
      const vAny = v as any;
      const count = useUniqueCount && vAny.bookIds ? vAny.bookIds.size : v.count;
      return {
        name: k,
        value: Math.round((vAny.value ?? 0) * 100) / 100,
        count,
      };
    })
    .sort((a, b) => {
      if (isTagMode) {
        // 标签模式：先按关联册数降序，再按金额降序，最后按名称升序保持稳定
        if (b.count !== a.count) return b.count - a.count;
        if (b.value !== a.value) return b.value - a.value;
        return a.name.localeCompare(b.name);
      }
      // 分组模式保持原来的按金额排序
      return b.value - a.value;
    });

  // 找出"未分组"项（始终保留为独立扇区）
  const unsortedIdx = sorted.findIndex(d => d.name === '未分组');
  let ungroupedItem: typeof sorted[number] | null = null;
  if (unsortedIdx !== -1) {
    ungroupedItem = sorted[unsortedIdx];
    sorted.splice(unsortedIdx, 1);
  }

  // 取前 N 个为 "top"，其余合并为 "其他"
  // 标签模式下 N 来自 getMaxTagCount()，分组模式下保持 7
  const topLimit = isTagMode ? getMaxTagCount() : 7;
  let top = sorted.slice(0, topLimit);
  const rest = sorted.slice(topLimit);
  if (rest.length > 0) {
    const sumRest = rest.reduce((s, x) => s + x.value, 0);
    const countRest = rest.reduce((s, x) => s + x.count, 0);
    top.push({ name: `其他(${rest.length}类)`, value: Math.round(sumRest * 100) / 100, count: countRest });
  }

  // 把 "未分组" 加到 top 末尾（若存在且有金额），保证它始终以独立色块显示
  if (ungroupedItem && ungroupedItem.value > 0) {
    top.push(ungroupedItem);
  }

  // 特定标签模式（仅标签模式生效）：
  // 1) 优先显示用户已选中的特定标签；
  // 2) 剩余额度从自动标签的 top 中按"关联书籍数量"从高到低补齐；
  // 3) 如果特定标签总数已超过 topLimit，则按选中顺序截断（已选最后覆盖最早被替换的"其他"项）。
  if (isTagMode && priceSpecificTagMode.value && priceSpecificTagSelected.value.length > 0) {
    const selectedSet = new Set(priceSpecificTagSelected.value);
    const specificItems: typeof top = [];
    for (const t of priceSpecificTagSelected.value) {
      // 在 sorted 找该标签的金额/册数
      const found = sorted.find(d => d.name === t);
      if (found) {
        specificItems.push({ ...found });
      } else {
        // 用户选中但当前数据中没找到（不该发生，但兜底）
        specificItems.push({ name: t, value: 0, count: 0 });
      }
    }
    // 加上 "未分组" 项（如果有金额）保留
    const ungroupedSelected: typeof top = [];
    if (ungroupedItem && ungroupedItem.value > 0 && !selectedSet.has('未分组')) {
      ungroupedSelected.push(ungroupedItem);
    }
    const usedSlots = specificItems.length + ungroupedSelected.length;
    const remainingSlots = Math.max(0, topLimit - usedSlots);
    // 剩余的普通标签：按"关联书籍数量"从高到低，剔除已选
    const usedNames = new Set([
      ...priceSpecificTagSelected.value,
      ...ungroupedSelected.map(x => x.name)
    ]);
    const autoFillItems = sorted
      .filter(d => !usedNames.has(d.name))
      .slice(0, remainingSlots);
    top = [...specificItems, ...autoFillItems, ...ungroupedSelected];
    // 不再追加"其他"（被特定模式接管显示）
  }

  // 外环：分组/标签（带色）
  const data = top
    .filter(d => d.value > 0)
    .map((d, i) => ({
      name: d.name,
      value: d.value,
      itemStyle: { color: palette[i % palette.length] },
    }));

  // 内环：电子/纸质载体
  const typeData = [
    {
      name: '电子书', value: Math.round(typeAgg['电子书'].spent * 100) / 100,
      itemStyle: { color: '#4caf50' }
    },
    {
      name: '纸质书', value: Math.round(typeAgg['纸质书'].spent * 100) / 100,
      itemStyle: { color: '#ff6b35' }
    },
  ].filter(d => d.value > 0);

  const countDesc = isTagMode ? '涉及册数' : '册数';

  const option = {
    color: palette, // 兜底全局色板
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        // 外环（按分组/标签）从 top 取；内环（按载体 电子书/纸质书）从 typeAgg 取，避免误显示 0 本
        const isInnerRing = params.seriesName === '按载体';
        const datum = top.find(d => d.name === params.name);
        const typeDatum = (typeAgg as any)?.[params.name];
        const count = isInnerRing
          ? (typeDatum?.count ?? 0)
          : (datum ? datum.count : 0);
        const valueText = isInnerRing
          ? `¥${Number(params.value).toFixed(2)}`
          : isTagMode && datum && datum.value < 10
            ? `¥${datum.value.toFixed(2)}（按标签分摊）`
            : datum
              ? `¥${datum.value.toFixed(2)}`
              : `¥${Number(params.value).toFixed(2)}`;
        return `${params.seriesName}<br/>${params.marker} ${params.name}<br/>花费: ${valueText}<br/>占比: ${params.percent}%<br/>${countDesc}: ${count}`;
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'middle',
      textStyle: { fontSize: 11, color: '#666' }
    },
    series: [
      {
        name: '按载体',
        type: 'pie',
        radius: ['0%', '38%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: typeData,
      },
      {
        name: seriesName,
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['38%', '50%'],
        // 不再使用 roseType:'radius'（按数值映射半径导致极小占比扇区几乎不可见、颜色被吞掉）
        // 改用普通环形图 + minAngle/minShowLabelAngle 来保证所有分类（包括"未分组"）的色块都可见
        minAngle: 8,
        minShowLabelAngle: 0,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n¥{c|{c}}',
          rich: { c: { color: '#333', fontSize: 10, fontWeight: 600 } }
        },
        labelLine: { length: 8, length2: 8 },
        data: data,
      }
    ]
  };

  if (isInit) {
    // 首次初始化：清理可能残留的实例（HMR 友好）
    const existing = echarts.getInstanceByDom(priceCategoryChartRef.value);
    if (existing) existing.dispose();
    // markRaw: 让 echarts 实例脱离 Vue 响应式代理，避免内部大量属性被代理导致性能/渲染异常
    priceCategoryChart.value = markRaw(echarts.init(priceCategoryChartRef.value));
    try {
      priceCategoryChart.value.setOption(option, true);
    } catch (e) {
      console.error('[购书花费分类] setOption error:', e);
    }
    // 等待 DOM 完成布局后再 resize，避免容器尺寸为 0 导致渲染异常
    nextTick(() => priceCategoryChart.value && priceCategoryChart.value.resize());
  } else if (priceCategoryChart.value) {
    // 模式切换：setOption 不合并，强制替换
    try {
      priceCategoryChart.value.setOption(option, true);
    } catch (e) {
      console.error('[购书花费分类] setOption error:', e);
    }
  }
}

// 组件挂载时初始化图表
onMounted(async () => {
  // 先加载分组列表，建立 ID -> 名称 映射后再初始化图表
  try {
    groups.value = await bookService.getAllGroups();
    console.log('[购书花费分类] loaded groups=', groups.value.map(g => ({ id: g.id, name: g.name })));
  } catch (e) {
    console.error('[购书花费分类] 加载分组失败:', e);
  }
  // 默认不显示图表（activeChart = null）；点击 stat-card 后才初始化
  // 点击事件触发 activeChart 变化，watch 会调用 initCharts
  // 注册全局点击监听：点击非设置按钮 / 非下拉时关闭下拉
  document.addEventListener('click', handleOutsideClick);
});

// 监听"全部图表"卡片切换：折叠→展开时按需初始化图表；展开→折叠时销毁图表避免资源浪费
// 监听 activeChart 切换图表：false→true 时按需初始化图表；true→false 时销毁
watch(activeChart, async (v) => {
  await nextTick();
  if (v) {
    initCharts();
  } else {
    disposeAllCharts();
  }
});

// 当分类模式切换时，重新渲染购书花费分类图表
watch(priceCategoryMode, async () => {
  await nextTick();
  // 仅刷新购书花费分类图，不影响其他图表
  renderPriceCategoryChart(false);
});

// 当价格口径切换时，重新渲染购书花费分类图表
watch(priceType, async () => {
  await nextTick();
  renderPriceCategoryChart(false);
  // 价格口径同时影响时间趋势图，需同步刷新
  renderPriceTrendChart(false);
});

// 时间粒度切换时，刷新时间趋势图
watch(priceTrendGranularity, async () => {
  await nextTick();
  renderPriceTrendChart(false);
});
watch(priceTrendChartType, async () => {
  await nextTick();
  renderPriceTrendChart(false);
});
// 柱状图网格线显示设置变化时重渲染
watch(priceTrendShowGridLines, async () => {
  await nextTick();
  renderPriceTrendChart(false);
});

// 词云图改为响应式 computed（topN / 字号预设 / 时间范围变更会自动重算），无需 watch 触发 ECharts 重渲染
// 字号预设变更时 Vue 模板自动响应，无须手动触发刷新

// Top 排行榜 - 显示数量变化时重渲染
watch(topReadTimeN, async () => {
  await nextTick();
  renderTopReadTimeChart(false);
});
watch(topBookmarksN, async () => {
  await nextTick();
  renderTopBookmarksChart(false);
});

// 窗口尺寸变化时，重新渲染带封面叠层的 Top 图（保持封面位置跟随 yAxis 像素）
let resizeTimer: number | null = null;
function onWindowResize() {
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    renderTopReadTimeChart(false);
    renderTopBookmarksChart(false);
  }, 150);
}
onMounted(() => {
  window.addEventListener('resize', onWindowResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
  if (resizeTimer) window.clearTimeout(resizeTimer);
  if (_wcResizeObserver) {
    _wcResizeObserver.disconnect();
    _wcResizeObserver = null;
  }
});

// 词云图：监听容器 ref 变化（卡片可能因 v-if 反复挂载），按需挂载/卸载 ResizeObserver
watch(wordCloudRef, (el, _oldEl, onCleanup) => {
  // 释放旧的
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
    // 元素被卸载时重置 size，让 layout 走默认占位
    wordCloudSize.value = { w: 0, h: 0 };
  }
}, { flush: 'post' });

// 当"标签数量"或"特定标签模式"或"特定标签选择"变化时，重新渲染购书花费分类图表
watch([priceTagCountPreset, priceTagCustomCount, priceSpecificTagMode, priceSpecificTagSelected], async () => {
  if (priceCategoryMode.value !== 'tag') return;
  await nextTick();
  renderPriceCategoryChart(false);
}, { deep: true });

// 时间范围变化时，重渲染所有图表
watch(globalTimeRange, async () => {
  await nextTick();
  initCharts();
});

// 自定义日期变化时（仅在 custom 模式下），重渲染图表
watch([customStartDate, customEndDate], async () => {
  if (globalTimeRange.value === 'custom') {
    await nextTick();
    initCharts();
  }
});

// 当 bookStore 中书籍的阅读时长/次数等更新时，刷新依赖这些字段的图表
// 修复：阅读结束后 bookStore.total_reading_time 实时同步，统计页 Top 图表需同步重渲染
watch(
  () => bookStore.allBooks.map((b: any) => `${b.id}:${b.total_reading_time || 0}:${b.reading_count || 0}`).join('|'),
  async () => {
    await nextTick();
    // 阅读时长 TOP 图表：核心修复目标
    if (topReadTimeChartRef.value) renderTopReadTimeChart(false);
  }
);

// watchEffect 自动追踪 priceStats 内的所有依赖（groupAgg/tagAgg 内任何字段变化都会触发）
watchEffect(() => {
  // 读取 groupIdToName / groupAgg / tagAgg 以建立追踪
  void groupIdToName.value; // 分组加载完成后会自动重渲染
  const { groupAgg, tagAgg } = priceStats.value;
  // 深度读取以触发 deep tracking
  for (const k in groupAgg) { void groupAgg[k].spent; }
  for (const k in tagAgg) { void tagAgg[k].spent; }
  // 仅在已初始化后刷新
  if (priceCategoryChart.value) {
    renderPriceCategoryChart(false);
  }
});

// 组件卸载时销毁图表
onUnmounted(() => {
  disposeAllCharts();
  document.removeEventListener('click', handleOutsideClick);
});

// 销毁全部图表实例（折叠时主动释放资源）
function disposeAllCharts() {
  if (statusChartRef.value) echarts.dispose(statusChartRef.value);
  if (trendChartRef.value) echarts.dispose(trendChartRef.value);
  if (priceCategoryChartRef.value) echarts.dispose(priceCategoryChartRef.value);
  if (discountChartRef.value) echarts.dispose(discountChartRef.value);
  if (bindingChartRef.value) echarts.dispose(bindingChartRef.value);
  if (bookmarkTrendChartRef.value) echarts.dispose(bookmarkTrendChartRef.value);
  if (priceTrendChartRef.value) echarts.dispose(priceTrendChartRef.value);
  // 藏书页新增的 4 个分布图（词云图为纯 HTML/CSS，无 ECharts 实例需释放）
  if (bookTypeChartRef.value) echarts.dispose(bookTypeChartRef.value);
  if (paperChartRef.value) echarts.dispose(paperChartRef.value);
  if (edgeChartRef.value) echarts.dispose(edgeChartRef.value);
  if (sourceChartRef.value) echarts.dispose(sourceChartRef.value);
  // 已读完 Top 阅读时间 + 书摘 Top 书摘数
  if (topReadTimeChartRef.value) echarts.dispose(topReadTimeChartRef.value);
  if (topBookmarksChartRef.value) echarts.dispose(topBookmarksChartRef.value);
  priceCategoryChart.value = null;
}

// 通用：把分钟数格式化为 "Xh Ym"
function formatMinutes(min: number): string {
  if (!min || isNaN(min)) return '0m';
  const total = Math.max(0, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// 通用：在 Top N 横向柱状图上叠加封面图层
//   - rows：排序后的书籍列表（按 yAxis 类别顺序，最右上一项在 sorted[0]）
//   - 注意：ECharts 的 yAxis category 第 0 项在底部，所以调用方应把最大数值的项放在数组末尾
function attachCoverOverlay(chart: any, rows: any[]) {
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

// 已读完 - 阅读时间最多 Top N（横向柱状图 + 封面）
function renderTopReadTimeChart(forceRecreate = false) {
  if (!topReadTimeChartRef.value) return;
  // 修复：阅读时间最多 Top N 是"全量总排行"，不应被 filterBooksByTimeRange 过滤。
  // 之前用 createTime/purchaseDate 过滤会漏掉"未填购买日期"或"字段缺失"的书，
  // 导致短时长（2 分钟）刚读的书被错误排除。
  const ranked = bookStore.allBooks
    .filter((b: any) => {
      // 任何阅读时长 > 0 的书都参与排行（含在读 / 已读 / 状态未设置等）
      // 兜底：如果 total_reading_time 缺失但 reading_count > 0，也保留（防止老数据字段未填）
      const time = Number(b.total_reading_time) || 0;
      const count = Number(b.reading_count) || 0;
      return time > 0 || count > 0;
    })
    .map((b: any) => ({
      ...b,
      // 排序键：使用 max(total_reading_time, reading_count * 1) 兜底
      _sortTime: Number(b.total_reading_time) || 0
    }))
    .sort((a: any, b: any) => b._sortTime - a._sortTime)
    .slice(0, topReadTimeN.value);

  let chart = echarts.getInstanceByDom(topReadTimeChartRef.value) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(topReadTimeChartRef.value);
    chart = markRaw(echarts.init(topReadTimeChartRef.value));
  }
  if (ranked.length === 0) {
    chart.clear();
    chart.setOption({
      title: { text: '暂无阅读时长数据', left: 'center', top: 'middle', textStyle: { color: '#999' } }
    });
    return;
  }
  // ECharts 横向柱状图 category 第 0 项在底部 → 升序传入，最大值在最上面
  const sorted = [...ranked].sort((a: any, b: any) => (a.total_reading_time || 0) - (b.total_reading_time || 0));
  const labels = sorted.map((b: any) => b.title || '未命名');
  const minutes = sorted.map((b: any) => Math.round(b.total_reading_time || 0));

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const idx = params[0]?.dataIndex ?? 0;
        const book = sorted[idx];
        if (!book) return '';
        return `<b>${book.title || '未命名'}</b><br/>` +
          `作者: ${book.author || '—'}<br/>` +
          `阅读时长: <b>${formatMinutes(book.total_reading_time || 0)}</b><br/>` +
          `阅读次数: ${book.reading_count || 0} 次`;
      }
    },
    grid: { left: 110, right: 90, top: 20, bottom: 30, containLabel: false },
    xAxis: { type: 'value', name: '分钟', nameTextStyle: { color: '#999' } },
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: { show: false }
    },
    series: [{
      type: 'bar',
      data: minutes,
      barWidth: 18,
      itemStyle: { color: '#4caf50', borderRadius: [0, 4, 4, 0] },
      label: {
        show: true,
        position: 'right',
        formatter: (p: any) => formatMinutes(p.value)
      }
    }]
  });

  // 封面叠层
  chart.setOption({ graphic: [] } as any); // 先清掉旧 graphic
  attachCoverOverlay(chart, sorted);
}

// 已读完 / 书摘 - 书摘最多 Top N（横向柱状图 + 封面）
function renderTopBookmarksChart(forceRecreate = false) {
  if (!topBookmarksChartRef.value) return;
  const books = filterBooksByTimeRange(bookStore.allBooks);
  const countMap = new Map<number, number>();
  for (const bm of bookmarkStore.allBookmarks as any[]) {
    const bid = (bm as any).bookId ?? (bm as any).book_id;
    if (bid == null) continue;
    countMap.set(bid, (countMap.get(bid) || 0) + 1);
  }
  const ranked = books
    .map((b: any) => ({ ...b, _bmCount: countMap.get(b.id) || 0 }))
    .filter((b: any) => b._bmCount > 0)
    .sort((a: any, b: any) => b._bmCount - a._bmCount)
    .slice(0, topBookmarksN.value);

  let chart = echarts.getInstanceByDom(topBookmarksChartRef.value) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(topBookmarksChartRef.value);
    chart = markRaw(echarts.init(topBookmarksChartRef.value));
  }
  if (ranked.length === 0) {
    chart.clear();
    chart.setOption({
      title: { text: '暂无书摘数据', left: 'center', top: 'middle', textStyle: { color: '#999' } }
    });
    return;
  }
  const sorted = [...ranked].sort((a: any, b: any) => a._bmCount - b._bmCount);
  const labels = sorted.map((b: any) => b.title || '未命名');
  const counts = sorted.map((b: any) => b._bmCount);

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const idx = params[0]?.dataIndex ?? 0;
        const book = sorted[idx];
        if (!book) return '';
        return `<b>${book.title || '未命名'}</b><br/>` +
          `作者: ${book.author || '—'}<br/>` +
          `书摘数: <b>${book._bmCount}</b> 条`;
      }
    },
    grid: { left: 110, right: 80, top: 20, bottom: 30, containLabel: false },
    xAxis: { type: 'value', name: '条', nameTextStyle: { color: '#999' } },
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: { show: false }
    },
    series: [{
      type: 'bar',
      data: counts,
      barWidth: 18,
      itemStyle: { color: '#ff9800', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: '{c} 条' }
    }]
  });

  chart.setOption({ graphic: [] } as any);
  attachCoverOverlay(chart, sorted);
}
</script>

<style scoped lang="scss">
.stats-page {
  width: 100%;
  padding: 16px;
  background-color: var(--bg-primary);
  /* 卡片透明度变量（0-1），由 cardOpacity 控制 */
  --card-opacity: 1;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

@media (min-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1100px) {
  .stats-overview {
    grid-template-columns: repeat(6, 1fr);
  }
}

.stat-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

/* 第 6 张：图表视图触发卡片 */
.stat-card--toggle {
  cursor: pointer;
  user-select: none;
  border: 1px dashed transparent;
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(255, 107, 53, 0.05) 100%);

  &.is-active {
    border-color: #ff6b35;
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.12) 0%, rgba(255, 107, 53, 0.04) 100%);
  }

  &:focus-visible {
    outline: 2px solid #ff6b35;
    outline-offset: 2px;
  }
}

/* 卡片底部扩展信息（装帧分布 / 阅读状态分布 / 提示语） */
.stat-extra {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.stat-extra--hint {
  font-size: 11px;
  color: #ff6b35;
  font-weight: 500;
}

.stat-extra-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  white-space: nowrap;

  em {
    font-style: normal;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.stat-extra--status .stat-extra-chip em {
  /* 让数字有视觉强调 */
  margin-left: 1px;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* 价格口径旁的"排除 0 元"复选框 */
.exclude-zero-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  margin-left: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 107, 53, 0.08);
  }

  input[type='checkbox'] {
    margin: 0;
    cursor: pointer;
    accent-color: #ff6b35;
  }
}

/* 全部图表区域：默认有适度上间距 */
.all-charts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

/* 合并卡：标准总价 / 购书花费 */
.stat-value--dual {
  font-size: 18px;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  line-height: 1.1;
}

.dual-part {
  display: inline-flex;
  align-items: baseline;
  color: #9c27b0;  /* 紫色 = 标准价 */
}
.dual-part--alt {
  color: #ff6b35;  /* 橙色 = 实付价 */
}

.dual-currency {
  font-size: 12px;
  margin-right: 1px;
  opacity: 0.85;
}

.dual-divider {
  color: #ccc;
  font-weight: 400;
  margin: 0 2px;
}

.stat-extra-chip--paid em { color: #ff6b35; }
.stat-extra-chip--saved em { color: #4caf50; }

.stat-label {
  font-size: 13px;
  color: var(--text-hint);
  margin-top: 4px;
}

.card {
  /* 背景透明度由用户通过设置滑块控制（0-1） */
  background-color: rgba(255, 255, 255, var(--card-opacity, 1));
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  /* 堆叠设置面板的定位锚点（让浮层充满卡片） */
  position: relative;
  overflow: hidden;
  transition: background-color 0.15s ease;
}

.card-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header--with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

/* 图表右上角设置按钮 + 下拉菜单 */
.card-header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chart-settings-btn {
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 8px;
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 107, 53, 0.08);
    color: #ff6b35;
    border-color: rgba(255, 107, 53, 0.2);
  }

  &.is-open {
    background: #ff6b35;
    color: #fff;
    border-color: #ff6b35;
  }
}

.chart-settings-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 100;
  min-width: 220px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-primary);
  text-align: left;

  .dark & {
    background: #2a2a2a;
    border-color: #3a3a3a;
  }
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;

  & + .settings-section {
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding-top: 10px;
    margin-top: 4px;
  }
}

.settings-section-title {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.settings-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 自定义时间范围：两个日期输入 */
.settings-custom-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
}

.settings-date-input {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary);
  background: #fff;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #ff6b35;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.15);
  }
}

.settings-range-sep {
  color: var(--text-secondary);
  font-size: 12px;
}

.settings-opt {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: #ff6b35;
    background: rgba(255, 107, 53, 0.08);
  }

  &.active {
    background: #ff6b35;
    color: #fff;
    border-color: #ff6b35;
  }
}

.settings-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: #ff6b35;
  }
}

/* 数据表格设置中的复选框行 */
.settings-checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
  padding: 4px 0;

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: #ff6b35;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}

.settings-checkbox-label {
  flex: 1;
  line-height: 1.4;
}

/* 卡片透明度滑块 */
.settings-section-value {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.settings-range-slider {
  width: 100%;
  height: 4px;
  background: linear-gradient(to right, #ff6b35 0%, #ff6b35 var(--slider-progress, 100%), #e8e8e8 var(--slider-progress, 100%), #e8e8e8 100%);
  border-radius: 2px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  margin: 6px 0 4px 0;

  &::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff6b35;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 6px rgba(255, 107, 53, 0.4);
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff6b35;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    cursor: pointer;
  }
}

.settings-range-hint {
  font-size: 11px;
  color: var(--text-tertiary, #999);
  line-height: 1.5;
  margin-top: 4px;
}

/* 特定标签模式：搜索 + 候选 + 已选 */
.specific-tag-block {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .settings-date-input {
    width: 100%;
  }
}
.specific-tag-candidates,
.specific-tag-selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.specific-tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 14px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.15s ease;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover:not(.disabled) {
    background-color: var(--primary-light, #fff1e8);
    border-color: var(--primary-color, #ff6b35);
    color: var(--primary-color, #ff6b35);
  }

  &.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}
.specific-tag-chip--selected {
  background-color: #ff6b35;
  border-color: #ff6b35;
  color: #fff;

  &:hover {
    background-color: #e85a2b !important;
    border-color: #e85a2b !important;
    color: #fff !important;
  }
}
.specific-tag-selected-label {
  font-size: 12px;
  color: var(--text-secondary, #666);
}
.specific-tag-empty {
  font-size: 12px;
  color: var(--text-tertiary, #999);
  padding: 4px 0;
}
.specific-tag-hint {
  font-size: 11px;
  color: var(--text-tertiary, #999);
  line-height: 1.5;
  padding: 6px 8px;
  background-color: var(--bg-secondary, #f9f9f9);
  border-radius: 4px;
}

/* 模式切换按钮（分组 / 标签） */
.mode-switch {
  display: inline-flex;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 3px;
  border: 1px solid #e8e8e8;
}

.mode-switch--price {
  margin-left: auto;
}

.mode-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;

  &:hover:not(.active) {
    color: #ff6b35;
    background-color: rgba(255, 107, 53, 0.08);
  }

  &.active {
    background-color: #ff6b35;
    color: #fff;
    box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
  }
}

.mode-icon {
  width: 14px;
  height: 14px;
}

/* 模式说明提示 */
.mode-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background-color: rgba(255, 107, 53, 0.06);
  border-left: 3px solid #ff6b35;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.mode-hint-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.card-title-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.card-title-tag--book     { background: linear-gradient(135deg, #ff6b35, #ff9558); }
.card-title-tag--read     { background: linear-gradient(135deg, #4caf50, #6fbf73); }
.card-title-tag--bookmark { background: linear-gradient(135deg, #2196f3, #42a5f5); }
.card-title-tag--price    { background: linear-gradient(135deg, #9c27b0, #ba68c8); }

.card-title-sep {
  color: #ccc;
  font-weight: 400;
  margin: 0 2px;
}

.chart-container {
  width: 100%;
  height: 250px;
  /* 防止图表在某些情况下被容器裁切 */
  min-height: 0;
  position: relative;
}

.chart-container--tall {
  height: 320px;
}

/* 词云图：螺旋布局 + 旋转 + 碰撞检测（矩形画布） */
.wordcloud-container {
  position: relative;
  width: 100%;
  height: 360px;
  overflow: hidden;
  border-radius: 12px;
  background:
    radial-gradient(ellipse at center, rgba(255, 247, 240, 0.4) 0%, transparent 70%),
    linear-gradient(135deg, #fffaf5 0%, #fafbff 50%, #f5fff8 100%);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
}
.wordcloud-item {
  position: absolute;
  left: 0;
  top: 0;
  display: inline-block;
  line-height: 1.15;
  padding: 2px 4px;
  white-space: nowrap;
  cursor: default;
  user-select: none;
  transform-origin: center center;
  /* 阴影让旋转/堆叠的词条更具层次感 */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  transition: filter 0.2s ease, opacity 0.2s ease;
  will-change: transform;
  pointer-events: auto;
}
.wordcloud-item:hover {
  filter: brightness(1.1) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.2));
  opacity: 0.95;
  z-index: 9999 !important;
}
.wordcloud-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #999;
  font-size: 14px;
  padding: 16px;
  text-align: center;
}
.wordcloud-empty-title { font-size: 14px; color: #888; }
.wordcloud-empty-hint { font-size: 12px; color: #b5b5b5; }
@media (max-width: 600px) {
  .wordcloud-container { height: 300px; }
}
@media (max-width: 400px) {
  .wordcloud-container { height: 260px; }
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-hint);
  margin-left: 8px;
  font-weight: normal;
}

.price-charts-row {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.price-chart-col {
  flex: 1;
  min-width: 0;
}

.discount-summary {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(76, 175, 80, 0.05));
  border-radius: var(--radius-md);
  height: 100%;
}

.summary-item {
  padding: 10px 12px;
  background: var(--bg-card);
  border-radius: 8px;
  border-left: 3px solid #ff6b35;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.summary-item--paid {
  border-left-color: #ff6b35;
}

.summary-item--saved {
  border-left-color: #4caf50;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(76, 175, 80, 0.02));
}

.summary-label {
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-percent {
  font-size: 11px;
  color: #4caf50;
  margin-top: 2px;
  font-weight: 600;
}

@media (max-width: 600px) {
  .price-charts-row {
    flex-direction: column;
  }
  .card {
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 10px;
  }
  .card-title {
    font-size: 13px;
  }
  .card-subtitle {
    font-size: 11px;
  }
  .stats-page {
    padding: 6px;
  }
  /* 图表设置按钮在小屏下保留 32x32 触摸区 */
  .chart-settings-btn {
    width: 30px;
    height: 30px;
  }
  /* 移动端统一卡片宽度与图表尺寸，确保排列整齐 */
  .all-charts-wrapper {
    gap: 10px;
  }
  .all-charts-wrapper > .card {
    width: 100%;
    box-sizing: border-box;
  }
  /* 图表容器：紧凑高度，确保小屏能显示更多内容 */
  .chart-container {
    height: 240px;
  }
  .chart-container--tall {
    height: 280px;
  }
  /* 概览卡片网格在小屏下保持 2 列一致尺寸 */
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .stat-card {
    padding: 10px 6px;
  }
  .stat-icon {
    font-size: 22px;
    margin-bottom: 4px;
  }
  .stat-value {
    font-size: 16px;
  }
  .stat-value--dual {
    font-size: 12px;
  }
  .stat-label {
    font-size: 10px;
  }
}

@media (max-width: 400px) {
  /* 极窄屏：把卡片标题行允许换行，避免挤压 */
  .card-header {
    flex-wrap: wrap;
    gap: 6px;
  }
  .card-header-actions {
    margin-left: auto;
  }
  /* 极窄屏：图表更紧凑 */
  .chart-container {
    height: 220px;
  }
  .chart-container--tall {
    height: 260px;
  }
  .stat-value {
    font-size: 15px;
  }
  .stat-value--dual {
    font-size: 11px;
  }
  /* 小卡片标题字号调整，避免折行突兀 */
  .card-title-tag {
    font-size: 11px;
  }
  .card-title-sep {
    margin: 0 4px;
  }
  .card {
    padding: 8px;
  }
}
</style>
