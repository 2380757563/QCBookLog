<template>
  <div class="doulist-panel">
    <!-- 工具条 -->
    <div class="panel-toolbar">
      <div class="panel-toolbar__row">
        <!-- 分类：购书清单 / 阅读清单 -->
        <div class="seg-group">
          <button
            v-for="tab in categoryTabs"
            :key="tab.value"
            :class="['seg-btn', { active: filterCategory === tab.value }]"
            @click="setCategory(tab.value)"
          >{{ tab.label }}</button>
        </div>
      </div>

      <!-- 选中具体书单时的书单操作 -->
      <div v-if="selectedImport" class="panel-toolbar__row panel-toolbar__sub">
        <span class="sub-label">书单分类</span>
        <div class="seg-group seg-group--sm">
          <button
            :class="['seg-btn', { active: selectedImport.is_buy === 1 }]"
            @click="toggleDoulistFlag('is_buy')"
          >购书清单</button>
          <button
            :class="['seg-btn', { active: selectedImport.is_read === 1 }]"
            @click="toggleDoulistFlag('is_read')"
          >阅读清单</button>
        </div>
        <span class="toolbar-spacer"></span>
        <button
          v-if="isDoubanDoulist"
          class="tool-btn"
          :disabled="refreshing"
          @click="openRefreshDialog"
        >⟳ 刷新豆列</button>
      </div>

      <!-- 添加 / 导入豆列：添加在书单详情页也可用；导入仅主书单视图显示 -->
      <div class="panel-toolbar__actions">
        <button class="tool-btn" @click="openAddDialog">＋ 从书库添加</button>
        <button v-if="!filterDoulistId" class="tool-btn tool-btn--primary" @click="goImport">导入豆列</button>
        <button
          v-if="books.length"
          :class="['tool-btn', { 'tool-btn--active': selectMode }]"
          @click="toggleSelectMode"
        >{{ selectMode ? '退出多选' : '多选' }}</button>
      </div>

      <!-- 多选批量操作条 -->
      <div v-if="selectMode" class="batch-bar">
        <span class="batch-bar__count">已选 {{ selectedCount }} 本</span>
        <button class="ds-mini" @click="selectAllVisible">全选</button>
        <button class="ds-mini" @click="invertSelect">反选</button>
        <button class="ds-mini" @click="clearSelection">清空</button>
        <span class="toolbar-spacer"></span>
        <button class="tool-btn tool-btn--danger" :disabled="!selectedCount || batchRunning" @click="batchStrike">
          {{ batchRunning ? '处理中...' : '批量划去' }}
        </button>
        <button class="tool-btn tool-btn--primary" :disabled="!selectedCount" @click="batchShelve">
          批量加入书架
        </button>
      </div>
    </div>

    <!-- 面包屑（文件夹 → 书单内） -->
    <div v-if="filterDoulistId" class="breadcrumb-nav">
      <span class="breadcrumb-item" @click="backToFolders">全部书单</span>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item breadcrumb-item--current">
        {{ selectedImport?.doulist_title || filterDoulistId }}
      </span>
    </div>

    <!-- 书单内：购书 / 阅读进度条 -->
    <div
      v-if="filterDoulistId && selectedImport && (selectedImport.is_buy === 1 || selectedImport.is_read === 1)"
      class="doulist-progress"
    >
      <div v-if="selectedImport.is_buy === 1" class="dp-row">
        <span class="dp-label">已购买</span>
        <div class="dp-track">
          <div class="dp-fill dp-fill--buy" :style="{ width: pctOf(selectedImport.buy_done, selectedImport.buy_total) + '%' }"></div>
        </div>
        <span class="dp-count">{{ selectedImport.buy_done }}/{{ selectedImport.buy_total }}</span>
      </div>
      <div v-if="selectedImport.is_read === 1" class="dp-row">
        <span class="dp-label">已阅读</span>
        <div class="dp-track">
          <div class="dp-fill dp-fill--read" :style="{ width: pctOf(selectedImport.read_done, selectedImport.read_total) + '%' }"></div>
        </div>
        <span class="dp-count">{{ selectedImport.read_done }}/{{ selectedImport.read_total }}</span>
      </div>
    </div>

    <!-- 文件夹视图：全部书单且无搜索关键字 -->
    <div v-if="showFolders" class="folders-grid">
      <div
        v-for="imp in visibleImports"
        :key="imp.doulist_id"
        class="folder-card"
        @click="openFolder(imp)"
      >
        <!-- 2x2 封面缩略图（3:4，与书库分组卡同款结构） -->
        <div class="folder-card__thumbs">
          <div class="folder-card__thumbs-grid">
            <div v-for="(c, idx) in folderCovers(imp)" :key="idx" class="folder-card__thumb">
              <img :src="doubanCoverProxy(c)" class="thumb__image" loading="lazy" decoding="async" />
            </div>
            <div
              v-for="i in Math.max(0, 4 - folderCovers(imp).length)"
              :key="`p-${i}`"
              class="folder-card__thumb folder-card__thumb--empty"
            ></div>
          </div>
        </div>
        <!-- 名称行 -->
        <div class="folder-card__info">
          <span v-if="isDoubanId(imp.doulist_id)" class="dou-badge">豆</span>
          <span class="folder-card__name">{{ imp.doulist_title || `书单 ${imp.doulist_id}` }}</span>
        </div>
        <!-- 购书 / 阅读进度条 -->
        <div v-if="imp.is_buy === 1 || imp.is_read === 1" class="folder-card__progress">
          <div v-if="imp.is_buy === 1" class="fp-row">
            <span class="fp-label fp-label--buy">购</span>
            <div class="fp-track">
              <div class="fp-fill fp-fill--buy" :style="{ width: pctOf(imp.buy_done, imp.buy_total) + '%' }"></div>
            </div>
            <span class="fp-text">{{ imp.buy_done }}/{{ imp.buy_total }}</span>
          </div>
          <div v-if="imp.is_read === 1" class="fp-row">
            <span class="fp-label fp-label--read">读</span>
            <div class="fp-track">
              <div class="fp-fill fp-fill--read" :style="{ width: pctOf(imp.read_done, imp.read_total) + '%' }"></div>
            </div>
            <span class="fp-text">{{ imp.read_done }}/{{ imp.read_total }}</span>
          </div>
        </div>
        <!-- 双分类角标 -->
        <div class="folder-card__cats">
          <span v-if="imp.is_buy === 1" class="folder-card__cat folder-card__cat--buy">购书</span>
          <span v-if="imp.is_read === 1" class="folder-card__cat folder-card__cat--read">阅读</span>
        </div>
        <!-- 数量角标（有奖章时下移避让） -->
        <div class="folder-card__count" :class="{ 'folder-card__count--medal': isMedaled(imp) }">
          <span class="count-number">{{ imp.item_count }}</span>
          <span class="count-label">本</span>
        </div>
        <!-- 完成奖章：勾选的分类各自进度 100% 时显示在右上角 -->
        <img v-if="isMedaled(imp)" :src="medalImg" class="folder-card__medal" alt="已完成" />
      </div>

      <div v-if="visibleImports.length === 0 && !loading" class="empty-text">
        还没有书单，可从豆瓣豆列导入，或点「+ 添加」手动创建
      </div>
    </div>

    <!-- 书单内 / 搜索结果：书籍列表 -->
    <template v-else>
      <div v-if="loading && books.length === 0" class="empty-text">加载中...</div>
      <div v-else-if="books.length === 0" class="empty-text">
        {{ keyword ? '没有找到相关书籍' : '该书单还是空的，可以在书单页点「⟳ 刷新豆列」补充新书' }}
      </div>

      <div v-else class="book-list">
        <template v-for="book in books" :key="book.douban_id">
          <!-- 已加入书架：划线折叠成一行（左滑恢复显示；「撤回」按钮保留） -->
          <div v-if="book.shelf_status === 'shelf'" class="swipe-wrap">
            <div
              v-if="swipeGesture && swipeBgText(book)"
              :class="swipeBgClass(book)"
              :style="swipeBgStyle(book)"
            >
              <span class="swipe-bg__text">{{ swipeBgText(book) }}</span>
            </div>
            <div
              class="book-card book-card--shelved"
              :style="swipeCardStyle(book)"
              @click="handleCardClick(book)"
              @touchstart="onCardTouchStart(book, $event)"
              @touchmove="onCardTouchMove(book, $event)"
              @touchend="onCardTouchEnd(book)"
              @touchcancel="onCardTouchEnd(book)"
            >
            <div class="shelved-row">
              <label v-if="selectMode" class="card-check" @click.stop>
                <input type="checkbox" :checked="isSelected(book)" @change="toggleSelect(book)" />
              </label>
              <span class="doulist-tag">
                <span v-if="book.doulist_id" class="dou-badge">豆</span>
                {{ book.doulist_title || '未分组' }}
              </span>
              <span class="shelved-title">{{ book.title || `豆瓣 ${book.douban_id}` }}</span>
              <span v-if="book.rating" class="shelved-rating">{{ book.rating.toFixed(1) }}</span>
              <span v-if="book.shelved_at" class="shelved-date">{{ book.shelved_at.slice(0, 10) }} 入架</span>
              <button class="btn-undo" @click.stop="setShelf(book, 'pending')">撤回</button>
            </div>
            </div>
          </div>

          <!-- 未入书架：完整卡片（右滑划掉此列 / 左滑加入书架，按钮与手势并存） -->
          <div v-else class="swipe-wrap">
            <!-- 滑动露出的底色块：右滑左侧红色「划掉此列」/ 左滑右侧橙色「加入书架」，随划动由微弱到明显 -->
            <div
              v-if="swipeGesture && swipeBgText(book)"
              :class="swipeBgClass(book)"
              :style="swipeBgStyle(book)"
            >
              <span class="swipe-bg__text">{{ swipeBgText(book) }}</span>
            </div>
            <div
              class="book-card book-card--swipeable"
              :style="swipeCardStyle(book)"
              @click="handleCardClick(book)"
              @touchstart="onCardTouchStart(book, $event)"
              @touchmove="onCardTouchMove(book, $event)"
              @touchend="onCardTouchEnd(book)"
              @touchcancel="onCardTouchEnd(book)"
            >
              <!-- 删除线（仅右滑出现，随划动从微弱到明显，划回原位消失） -->
              <label v-if="selectMode" class="card-check" @click.stop>
                <input type="checkbox" :checked="isSelected(book)" @change="toggleSelect(book)" />
              </label>
              <div v-if="swipeGesture && swipeDx(book) > 0" class="swipe-strike-line" :style="swipeStrikeStyle(book)"></div>
            <img v-if="book.cover_url" :src="doubanCoverProxy(book.cover_url)" class="cover" loading="lazy" />
            <div v-else class="cover cover--empty">无封面</div>
            <div class="info">
              <div class="doulist-tag">
                <span v-if="book.doulist_id" class="dou-badge">豆</span>
                {{ book.doulist_title || '未分组' }}
                <span v-if="book.list_added_at" class="added-date">{{ book.list_added_at }}</span>
              </div>
              <div class="book-title">{{ book.title || `豆瓣 ${book.douban_id}` }}</div>
              <div class="meta">
                <span v-if="book.author">{{ book.author }}</span>
                <span v-if="book.publisher">{{ book.publisher }}</span>
                <span v-if="book.publish_year">{{ book.publish_year }}</span>
              </div>
              <div class="extra">
                <span v-if="book.isbn13" class="isbn">ISBN {{ book.isbn13 }}</span>
                <span v-if="book.pages">{{ book.pages }}页</span>
                <span v-if="book.price">¥{{ book.price }}</span>
                <span v-if="book.binding">{{ book.binding }}</span>
              </div>
            </div>
            <div v-if="book.rating" class="rating">
              {{ book.rating.toFixed(1) }}
              <span class="rating-count">{{ book.rating_count }}人</span>
            </div>

            <!-- 底部状态行（通栏，按钮顶到卡片右缘）：状态区在左 + 划去项目 / 加入书架在右 -->
            <div v-if="book.list_is_buy === 1 || book.list_is_read === 1" class="tags-row">
              <!-- 购书清单：待购买标签 -->
              <span v-if="book.list_is_buy === 1" :class="book.on_shelf === 1 ? 'tag tag--inlib' : 'tag tag--todo'">{{ book.on_shelf === 1 ? '已入库' : '待购买' }}</span>
              <!-- 阅读清单（已入库）：默认只读展示书库阅读状态；开启设置后可直接编辑并写回书库 -->
              <div v-if="book.list_is_read === 1 && book.on_shelf === 1 && editLibraryStatus" class="read-status-group">
                <button
                  v-for="opt in STATUS_OPTIONS"
                  :key="opt.value"
                  :class="['rs-btn', { active: libStatusCode(book) === opt.value }]"
                  @click.stop="setLibraryReadStatus(book, opt.value)"
                >{{ opt.label }}</button>
              </div>
              <span
                v-else-if="book.list_is_read === 1 && book.on_shelf === 1"
                class="tag tag--lib-state"
                title="已入库，阅读状态实时取自书库；如需修改请到书库书籍详情页"
              >{{ book.library_read_status || '未读' }}</span>
              <!-- 阅读清单（未入库）：手动状态按钮（未读 / 在读 / 已读） -->
              <div v-if="book.list_is_read === 1 && book.on_shelf !== 1" class="read-status-group">
                <button
                  :class="['rs-btn', { active: (book.read_status || 'unread') === 'unread' }]"
                  @click.stop="setReadStatus(book, 'unread')"
                >未读</button>
                <button
                  :class="['rs-btn', { active: book.read_status === 'reading' }]"
                  @click.stop="setReadStatus(book, 'reading')"
                >在读</button>
                <button
                  :class="['rs-btn', { active: book.read_status === 'read' }]"
                  @click.stop="setReadStatus(book, 'read')"
                >已读</button>
              </div>
              <span class="action-spacer"></span>
              <!-- 按钮与滑动手势并存：鼠标端用按钮，触屏端可用手势 -->
              <button
                class="btn-strike"
                @click.stop="setShelf(book, 'shelf')"
              >划去项目</button>
              <button
                class="btn-shelf"
                :class="{ 'btn-shelf--disabled': book.on_shelf === 1 || shelfChecking[book.douban_id] }"
                :disabled="book.on_shelf === 1 || shelfChecking[book.douban_id]"
                :data-douban="book.douban_id"
                @click.stop="onShelfBtnClick(book)"
              >{{ book.on_shelf === 1 ? '已入库' : '加入书架' }}</button>
            </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="hasMore" class="load-more">
        <button class="tool-btn" :disabled="loading" @click="loadMore">
          {{ loading ? '加载中...' : `加载更多（${total - books.length} 本）` }}
        </button>
      </div>
    </template>

    <!-- 从书库添加弹窗：搜索书库书籍，多选后加入书单 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="closeAddDialog">
      <div class="dialog dialog--libpick">
        <div class="dialog-header">
          <span>从书库添加到书单</span>
          <span class="dialog-close" @click="closeAddDialog">×</span>
        </div>
        <div class="dialog-body">
          <div class="dialog-field">
            <label class="field-label">所属书单 <span class="required">*</span></label>
            <QcSelect
              v-model="addDoulistChoice"
              :options="addDoulistOptions"
              placeholder="请选择书单"
            />
          </div>
          <div v-if="addDoulistChoice === '__new__'" class="dialog-field">
            <label class="field-label">新书单名称 <span class="required">*</span></label>
            <input v-model="addForm.newDoulistTitle" type="text" class="form-input" placeholder="如 2026 想读" />
            <div class="seg-group seg-group--sm seg-group--field">
              <button
                :class="['seg-btn', { active: addForm.newDoulistIsBuy === 1 }]"
                @click="toggleNewDoulistBuy"
              >购书清单</button>
              <button
                :class="['seg-btn', { active: addForm.newDoulistIsRead === 1 }]"
                @click="toggleNewDoulistRead"
              >阅读清单</button>
            </div>
          </div>
          <div class="dialog-field">
            <label class="field-label">搜索书库书籍</label>
            <input
              v-model="libKeyword"
              type="text"
              class="form-input"
              placeholder="书名 / 作者 / ISBN"
              @input="onLibSearchInput"
            />
          </div>
          <div class="lib-pick-list">
            <div v-if="searchingLib" class="lib-pick-hint">搜索中...</div>
            <div v-else-if="!libKeyword.trim()" class="lib-pick-hint">输入关键字搜索书库</div>
            <div v-else-if="!libResults.length" class="lib-pick-hint">书库中没有匹配的书籍</div>
            <label
              v-for="bk in libResults"
              :key="bk.id"
              class="lib-pick-item"
              :class="{ checked: libSelected.has(bk.id), disabled: libPickedIds.has(String(bk.id)) }"
            >
              <input
                type="checkbox"
                :checked="libSelected.has(bk.id)"
                :disabled="libPickedIds.has(String(bk.id))"
                @change="toggleLibPick(bk)"
              />
              <img v-if="bk.coverUrl" :src="bk.coverUrl" class="lib-pick-cover" loading="lazy" />
              <div v-else class="lib-pick-cover lib-pick-cover--empty">无封面</div>
              <div class="lib-pick-info">
                <div class="lib-pick-title">{{ bk.title }}</div>
                <div class="lib-pick-meta">
                  <span v-if="bk.author">{{ bk.author }}</span>
                  <span v-if="bk.publisher">{{ bk.publisher }}</span>
                  <span v-if="bk.isbn">ISBN {{ bk.isbn }}</span>
                </div>
              </div>
              <span v-if="libPickedIds.has(String(bk.id))" class="lib-pick-done">已在书单</span>
            </label>
          </div>
          <div v-if="addError" class="error-text">{{ addError }}</div>
        </div>
        <div class="dialog-footer">
          <span class="pick-count">已选 {{ libSelected.size }} 本</span>
          <span class="toolbar-spacer"></span>
          <button class="tool-btn" @click="closeAddDialog">取消</button>
          <button
            class="tool-btn tool-btn--primary"
            :disabled="adding || !libSelected.size"
            @click="submitAdd"
          >
            {{ adding ? `添加中（${addDoneCount}/${libSelected.size}）...` : '添加到书单' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 增量刷新弹窗 -->
    <div v-if="showRefreshDialog" class="dialog-overlay" @click.self="!refreshing && closeRefreshDialog()">
      <div class="dialog">
        <div class="dialog-header">
          <span>刷新豆列（增量）</span>
          <span v-if="!refreshing" class="dialog-close" @click="closeRefreshDialog">×</span>
        </div>
        <div class="dialog-body">
          <p class="refresh-hint">
            重新抓取豆列，仅<b>补充新书</b>；已有的书不做任何更改（不覆盖字段、不动书架状态）。
          </p>

          <div v-if="refreshing" class="progress-block">
            <div class="progress-text">
              正在抓取第 {{ refreshFetchedPages }} 页... 已获取 {{ refreshBooks.length }} 本
              <span v-if="refreshMeta && refreshMeta.totalPages">/ 约 {{ refreshMeta.totalPages * 25 }} 本</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: refreshMeta && refreshMeta.totalPages ? Math.min(100, Math.round(refreshFetchedPages / refreshMeta.totalPages * 100)) + '%' : '50%' }"
              ></div>
            </div>
            <button class="tool-btn" @click="cancelRefresh">停止抓取</button>
          </div>

          <template v-if="!refreshing">
            <div v-if="refreshError" class="error-text">{{ refreshError }}</div>
            <div v-else-if="refreshResult" class="refresh-result">
              ✅ 刷新完成：新增 <b>{{ refreshResult.imported }}</b> 本<template v-if="refreshResult.duplicates">，已有 {{ refreshResult.duplicates }} 本未更改</template>
            </div>
            <span v-else-if="refreshBlocked" class="error-text">⚠️ 豆瓣暂时限制了访问，已抓到 {{ refreshBooks.length }} 本，请稍后重试</span>
          </template>
        </div>
        <div class="dialog-footer">
          <button class="tool-btn" :disabled="refreshing" @click="closeRefreshDialog">
            {{ refreshResult ? '关闭' : '取消' }}
          </button>
          <button
            v-if="!refreshing && !refreshResult"
            class="tool-btn tool-btn--primary"
            :disabled="refreshBlocked"
            @click="startRefresh"
          >{{ refreshBooks.length ? '继续抓取' : '开始刷新' }}</button>
        </div>
      </div>
    </div>
    <!-- 加入书架弹窗：搜索中 → 信息预览（可勾选）→ 入库进度 → 结果汇总 -->
    <!-- 任务状态与执行体托管在 doulistShelveTask 模块，弹窗仅作视图 -->
    <DoulistShelveDialog
      v-model:visible="showShelveDialog"
      :task-id="activeShelveTaskId"
    />

    <!-- 书单完成礼花（常驻挂载，通过 ref 触发） -->
    <ConfettiBurst ref="confettiRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  doulistApi,
  doubanCoverProxy,
  type DoulistBook,
  type DoulistImportRecord
} from '@/api/doulistService';
import { bookService } from '@/api/book';
import type { Book } from '@/api/book/types';
import QcSelect from '@/components/QcSelect.vue';
import type { QcSelectOption } from '@/components/QcSelect.vue';
import DoulistShelveDialog from './DoulistShelveDialog.vue';
import ConfettiBurst from '@/components/ConfettiBurst.vue';
import medalImg from '@/pic/奖章.png';
import { useDoulistUiSettings } from '@/composables/useDoulistUiSettings';
import { startShelveTask, shelveState } from '@/composables/doulistShelveTask';
import { startRefreshTask, clearRefreshTask, refreshState } from '@/composables/doulistRefreshTask';
import { useTaskStore } from '@/stores/task';

const props = defineProps<{
  /** 顶部搜索框（书单标签页）输入的关键字，由父组件 v-model:keyword 传入 */
  keyword?: string;
  /** 书单排序方式：createTime(默认) / rating / title / author */
  sortBy?: string;
}>();

const emit = defineEmits<{
  'update:keyword': [value: string];
}>();

const router = useRouter();

// 书单界面设置（卡片跳转 / 在库状态可编辑 / 滑动手势）
const { cardClickAction, editLibraryStatus, swipeGesture } = useDoulistUiSettings();

// 书单卡片点击跳转：设置指向书库且已入库时跳书籍详情，否则打开豆瓣页面
const handleCardClick = (book: DoulistBook) => {
  // 横向滑动刚结束：抑制紧随其后的 click，避免误触跳转
  if (swipeState[book.douban_id]?.suppressClick) return;
  if (cardClickAction.value === 'library' && book.on_shelf === 1 && book.library_book_id) {
    router.push(`/book/detail/${book.library_book_id}`);
    return;
  }
  if (book.douban_url) window.open(book.douban_url, '_blank');
};

const books = ref<DoulistBook[]>([]);
const imports = ref<DoulistImportRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 50;
const loading = ref(false);
const hasMore = ref(false);

const filterCategory = ref<'' | 'buy' | 'read'>('');
const filterDoulistId = ref('');
// 搜索关键字：单一来源为父组件（顶部搜索框），通过 v-model 双向同步
const keyword = computed({
  get: () => props.keyword ?? '',
  set: (v: string) => emit('update:keyword', v)
});
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// 单次抓取页数上限（读自豆列设置）
const maxPagesLimit = ref(0);
// 是否隐藏已划去/已入书架的书（读自第三方设置，持久化）
const hideShelved = ref(false);

// 加入书架按钮的置灰状态（按 douban_id 缓存）
const shelfChecking = reactive<Record<string, boolean>>({});

const selectedImport = computed(() =>
  imports.value.find((imp) => imp.doulist_id === filterDoulistId.value) || null
);

// 「从书库添加」弹窗的书单选项（当前书单置顶 + 新建 + 已有书单）
const addDoulistOptions = computed<QcSelectOption[]>(() => {
  const opts: QcSelectOption[] = [];
  if (filterDoulistId.value) {
    opts.push({
      value: filterDoulistId.value,
      label: `当前书单：${selectedImport.value?.doulist_title || filterDoulistId.value}`
    });
  }
  opts.push({ value: '__new__', label: '＋ 新建书单...' });
  for (const imp of imports.value) {
    if (imp.doulist_id === filterDoulistId.value) continue;
    opts.push({
      value: imp.doulist_id,
      label: `${imp.doulist_title || `豆列 ${imp.doulist_id}`}（${imp.item_count}）`
    });
  }
  return opts;
});
const isDoubanDoulist = computed(() => /^\d+$/.test(filterDoulistId.value));

const categoryTabs = [
  { value: '' as const, label: '全部' },
  { value: 'buy' as const, label: '购书清单' },
  { value: 'read' as const, label: '阅读清单' }
];

/* ---------- 文件夹视图 ---------- */
const showFolders = computed(() => filterDoulistId.value === '' && keyword.value.trim() === '');

const visibleImports = computed(() =>
  imports.value.filter((imp) => {
    // 断点续跑进度占位行（抓取中未导入）不显示为文件夹
    if (imp.status === 'running') return false;
    if (!filterCategory.value) return true;
    return filterCategory.value === 'buy' ? imp.is_buy === 1 : imp.is_read === 1;
  })
);

const folderCovers = (imp: DoulistImportRecord): string[] =>
  String(imp.covers || '').split('|').filter(Boolean).slice(0, 4);

const isDoubanId = (id: string) => /^\d+$/.test(id);

const openFolder = (imp: DoulistImportRecord) => {
  filterDoulistId.value = imp.doulist_id;
  filterCategory.value = ''; // 进入书单后显示该书单全部书
  reload();
};

const backToFolders = () => {
  filterDoulistId.value = '';
  reload();
};

const goImport = () => router.push('/book/doulist-import');

/* ---------- 列表 ---------- */
const fetchBooks = async (append = false) => {
  loading.value = true;
  try {
    const res = await doulistApi.books({
      doulistId: filterDoulistId.value || undefined,
      category: (filterCategory.value || undefined) as 'buy' | 'read' | undefined,
      hideShelved: hideShelved.value || undefined,
      sortBy: props.sortBy || undefined,
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize
    });
    total.value = res.total;
    books.value = append ? [...books.value, ...res.data] : res.data;
    hasMore.value = books.value.length < res.total;
    // 书库在架状态已由列表接口批量返回，无需逐本调 shelf-check
    for (const b of books.value) {
      if (shelfChecking[b.douban_id] === undefined) shelfChecking[b.douban_id] = b.on_shelf === 1;
    }
  } catch (err) {
    console.error('读取书单失败:', err);
  } finally {
    loading.value = false;
  }
};

const reload = () => {
  page.value = 1;
  fetchBooks(false);
};

const loadMore = () => {
  page.value++;
  fetchBooks(true);
};

// 顶部搜索框关键字 / 排序方式变化时，防抖重载列表
watch(
  () => [props.keyword, props.sortBy],
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(reload, 300);
  }
);

const setCategory = (value: '' | 'buy' | 'read') => {
  // 在书单内点击分类 Tab：退回主书单（文件夹）视图并应用该筛选
  if (filterDoulistId.value) {
    filterDoulistId.value = '';
    filterCategory.value = value;
    reload();
    return;
  }
  if (filterCategory.value === value) return;
  filterCategory.value = value;
  reload();
};

const fetchImports = async () => {
  try {
    const res = await doulistApi.imports();
    // 记录刷新前的奖章状态，用于识别「从未完成 → 完成」瞬间
    const wasMedaled = new Map(imports.value.map((i) => [i.doulist_id, isMedaled(i)]));
    imports.value = res.data || [];
    for (const imp of imports.value) {
      if (!isMedaled(imp)) continue;
      // 本次会话内从未完成变为完成 → 播放礼花；首次加载即为完成只记录不重放（刷新不重放）
      if (wasMedaled.get(imp.doulist_id) === false) confettiRef.value?.fire();
      rememberMedal(imp.doulist_id);
    }
  } catch { /* 忽略 */ }
};

/* ---------- 购书 / 阅读进度与完成奖章 ---------- */
// 进度百分比（总数为 0 时按 0 处理）
const pctOf = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);

// 奖章条件：勾选的分类各自进度 100%（勾选分类总数为 0 不算完成）
const isMedaled = (imp: DoulistImportRecord) => {
  if (imp.is_buy === 1 && (imp.buy_total === 0 || imp.buy_done < imp.buy_total)) return false;
  if (imp.is_read === 1 && (imp.read_total === 0 || imp.read_done < imp.read_total)) return false;
  return imp.is_buy === 1 || imp.is_read === 1;
};

const confettiRef = ref<InstanceType<typeof ConfettiBurst> | null>(null);

// 已达成过完成态的书单（localStorage 持久化，跨刷新不重放礼花）
const MEDAL_SEEN_KEY = 'qc_doulist_medal_seen';
const medalSeen: Set<string> = (() => {
  try { return new Set(JSON.parse(localStorage.getItem(MEDAL_SEEN_KEY) || '[]')); }
  catch { return new Set(); }
})();
const rememberMedal = (id: string) => {
  if (medalSeen.has(id)) return;
  medalSeen.add(id);
  try { localStorage.setItem(MEDAL_SEEN_KEY, JSON.stringify([...medalSeen])); } catch { /* 忽略 */ }
};

/* ---------- 书单分类（双标志开关，至少保留一个） ---------- */
const toggleDoulistFlag = async (flag: 'is_buy' | 'is_read') => {
  const imp = selectedImport.value;
  if (!imp) return;
  const newBuy = flag === 'is_buy' ? (imp.is_buy === 1 ? 0 : 1) : imp.is_buy;
  const newRead = flag === 'is_read' ? (imp.is_read === 1 ? 0 : 1) : imp.is_read;
  if (!newBuy && !newRead) {
    alert('购书清单与阅读清单至少需保留一个');
    return;
  }
  try {
    await doulistApi.setDoulistCategories(imp.doulist_id, newBuy === 1, newRead === 1);
    imp.is_buy = newBuy;
    imp.is_read = newRead;
    // 分类变化影响奖章判定条件，刷新统计并检测完成状态
    fetchImports();
    if (filterDoulistId.value === imp.doulist_id) reload();
  } catch (err: any) {
    console.error('设置书单分类失败:', err);
    alert(err?.message || '设置书单分类失败');
  }
};

/* ---------- 多选与批量操作 ---------- */
const selectMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());
const batchRunning = ref(false);

const selectedCount = computed(() => selectedIds.value.size);
const selectedBooks = computed(() => books.value.filter((b) => selectedIds.value.has(b.douban_id)));

const isSelected = (book: DoulistBook) => selectedIds.value.has(book.douban_id);

const toggleSelect = (book: DoulistBook) => {
  const next = new Set(selectedIds.value);
  if (next.has(book.douban_id)) next.delete(book.douban_id);
  else next.add(book.douban_id);
  selectedIds.value = next;
};

const selectAllVisible = () => {
  selectedIds.value = new Set(books.value.map((b) => b.douban_id));
};

const invertSelect = () => {
  const next = new Set<string>();
  for (const b of books.value) {
    if (!selectedIds.value.has(b.douban_id)) next.add(b.douban_id);
  }
  selectedIds.value = next;
};

const clearSelection = () => {
  selectedIds.value = new Set();
};

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) clearSelection();
};

/** 批量划去：逐本置为 shelf（失败不中断，末尾汇总提示） */
const batchStrike = async () => {
  const targets = selectedBooks.value.filter((b) => b.shelf_status !== 'shelf');
  if (!targets.length || batchRunning.value) return;
  batchRunning.value = true;
  let ok = 0;
  const failed: string[] = [];
  for (const b of targets) {
    try {
      await setShelf(b, 'shelf');
      ok++;
    } catch {
      failed.push(b.title || b.douban_id);
    }
  }
  batchRunning.value = false;
  clearSelection();
  if (failed.length) alert(`已划去 ${ok} 本，失败 ${failed.length} 本：${failed.join('、')}`);
};

/** 批量加入书架：收集选中且未入库的书，交给入库弹窗统一预览与写入 */
const batchShelve = () => {
  const targets = selectedBooks.value.filter((b) => b.on_shelf !== 1);
  if (!targets.length) {
    alert('选中的书籍都已入库');
    return;
  }
  openShelveDialog(targets);
};

/* ---------- 划去项目（原 shelf_status 切换） ---------- */
const setShelf = async (book: DoulistBook, status: 'shelf' | 'pending') => {
  try {
    await doulistApi.setShelf(book.douban_id, status);
    book.shelf_status = status;
    if (status === 'shelf') book.shelved_at = new Date().toISOString();
    else book.shelved_at = null;
    // 如果开启了隐藏划去的书，刷新列表
    if (hideShelved.value && status === 'shelf') {
      reload();
    }
  } catch (err: any) {
    console.error('更新书架状态失败:', err);
  }
};

/* ---------- 加入书架：走弹窗（搜索中 → 信息预览 → 入库进度 → 结果汇总） ---------- */
/* 任务状态与执行体托管在 doulistShelveTask 模块：弹窗关闭/切页不中断，小窗可见进度 */
const showShelveDialog = ref(false);
const activeShelveTaskId = ref('');
const taskStore = useTaskStore();

/** 打开入库弹窗：过滤掉已入库 / 正在处理的，避免重复入库 */
const openShelveDialog = (targets: DoulistBook[]) => {
  const list = targets.filter((b) => b.on_shelf !== 1 && !shelfChecking[b.douban_id]);
  if (!list.length) return;
  activeShelveTaskId.value = startShelveTask(list, router.currentRoute.value.fullPath || '/book');
  showShelveDialog.value = true;
};

/** 入库结束（弹窗内完成 / 整页或后台完成均走此路径）：标记已入库 + 刷新列表 + 清空多选 */
const applyShelveResult = () => {
  const s = shelveState.value;
  if (!s) return;
  const addedIds = s.items.filter((i) => i.importStatus === 'success').map((i) => i.book.douban_id);
  for (const id of addedIds) {
    shelfChecking[id] = true;
    const hit = books.value.find((b) => b.douban_id === id);
    if (hit) hit.on_shelf = 1;
  }
  if (addedIds.length) {
    clearSelection();
    reload();
    fetchImports(); // 入库可能使书单达成 100%，刷新统计并检测奖章/礼花
  }
};

// 监听本面板发起的入库任务终态（done=全部结束；cancelled=入库中被取消，已入库部分仍需同步）
watch(
  () => taskStore.tasks.find((t) => t.id === activeShelveTaskId.value)?.status,
  (status) => {
    if (status !== 'done' && status !== 'cancelled') return;
    activeShelveTaskId.value = '';
    applyShelveResult();
  }
);

const addToShelfByApi = (book: DoulistBook) => {
  openShelveDialog([book]);
};

// 单本入库：直接打开弹窗（弹窗内已含信息预览与确认，无需双击确认）
const onShelfBtnClick = (book: DoulistBook) => {
  if (shelfChecking[book.douban_id] || book.on_shelf === 1) return;
  addToShelfByApi(book);
};

/* ---------- 阅读状态 ---------- */
const setReadStatus = async (book: DoulistBook, status: 'unread' | 'reading' | 'read') => {
  try {
    await doulistApi.setReadStatus(book.douban_id, status);
    book.read_status = status;
    fetchImports(); // 阅读状态变化影响阅读进度统计
  } catch (err: any) {
    console.error('更新阅读状态失败:', err);
  }
};

/* ---------- 在库书籍阅读状态编辑（需在设置中开启） ---------- */
const STATUS_OPTIONS: Array<{ value: 'unread' | 'reading' | 'read'; label: string }> = [
  { value: 'unread', label: '未读' },
  { value: 'reading', label: '在读' },
  { value: 'read', label: '已读' }
];
const STATUS_CODE: Record<string, 'unread' | 'reading' | 'read'> = {
  未读: 'unread',
  在读: 'reading',
  已读: 'read'
};

// 书库阅读状态（中文）→ 状态码，用于回显按钮激活态
const libStatusCode = (book: DoulistBook): 'unread' | 'reading' | 'read' =>
  STATUS_CODE[book.library_read_status || '未读'] || 'unread';

// 编辑已入库书籍的阅读状态：先写书单记录，再通过入库衔接点写回书库（书库为权威）
const setLibraryReadStatus = async (book: DoulistBook, status: 'unread' | 'reading' | 'read') => {
  if (book.on_shelf !== 1 || !book.library_book_id) return;
  try {
    await doulistApi.setReadStatus(book.douban_id, status);
    const applyRes = await doulistApi.applyReadStatus(book.douban_id);
    book.read_status = status;
    book.library_read_status = applyRes.readStatus || STATUS_OPTIONS.find((o) => o.value === status)?.label || null;
    fetchImports(); // 阅读状态变化影响阅读进度统计
  } catch (err: any) {
    console.error('更新书库阅读状态失败:', err);
    alert(err?.message || '更新书库阅读状态失败');
  }
};

/* ---------- 滑动手势：右滑划掉此列 / 左滑加入书架 ---------- */
const SWIPE_THRESHOLD = 70; // 触发阈值（px）
const SWIPE_MAX = 200; // 卡片跟手最大位移（px）
interface SwipeState {
  startX: number;
  startY: number;
  dx: number;
  active: boolean;
  horizontal: boolean;
  dragging: boolean; // 手指未松开：无过渡动画
  suppressClick: boolean; // 横向滑动后抑制紧随其后的 click（避免误开豆瓣页）
}
const swipeState = reactive<Record<string, SwipeState>>({});

const onCardTouchStart = (book: DoulistBook, e: TouchEvent) => {
  if (!swipeGesture.value) return;
  const t = e.touches[0];
  swipeState[book.douban_id] = { startX: t.clientX, startY: t.clientY, dx: 0, active: true, horizontal: false, dragging: true, suppressClick: false };
};

const onCardTouchMove = (book: DoulistBook, e: TouchEvent) => {
  const st = swipeState[book.douban_id];
  if (!st?.active) return;
  const t = e.touches[0];
  const dx = t.clientX - st.startX;
  const dy = t.clientY - st.startY;
  if (!st.horizontal) {
    // 尚未判定方向：垂直滚动则放弃手势，水平位移则进入滑动状态
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) <= Math.abs(dy)) {
      st.active = false;
      st.dx = 0;
      return;
    }
    st.horizontal = true;
  }
  st.dx = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
};

const onCardTouchEnd = (book: DoulistBook) => {
  const st = swipeState[book.douban_id];
  if (!st) return;
  const dx = st.dx;
  st.active = false;
  st.dragging = false; // 恢复过渡动画（回弹/滑出）
  if (st.horizontal) st.suppressClick = true;

  const isShelved = book.shelf_status === 'shelf';
  // 达到阈值：未划去的书 右滑划掉 / 左滑加入书架（已入库则回弹）；已划去的书 左滑恢复显示
  const willStrike = !isShelved && dx > 0 && Math.abs(dx) >= SWIPE_THRESHOLD;
  const willShelf = !isShelved && dx < 0 && Math.abs(dx) >= SWIPE_THRESHOLD && book.on_shelf !== 1;
  const willRestore = isShelved && dx < 0 && Math.abs(dx) >= SWIPE_THRESHOLD;
  if (willStrike || willShelf || willRestore) {
    st.dx = (dx > 0 ? 1 : -1) * 520; // 滑出动画
    setTimeout(() => {
      delete swipeState[book.douban_id];
      if (willStrike) setShelf(book, 'shelf');
      else if (willRestore) setShelf(book, 'pending');
      else addToShelfByApi(book);
    }, 200);
    return;
  }

  // 未达阈值：回弹归位；横向滑动后短暂保留状态以抑制 click
  st.dx = 0;
  if (st.horizontal) setTimeout(() => delete swipeState[book.douban_id], 350);
};

// 底色块方向/文案：未划去 → 右滑红「划掉此列」/ 左滑橙「加入书架」；已划去 → 左滑绿「恢复」
const swipeBgInfo = (book: DoulistBook): { cls: string; text: string } | null => {
  const dx = swipeDx(book);
  if (dx === 0) return null;
  if (book.shelf_status === 'shelf') {
    return dx < 0 ? { cls: 'swipe-bg swipe-bg--restore', text: '恢复' } : null;
  }
  return dx > 0 ? { cls: 'swipe-bg swipe-bg--strike', text: '划掉此列' } : { cls: 'swipe-bg swipe-bg--shelf', text: '加入书架' };
};

const swipeBgClass = (book: DoulistBook): string => swipeBgInfo(book)?.cls || '';
const swipeBgText = (book: DoulistBook): string => swipeBgInfo(book)?.text || '';

// 当前卡片位移（0 表示原位）
const swipeDx = (book: DoulistBook): number => swipeState[book.douban_id]?.dx || 0;

// 滑动进度 0~1（相对触发阈值），用于底色块/删除线由微弱到明显
const swipeProgress = (book: DoulistBook): number => Math.min(1, Math.abs(swipeDx(book)) / SWIPE_THRESHOLD);

// 卡片跟手位移样式：拖动中无过渡，松手后回弹/滑出带过渡
const swipeCardStyle = (book: DoulistBook): Record<string, string> => {
  const st = swipeState[book.douban_id];
  if (!st) return {};
  return {
    transform: `translateX(${st.dx}px)`,
    transition: st.dragging ? 'none' : 'transform 0.25s ease'
  };
};

// 底色块透明度随进度由微弱到明显，划回原位即消失
const swipeBgStyle = (book: DoulistBook): Record<string, string> => ({
  opacity: String(swipeProgress(book))
});

// 渐变删除线：随右滑进度横向展开、加深
const swipeStrikeStyle = (book: DoulistBook): Record<string, string> => {
  const p = swipeProgress(book);
  return {
    transform: `scaleX(${p})`,
    opacity: String(0.35 + 0.65 * p)
  };
};

/* ---------- 从书库添加（搜索 + 多选） ---------- */
const showAddDialog = ref(false);
const adding = ref(false);
const addError = ref('');
const addDoulistChoice = ref('');
const addForm = reactive({
  newDoulistTitle: '',
  newDoulistIsBuy: 1,
  newDoulistIsRead: 0
});

// 书库搜索与多选状态
const libKeyword = ref('');
const libResults = ref<Book[]>([]);
const libSelected = ref<Set<number>>(new Set());
const libPickedIds = ref<Set<string>>(new Set()); // 书单中已存在的书（按 ISBN 标记）
const searchingLib = ref(false);
const addDoneCount = ref(0);
let libSearchTimer: ReturnType<typeof setTimeout> | null = null;

// 新书单分类开关：至少保留一个分类
const toggleNewDoulistBuy = () => {
  if (addForm.newDoulistIsBuy === 1 && addForm.newDoulistIsRead !== 1) {
    alert('购书清单与阅读清单至少需勾选一个');
    return;
  }
  addForm.newDoulistIsBuy = addForm.newDoulistIsBuy === 1 ? 0 : 1;
};

const toggleNewDoulistRead = () => {
  if (addForm.newDoulistIsRead === 1 && addForm.newDoulistIsBuy !== 1) {
    alert('购书清单与阅读清单至少需勾选一个');
    return;
  }
  addForm.newDoulistIsRead = addForm.newDoulistIsRead === 1 ? 0 : 1;
};

const openAddDialog = async () => {
  addDoulistChoice.value = filterDoulistId.value || '';
  libKeyword.value = '';
  libResults.value = [];
  libSelected.value = new Set();
  addError.value = '';
  showAddDialog.value = true;
  // 打开弹窗时预取当前书单已有的书（按 ISBN 标记，避免重复添加）
  if (filterDoulistId.value) {
    try {
      const res = await doulistApi.books({ doulistId: filterDoulistId.value, page: 1, pageSize: 2000 });
      libPickedIds.value = new Set(
        res.data.map((b) => b.isbn13 || b.isbn10 || `t:${(b.title || '').trim()}`).filter(Boolean)
      );
    } catch { /* 忽略，标记失败仅影响去重提示 */ }
  } else {
    libPickedIds.value = new Set();
  }
};

const closeAddDialog = () => {
  if (adding.value) return;
  showAddDialog.value = false;
  addError.value = '';
  libKeyword.value = '';
  libResults.value = [];
  libSelected.value = new Set();
  libPickedIds.value = new Set();
  addDoulistChoice.value = filterDoulistId.value || '';
  addForm.newDoulistTitle = '';
  addForm.newDoulistIsBuy = 1;
  addForm.newDoulistIsRead = 0;
};

const onLibSearchInput = () => {
  if (libSearchTimer) clearTimeout(libSearchTimer);
  libSearchTimer = setTimeout(searchLibrary, 300);
};

const searchLibrary = async () => {
  const kw = libKeyword.value.trim();
  if (!kw) {
    libResults.value = [];
    return;
  }
  searchingLib.value = true;
  try {
    const res = await bookService.getBooks({ keyword: kw, pageSize: 50 });
    libResults.value = res.list || [];
  } catch (err: any) {
    console.error('搜索书库失败:', err);
    libResults.value = [];
  } finally {
    searchingLib.value = false;
  }
};

const toggleLibPick = (bk: Book) => {
  const next = new Set(libSelected.value);
  if (next.has(bk.id)) next.delete(bk.id);
  else next.add(bk.id);
  libSelected.value = next;
};

const submitAdd = async () => {
  const isNewDoulist = addDoulistChoice.value === '__new__';
  const newTitle = addForm.newDoulistTitle.trim();

  // 只创建空书单：未选任何书 + 选择「新建书单」并填写名称
  if (!libSelected.value.size) {
    if (isNewDoulist && newTitle) {
      adding.value = true;
      addError.value = '';
      try {
        await doulistApi.createDoulist({
          doulistTitle: newTitle,
          isBuy: addForm.newDoulistIsBuy,
          isRead: addForm.newDoulistIsRead
        });
        closeAddDialog();
        fetchImports();
      } catch (err: any) {
        addError.value = err?.message || '创建书单失败';
      } finally {
        adding.value = false;
      }
      return;
    }
    addError.value = '请先搜索并勾选要添加的书籍';
    return;
  }
  if (!addDoulistChoice.value) {
    addError.value = '必须选择一个书单（书籍必须属于一个书单）';
    return;
  }
  if (isNewDoulist && !newTitle) {
    addError.value = '请填写新书单名称';
    return;
  }
  // 先建空书单（新书单），再逐本加入选中书籍
  adding.value = true;
  addError.value = '';
  try {
    if (isNewDoulist) {
      await doulistApi.createDoulist({
        doulistTitle: newTitle,
        isBuy: addForm.newDoulistIsBuy,
        isRead: addForm.newDoulistIsRead
      });
    }
    const picked = libResults.value.filter((b) => libSelected.value.has(b.id));
    let added = 0;
    let skipped = 0;
    const failed: string[] = [];
    addDoneCount.value = 0;
    for (const bk of picked) {
      try {
        const res = await doulistApi.createBook({
          title: bk.title,
          author: bk.author || undefined,
          publisher: bk.publisher || undefined,
          publishYear: bk.publishYear ? String(bk.publishYear) : undefined,
          isbn13: bk.isbn || undefined,
          doulistId: isNewDoulist ? undefined : addDoulistChoice.value,
          doulistTitle: isNewDoulist ? newTitle : undefined,
          isBuy: isNewDoulist ? addForm.newDoulistIsBuy : undefined,
          isRead: isNewDoulist ? addForm.newDoulistIsRead : undefined
        });
        if (res.created) added++;
        else skipped++;
      } catch (err: any) {
        failed.push(`${bk.title}（${err?.message || '失败'}）`);
      }
      addDoneCount.value++;
    }
    closeAddDialog();
    fetchImports();
    reload();
    const parts = [`已添加 ${added} 本`];
    if (skipped) parts.push(`跳过重复 ${skipped} 本`);
    if (failed.length) parts.push(`失败：${failed.join('；')}`);
    alert(parts.join('，'));
  } catch (err: any) {
    addError.value = err?.message || '添加失败';
  } finally {
    adding.value = false;
  }
};

/* ---------- 增量刷新 ---------- */
/* 刷新任务托管在 doulistRefreshTask 模块（切页不中断），此处仅作视图别名 */
const showRefreshDialog = ref(false);
const rst = refreshState;
const refreshing = computed(() => !!rst.value && !rst.value.finished);
const refreshFetchedPages = computed(() => rst.value?.fetchedPages ?? 0);
const refreshBooks = computed(() => rst.value?.books ?? []);
const refreshMeta = computed(() => rst.value?.meta ?? null);
const refreshError = computed(() => rst.value?.error ?? '');
const refreshResult = computed(() => rst.value?.result ?? null);
const refreshBlocked = computed(() => rst.value?.blocked ?? false);

const closeRefreshDialog = () => {
  if (refreshing.value) return;
  showRefreshDialog.value = false;
  clearRefreshTask();
};

const openRefreshDialog = () => {
  // 上一次任务已结束（进行中时工具条按钮禁用），重开弹窗即清理残留记录
  clearRefreshTask();
  showRefreshDialog.value = true;
};

const startRefresh = () => {
  if (refreshing.value || !isDoubanDoulist.value) return;
  startRefreshTask({
    doulistId: filterDoulistId.value,
    maxPages: maxPagesLimit.value,
    // 面板同时挂在 /book 与 /book/doulist-books，任务归属页面按当前路由记录
    sourcePath: router.currentRoute.value.path
  });
};

// 刷新任务完成后回填书单（抓取+导入托管在模块侧，完成后刷新列表数据）
watch(() => rst.value?.finished, (f) => {
  if (f && rst.value?.result) {
    fetchImports();
    reload();
  }
});

const cancelRefresh = () => {
  if (rst.value) taskStore.cancelTask(rst.value.taskId);
};

/* ---------- 初始化 ---------- */
onMounted(async () => {
  reload();
  fetchImports();
  try {
    const res = await doulistApi.getSettings();
    maxPagesLimit.value = res.data.doulistMaxPages || 0;
    hideShelved.value = res.data.doulistHideShelved === 1;
    if (hideShelved.value) reload();
  } catch { /* 忽略 */ }
});
</script>

<style scoped>
.doulist-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 工具条 */
.panel-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-toolbar__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.panel-toolbar__sub {
  padding: 8px 10px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.sub-label {
  font-size: 12px;
  color: var(--text-hint);
  flex-shrink: 0;
}

.toolbar-spacer {
  flex: 1;
}

.panel-toolbar__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 分段按钮 */
.seg-group {
  display: flex;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 2px;
  flex-shrink: 0;
}

.seg-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 6px);
  font-size: 13px;
  color: var(--text-hint);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.seg-btn.active {
  background-color: #fff;
  color: var(--primary-color);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.seg-group--sm .seg-btn {
  padding: 3px 10px;
  font-size: 12px;
}

.seg-group--field {
  margin-top: 8px;
  display: inline-flex;
}

/* 面包屑 */
.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.breadcrumb-item {
  color: var(--text-hint);
  cursor: pointer;
}

.breadcrumb-item:hover {
  color: var(--primary-color);
}

.breadcrumb-item--current {
  color: var(--text-primary);
  font-weight: 600;
  cursor: default;
}

.breadcrumb-separator {
  color: var(--text-hint);
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background-color: var(--bg-card, #fff);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tool-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tool-btn--primary {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.tool-btn--primary:hover:not(:disabled) {
  color: #fff;
  transform: translateY(-1px);
}

.empty-text {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: var(--text-hint);
}

/* ========== 文件夹视图 ========== */
.folders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
}

.folder-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.folder-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.folder-card__thumbs {
  position: relative;
  width: 100%;
  padding-top: 133.33%;
  background-color: var(--bg-secondary);
  flex-shrink: 0;
  overflow: hidden;
}

.folder-card__thumbs-grid {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 6px;
}

.folder-card__thumb {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
  background-color: #e0e0e0;
}

.folder-card__thumb--empty {
  background-color: transparent;
}

.thumb__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.folder-card__info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  min-height: 44px;
}

.folder-card__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 双分类角标容器（左上角纵向堆叠） */
.folder-card__cats {
  position: absolute;
  left: 8px;
  top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.folder-card__cat {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  width: fit-content;
}

.folder-card__cat--buy {
  background-color: rgba(255, 107, 53, 0.9);
  color: #fff;
}

.folder-card__cat--read {
  background-color: rgba(0, 181, 29, 0.9);
  color: #fff;
}

.folder-card__count {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #1a1a1a;
  color: #fff;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  z-index: 10;
}

.folder-card__count .count-number {
  color: #fff;
}

.folder-card__count .count-label {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
}

/* 有奖章时数量角标下移避让 */
.folder-card__count--medal {
  top: 48px;
}

/* 完成奖章（右上角，出现时弹跳动画） */
.folder-card__medal {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 2px 5px rgba(255, 176, 0, 0.6));
  z-index: 11;
  animation: medal-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes medal-pop {
  0% { transform: scale(0) rotate(-30deg); }
  100% { transform: scale(1) rotate(0deg); }
}

/* 文件夹卡片购书/阅读进度条 */
.folder-card__progress {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0 10px 8px;
}

.fp-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.fp-label {
  width: 14px;
  height: 14px;
  line-height: 14px;
  text-align: center;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.fp-label--buy { background-color: #ff6b35; }
.fp-label--read { background-color: #00b51d; }

.fp-track {
  flex: 1;
  height: 4px;
  background-color: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.fp-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.fp-fill--buy { background-color: #ff6b35; }
.fp-fill--read { background-color: #00b51d; }

.fp-text {
  min-width: 34px;
  text-align: right;
  font-size: 10px;
  color: var(--text-hint);
  flex-shrink: 0;
}

/* 书单详情页购书/阅读进度条 */
.doulist-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}

.dp-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dp-label {
  width: 44px;
  font-size: 12px;
  color: var(--text-hint);
  flex-shrink: 0;
}

.dp-track {
  flex: 1;
  height: 8px;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.dp-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.dp-fill--buy { background: linear-gradient(90deg, #ff9f43, #ff6b35); }
.dp-fill--read { background: linear-gradient(90deg, #4cd964, #00b51d); }

.dp-count {
  min-width: 48px;
  text-align: right;
  font-size: 12px;
  color: var(--text-hint);
  flex-shrink: 0;
}

.dou-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background-color: #00b51d;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ========== 书单内列表 ========== */
.book-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.book-card {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s ease;
}

/* 滑动手势容器：底色块垫底，卡片随手指位移 */
.swipe-wrap {
  position: relative;
  border-radius: var(--radius-lg);
}

/* 滑动露出的底色块（透明度随滑动进度变化） */
.swipe-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  border-radius: var(--radius-lg);
  pointer-events: none;
}

/* 右滑：左侧红色「划掉此列」 */
.swipe-bg--strike {
  justify-content: flex-start;
  padding-left: 20px;
  background: linear-gradient(90deg, rgba(244, 67, 54, 0.92) 0%, rgba(244, 67, 54, 0.5) 65%, rgba(244, 67, 54, 0) 100%);
}

/* 左滑：右侧橙色「加入书架」 */
.swipe-bg--shelf {
  justify-content: flex-end;
  padding-right: 20px;
  background: linear-gradient(270deg, rgba(255, 152, 0, 0.92) 0%, rgba(255, 152, 0, 0.5) 65%, rgba(255, 152, 0, 0) 100%);
}

/* 已划去行左滑：右侧绿色「恢复」 */
.swipe-bg--restore {
  justify-content: flex-end;
  padding-right: 20px;
  background: linear-gradient(270deg, rgba(76, 175, 80, 0.92) 0%, rgba(76, 175, 80, 0.5) 65%, rgba(76, 175, 80, 0) 100%);
}

.swipe-bg__text {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

/* 右滑删除线：横向渐变展开，覆盖在卡片文字上 */
.swipe-strike-line {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 50%;
  height: 2px;
  z-index: 5;
  border-radius: 1px;
  pointer-events: none;
  transform-origin: left center;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.65));
}

/* 可滑动手势的卡片：水平手势交给页面逻辑处理，垂直滚动不受影响 */
.book-card--swipeable {
  touch-action: pan-y;
  overflow: hidden;
}

.book-card:hover {
  transform: translateY(-2px);
}

.book-card--shelved {
  padding: 8px 12px;
  opacity: 0.75;
}

.book-card--shelved:hover {
  transform: none;
}

.shelved-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.shelved-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--text-hint);
  text-decoration: line-through;
  text-decoration-color: rgba(0, 0, 0, 0.35);
}

.shelved-rating {
  font-size: 13px;
  font-weight: 700;
  color: #ff9800;
  flex-shrink: 0;
}

.shelved-date {
  font-size: 11px;
  color: var(--text-hint);
  flex-shrink: 0;
}

.btn-undo {
  padding: 3px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 12px;
  color: var(--text-hint);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.btn-undo:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.cover {
  width: 64px;
  height: 90px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
  background-color: var(--bg-secondary);
}

.cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-hint);
}

.info {
  flex: 1;
  min-width: 0;
}

.doulist-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  margin-bottom: 4px;
  padding: 1px 8px 1px 2px;
  border-radius: 10px;
  background-color: rgba(0, 181, 29, 0.08);
  font-size: 11px;
  color: #007722;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.added-date {
  color: var(--text-hint);
  font-size: 10px;
}

.book-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.meta,
.extra {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
}

.isbn {
  font-family: monospace;
}

.tags-row {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 0;
}

.tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: var(--bg-secondary);
  color: var(--text-hint);
}

/* 购书清单：待购买标签（橙色） */
.tag--todo {
  background-color: rgba(255, 107, 53, 0.12);
  color: #e65100;
  font-weight: 600;
}

/* 已入库书：购书清单标签由「待购买」变为「已入库」（绿色） */
.tag--inlib {
  background-color: rgba(76, 175, 80, 0.15);
  color: #2e7d32;
  font-weight: 600;
}

/* 阅读清单：已入库后的只读状态徽标（实时取自书库） */
.tag--lib-state {
  background-color: rgba(33, 150, 243, 0.12);
  color: #1565c0;
  font-weight: 600;
  cursor: default;
}

.action-spacer {
  flex: 1;
}

/* 划去项目按钮 */
.btn-strike {
  padding: 3px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: transparent;
  font-size: 12px;
  color: var(--text-hint);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-strike:hover {
  border-color: var(--text-hint);
  color: var(--text-primary);
}

/* 加入书架按钮（调书源 API） */
.btn-shelf {
  padding: 3px 12px;
  border: 1px solid var(--primary-color);
  border-radius: var(--radius-md);
  background-color: rgba(255, 107, 53, 0.06);
  font-size: 12px;
  color: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-shelf:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: #fff;
}

/* 已在书架：置灰 */
.btn-shelf--disabled {
  border-color: var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-hint);
  cursor: not-allowed;
  opacity: 0.7;
}

/* 阅读清单：阅读状态分段按钮 */
.read-status-group {
  display: flex;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 2px;
}

.rs-btn {
  padding: 3px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-hint);
  cursor: pointer;
  transition: all 0.2s ease;
}

.rs-btn.active {
  background-color: #fff;
  color: #2e7d32;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.rating {
  flex-shrink: 0;
  text-align: right;
  font-size: 16px;
  font-weight: 700;
  color: #ff9800;
}

.rating-count {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: var(--text-hint);
}

.load-more {
  text-align: center;
}

/* 弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.dialog {
  width: 100%;
  max-width: 420px;
  background-color: var(--bg-card, #fff);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-close {
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  color: var(--text-hint);
}

.dialog-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
}

/* 从书库添加弹窗：加宽加高以容纳书籍列表 */
.dialog--libpick {
  max-width: 560px;
}

.dialog--libpick .dialog-body {
  max-height: 66vh;
}

/* 书库书籍选择列表 */
.lib-pick-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 8px;
}

.lib-pick-hint {
  text-align: center;
  color: var(--text-hint);
  font-size: 13px;
  padding: 16px 0;
}

.lib-pick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s;
}

.lib-pick-item:hover {
  background-color: var(--bg-primary);
}

.lib-pick-item.checked {
  background-color: rgba(255, 107, 53, 0.08);
}

.lib-pick-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lib-pick-item input[type='checkbox'] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: var(--primary-color);
  padding: 0;
}

.lib-pick-cover {
  width: 36px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background-color: var(--bg-secondary);
}

.lib-pick-cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-hint);
}

.lib-pick-info {
  flex: 1;
  min-width: 0;
}

.lib-pick-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lib-pick-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-hint);
  white-space: nowrap;
  overflow: hidden;
}

.lib-pick-done {
  font-size: 11px;
  color: var(--text-hint);
  flex-shrink: 0;
}

.pick-count {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: auto;
  padding-left: 4px;
}

.dialog-field--row {
  display: flex;
  gap: 12px;
}

.dialog-field--row > div {
  flex: 1;
}

.field-label {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 6px;
}

.required {
  color: #f44336;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  background-color: #fff;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--primary-color);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
}

.error-text {
  font-size: 13px;
  color: #f44336;
}

/* 刷新弹窗 */
.refresh-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-hint);
  line-height: 1.6;
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-text {
  font-size: 13px;
  color: var(--text-primary);
}

.progress-bar {
  height: 6px;
  background-color: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.refresh-result {
  font-size: 14px;
  color: var(--text-primary);
}

/* 多选模式开关（激活态） */
.tool-btn--active {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: rgba(255, 107, 53, 0.08);
}

/* 危险操作（批量划去） */
.tool-btn--danger:hover:not(:disabled) {
  border-color: #e53935;
  color: #e53935;
}

/* 批量操作条 */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  margin-top: 8px;
  background-color: rgba(255, 107, 53, 0.06);
  border: 1px solid rgba(255, 107, 53, 0.18);
  border-radius: var(--radius-md);
}

.batch-bar__count {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-color);
}

/* 小号次要按钮 */
.ds-mini {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background-color: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.ds-mini:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

/* 卡片多选复选框 */
.card-check {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 2px;
}

.card-check input {
  width: 17px;
  height: 17px;
  accent-color: var(--primary-color);
  cursor: pointer;
  padding: 0;
}

</style>
