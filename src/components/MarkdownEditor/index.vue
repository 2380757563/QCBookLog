<template>
  <div class="markdown-editor-wrapper">
    <div class="editor-toolbar">
      <button class="toolbar-btn" @click="toggleMode" :title="isSourceMode ? '所见即所得' : '源码模式'">
        <svg v-if="isSourceMode" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
        <svg v-else viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
      </button>
      <span class="toolbar-divider"></span>
      <button class="toolbar-btn" @click="execHeading(1)" title="一级标题"><strong>H1</strong></button>
      <button class="toolbar-btn" @click="execHeading(2)" title="二级标题"><strong>H2</strong></button>
      <button class="toolbar-btn" @click="execHeading(3)" title="三级标题"><strong>H3</strong></button>
      <span class="toolbar-divider"></span>
      <button class="toolbar-btn" @click="execBold" title="加粗"><strong>B</strong></button>
      <button class="toolbar-btn" @click="execItalic" title="斜体"><em>I</em></button>
      <button class="toolbar-btn" @click="execStrike" title="删除线"><s>S</s></button>
      <span class="toolbar-divider"></span>
      <button class="toolbar-btn" @click="execBlockquote" title="引用">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
      </button>
      <button class="toolbar-btn" @click="execBulletList" title="无序列表">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 10.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM8 7h12v2H8zm0 6h12v2H8z"/></svg>
      </button>
      <button class="toolbar-btn" @click="execOrderedList" title="有序列表">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
      </button>
      <button class="toolbar-btn" @click="execCodeBlock" title="代码块">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
      </button>
      <span class="toolbar-divider"></span>
      <button class="toolbar-btn" @click="execLink" title="链接">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
      </button>
      <button class="toolbar-btn" @click="execTable" title="表格">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 5h15v4H5V5zm0 6h5v4H5v-4zm0 10v-4h5v4H5zm15 0h-8v-4h8v4zm0-6h-8v-4h8v4z"/></svg>
      </button>
      <span class="toolbar-divider"></span>
      <button class="toolbar-btn" @click="execHorizontalRule" title="分割线">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>
      </button>
      <span class="toolbar-spacer"></span>
      <span class="word-count">{{ wordCount }} 字</span>
    </div>

    <div class="editor-content">
      <MilkdownEditor
        v-if="!isSourceMode"
        ref="editorRef"
        :model-value="modelValue"
        @update:model-value="handleUpdate"
      />
      <textarea
        v-else
        class="source-mode-editor"
        :value="modelValue"
        @input="handleSourceInput"
        placeholder="在此输入 Markdown 内容..."
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import MilkdownEditor from './MilkdownEditor.vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const isSourceMode = ref(false);
const editorRef = ref<InstanceType<typeof MilkdownEditor> | null>(null);

const wordCount = computed(() => {
  if (!props.modelValue) return 0;
  const text = props.modelValue
    .replace(/[#*_~`>\\[\]()!-]/g, '')
    .replace(/\n/g, '')
    .trim();
  return text.length;
});

const toggleMode = () => {
  isSourceMode.value = !isSourceMode.value;
  nextTick(() => {
    // 切换后聚焦编辑器
    if (!isSourceMode.value) {
      // WYSIWYG 模式在切回后聚焦
      editorRef.value?.$el?.querySelector?.('.ProseMirror')?.focus();
    }
  });
};

const handleUpdate = (value: string) => {
  emit('update:modelValue', value);
};

const handleSourceInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};

// 源码模式：直接在光标处插入文本
const insertAtCursor = (text: string) => {
  const textarea = document.querySelector('.source-mode-editor') as HTMLTextAreaElement | null;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const newValue = value.substring(0, start) + text + value.substring(end);
    emit('update:modelValue', newValue);
    // 光标定位
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    });
    return;
  }
  emit('update:modelValue', props.modelValue + text);
};

// —— 各工具栏动作 ——
const execHeading = (level: number) => {
  if (isSourceMode.value) {
    insertAtCursor(`\n${'#'.repeat(level)} `);
  } else {
    editorRef.value?.toggleHeading(level);
  }
};

const execBold = () => {
  if (isSourceMode.value) {
    insertAtCursor('****');
  } else {
    editorRef.value?.toggleBold();
  }
};

const execItalic = () => {
  if (isSourceMode.value) {
    insertAtCursor('**');
  } else {
    editorRef.value?.toggleItalic();
  }
};

const execStrike = () => {
  if (isSourceMode.value) {
    insertAtCursor('~~~~');
  } else {
    editorRef.value?.toggleStrike();
  }
};

const execBlockquote = () => {
  if (isSourceMode.value) {
    insertAtCursor('\n> ');
  } else {
    editorRef.value?.wrapInBlockquote();
  }
};

const execBulletList = () => {
  if (isSourceMode.value) {
    insertAtCursor('\n- ');
  } else {
    editorRef.value?.wrapInBulletList();
  }
};

const execOrderedList = () => {
  if (isSourceMode.value) {
    insertAtCursor('\n1. ');
  } else {
    editorRef.value?.wrapInOrderedList();
  }
};

const execCodeBlock = () => {
  if (isSourceMode.value) {
    insertAtCursor('\n```\n\n```\n');
  } else {
    editorRef.value?.insertCodeBlock();
  }
};

const execLink = () => {
  if (isSourceMode.value) {
    insertAtCursor('[链接文字](https://)');
  } else {
    editorRef.value?.insertLink();
  }
};

const execTable = () => {
  if (isSourceMode.value) {
    insertAtCursor('\n| 列1 | 列2 | 列3 |\n|------|------|------|\n| 内容 | 内容 | 内容 |\n');
  } else {
    editorRef.value?.insertTable();
  }
};

const execHorizontalRule = () => {
  if (isSourceMode.value) {
    insertAtCursor('\n---\n');
  } else {
    editorRef.value?.insertHorizontalRule();
  }
};
</script>

<style scoped>
.markdown-editor-wrapper {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-card, #fff);
}
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  background: #f8f8f8;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
}
.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #555;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}
.toolbar-btn:hover { background: #e0e0e0; color: #333; }
.toolbar-btn:active { background: #d0d0d0; }
.toolbar-divider { width: 1px; height: 18px; background: #d0d0d0; margin: 0 4px; }
.toolbar-spacer { flex: 1; }
.word-count { font-size: 12px; color: #999; white-space: nowrap; }
.editor-content { min-height: 300px; position: relative; }
.source-mode-editor {
  width: 100%;
  min-height: 300px;
  padding: 16px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: #fafafa;
  color: #333;
}
</style>
