<template>
  <div
    :class="[
      'xm-book-card',
      `xm-book-card--${layout}`,
      {
        'xm-book-card--hover': showActions
      }
    ]"
    @click="handleClick"
  >
    <!-- 书籍封面 -->
    <div class="book-card__cover-wrapper" :style="coverWrapperStyle">
      <img
        v-if="book.localCoverData || book.coverUrl"
        :src="book.localCoverData || book.coverUrl"
        :alt="book.title"
        class="book-card__cover"
        loading="lazy"
      />
      <div
        v-else
        class="book-card__cover book-card__cover--placeholder"
      >
        <span class="book-card__cover-placeholder-text">{{ book.title.charAt(0) }}</span>
      </div>
      <div class="book-card__read-status" :class="`book-card__read-status--${book.readStatus}`">
        {{ book.readStatus }}
      </div>
      <!-- 书籍来源 badge -->
      <div
        v-if="book.source"
        class="book-card__source"
        :title="`来源：${getSourceLabel(book.source)}`"
      >
        {{ getSourceShortLabel(book.source) }}
      </div>
    </div>

    <!-- 书籍信息 - 带包边效果 -->
    <div class="book-card__info-wrapper">
      <div class="book-card__info">
        <h3 class="book-card__title">{{ book.title }}</h3>
        <p class="book-card__author">{{ book.author }}</p>
        
        <!-- 评分 -->
        <div v-if="book.rating" class="book-card__rating">
          <RatingDisplay :value="book.rating" :show-value="true" size="small" />
        </div>

        <!-- 标签 -->
        <div v-if="book.tags.length > 0" class="book-card__tags">
          <span
            v-for="tag in book.tags.slice(0, 3)"
            :key="tag"
            class="book-card__tag"
          >
            {{ tag }}
          </span>
          <span v-if="book.tags.length > 3" class="book-card__tag-more">
            +{{ book.tags.length - 3 }}
          </span>
        </div>
      </div>

      <!-- 装帧包边 - 包裹信息区域 -->
      <BindingBorder
        v-if="showBindingBorder"
        :binding1="binding1"
        :binding2="binding2"
        :params="bindingBorderParams"
        class="book-card__binding-border"
      />
    </div>

    <!-- 操作按钮 -->
    <div v-if="showActions" class="book-card__actions">
      <button
        class="book-card__action-btn book-card__action-btn--view"
        @click.stop="handleViewBookmarks"
        title="查看书摘"
      >
        📝
      </button>
      <button
        class="book-card__action-btn book-card__action-btn--edit"
        @click.stop="handleEdit"
        title="编辑"
      >
        ✏️
      </button>
      <button
        class="book-card__action-btn book-card__action-btn--delete"
        @click.stop="handleDelete"
        title="删除"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BookCardProps, BookCardEmits } from './types';
import { useBookBorderStore } from '@/store/bookBorder';
import { BookStatus } from '@/store/bookBorder/types';
import { useBindingBorderStore } from '@/store/bindingBorder';
import { API_CONFIGS } from '@/services/common/isbnApi/apiConfig';
import {
  getBindingType,
  getHardcoverTexture,
  shouldShowOilEdge,
  getSpecialPattern,
  getPaperbackVariant,
  getEbookVariant,
  BindingBorderParams,
  Binding1Type,
  Binding2Type
} from '@/store/bindingBorder/types';
import BindingBorder from '@/components/business/BindingBorder/BindingBorder.vue';
import RatingDisplay from '@/components/business/RatingDisplay.vue';

// 书籍来源标签映射
const SOURCE_SHORT_LABELS: Record<string, string> = {
  dbr: 'DBR',
  douban: '豆瓣',
  isbnWork: '公共',
  tanshu: '探数',
  manual: '手动',
  calibre: 'Calibre'
};

// 获取书源显示名称
const getSourceLabel = (source: string): string => {
  if (!source) return '';
  const key = source.toLowerCase();
  if (API_CONFIGS[key]) return API_CONFIGS[key].name;
  if (SOURCE_SHORT_LABELS[key]) return SOURCE_SHORT_LABELS[key];
  return source;
};

// 获取书源短标签（用于卡片 badge）
const getSourceShortLabel = (source: string): string => {
  if (!source) return '';
  const key = source.toLowerCase();
  return SOURCE_SHORT_LABELS[key] || source;
};

const props = withDefaults(defineProps<BookCardProps>(), {
  layout: 'grid',
  showActions: true
});

const emit = defineEmits<BookCardEmits>();
const borderStore = useBookBorderStore();
const bindingBorderStore = useBindingBorderStore();

const bookStatus = computed((): BookStatus => {
  if (props.book.favorite === 1) {
    return 'favorite';
  }
  if (props.book.wants === 1) {
    return 'pending';
  }
  return 'normal';
});

const borderParams = computed(() => borderStore.getBorderParams(bookStatus.value));

const binding1 = computed((): Binding1Type => {
  const val = props.book.binding1;
  if (val === undefined || val === null) return 1;
  return val as Binding1Type;
});
const binding2 = computed((): Binding2Type => {
  const val = props.book.binding2;
  if (val === undefined || val === null) return 0;
  return val as Binding2Type;
});

const showBindingBorder = computed(() => true);

const bindingBorderParams = computed((): BindingBorderParams => {
  const type = getBindingType(binding1.value);
  const settings = bindingBorderStore.settings;
  
  // 直接使用设置的参数（包含 texture），不再根据 binding2 覆盖
  switch (type) {
    case 'ebook':
      return { ...settings.ebook };
    case 'paperback':
      return { ...settings.paperback };
    case 'hardcover':
      return { ...settings.hardcover };
    case 'special':
      return { ...settings.special };
    default:
      return settings.paperback;
  }
});

const coverWrapperStyle = computed(() => {
  const params = borderParams.value;
  const style: Record<string, string> = {
    borderRadius: `${params.borderRadius}px`
  };

  if (params.glow.enabled) {
    style.boxShadow = `0 0 ${params.glow.spread}px ${params.glow.color}`;
  }

  switch (params.type) {
    case 'normal-1':
    case 'normal-2':
    case 'normal-3':
    case 'normal-4':
    case 'normal-5':
    case 'pending-2':
    case 'favorite-4':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      if (params.type === 'normal-2' && 'hoverEnabled' in params && params.hoverEnabled) {
        style.borderColor = 'transparent';
      }
      break;
    case 'pending-1':
      const dashLength = 6 * (params.dashRatio || 1);
      style.border = `${params.lineWidth}px dashed ${params.color}`;
      break;
    case 'pending-3':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      break;
    case 'pending-4':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      break;
    case 'pending-5':
    case 'favorite-2':
    case 'favorite-5':
      if ('gradientStartColor' in params && 'gradientEndColor' in params) {
        style.border = `${params.lineWidth}px solid transparent`;
        style.backgroundImage = `linear-gradient(#f5f5f5, #f5f5f5), linear-gradient(135deg, ${params.gradientStartColor}, ${params.gradientEndColor})`;
        style.backgroundOrigin = 'border-box';
        style.backgroundClip = 'padding-box, border-box';
      }
      break;
    case 'favorite-1':
      const gap = 'doubleLineGap' in params ? params.doubleLineGap : 4;
      style.border = `${params.lineWidth}px solid ${params.color}`;
      style.boxShadow = `inset 0 0 0 ${gap}px #f5f5f5, inset 0 0 0 ${gap + params.lineWidth}px ${params.color}`;
      if (params.glow.enabled) {
        style.boxShadow += `, 0 0 ${params.glow.spread}px ${params.glow.color}`;
      }
      break;
    case 'favorite-3':
      style.border = `${params.lineWidth}px solid ${params.color}`;
      break;
  }

  return style;
});

const handleClick = () => {
  emit('click', props.book.id);
};

const handleEdit = () => {
  emit('edit', props.book.id);
};

const handleDelete = () => {
  emit('delete', props.book.id);
};

const handleViewBookmarks = () => {
  emit('viewBookmarks', props.book.id);
};
</script>

<style scoped>
.xm-book-card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.xm-book-card--grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* 移除 max-width 限制，让卡片自适应网格宽度 */
}

.xm-book-card--list {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
}

.xm-book-card--hover:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 8px rgba(0, 0, 0, 0.06);
}

/* 封面样式 */
.book-card__cover-wrapper {
  position: relative;
  width: 100%;
  padding-top: 133.33%; /* 3:4 比例 */
  overflow: hidden;
  background-color: #f5f5f5;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.xm-book-card--list .book-card__cover-wrapper {
  width: 80px;
  height: 107px;
  padding-top: 0;
  margin-right: 16px;
}

.xm-book-card--hover:hover .book-card__cover-wrapper {
  border-color: inherit !important;
}

.book-card__cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  z-index: 1;
}

.xm-book-card--hover:hover .book-card__cover {
  transform: scale(1.05);
}

.book-card__cover--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  color: #666;
  font-size: 48px;
}

.xm-book-card--list .book-card__cover--placeholder {
  font-size: 32px;
}

.book-card__cover-placeholder-text {
  line-height: 1;
}

/* 阅读状态标签 */
.book-card__read-status {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  z-index: 10;
}

.book-card__read-status--未读 {
  background-color: #999;
}

.book-card__read-status--在读 {
  background-color: #3498db;
}

.book-card__read-status--已读 {
  background-color: #2ecc71;
}

/* 书籍来源 badge */
.book-card__source {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background-color: rgba(155, 89, 182, 0.9);
  z-index: 10;
  line-height: 1.4;
  cursor: help;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

/* 信息包装器 - 带立体包边效果 */
.book-card__info-wrapper {
  position: relative;
  flex: 1;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(250, 250, 250, 0.9) 100%
  );
  box-shadow: 
    inset 0 1px 3px rgba(0, 0, 0, 0.05),
    inset -2px -2px 8px rgba(0, 0, 0, 0.03);
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

.xm-book-card--list .book-card__info-wrapper {
  border-radius: 8px;
  margin: -4px;
}

/* 信息部分 */
.book-card__info {
  padding: 12px;
  position: relative;
  z-index: 2;
}

.xm-book-card--list .book-card__info {
  flex: 1;
  padding: 8px 12px;
}

.book-card__title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.xm-book-card--list .book-card__title {
  -webkit-line-clamp: 1;
  font-size: 18px;
}

.book-card__author {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 评分 */
.book-card__rating {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.book-card__rating-text {
  margin-right: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #f39c12;
}

.book-card__rating-stars {
  display: flex;
}

.book-card__rating-star {
  font-size: 14px;
  color: #ddd;
}

.book-card__rating-star--filled {
  color: #f39c12;
}

.book-card__rating-star--half {
  background: linear-gradient(90deg, #f39c12 50%, #ddd 50%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 标签 */
.book-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.book-card__tag {
  padding: 2px 6px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.book-card__tag-more {
  padding: 2px 6px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

/* 包边样式 */
.book-card__binding-border {
  z-index: 5;
}

/* 操作按钮 */
.book-card__actions {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 20;
}

.xm-book-card--hover:hover .book-card__actions {
  opacity: 1;
}

.xm-book-card--list .book-card__actions {
  position: static;
  opacity: 1;
  margin-left: auto;
}

.book-card__action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.book-card__action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.book-card__action-btn--view:hover {
  background-color: #e3f2fd;
}

.book-card__action-btn--edit:hover {
  background-color: #fff3e0;
}

.book-card__action-btn--delete:hover {
  background-color: #ffebee;
}
</style>
