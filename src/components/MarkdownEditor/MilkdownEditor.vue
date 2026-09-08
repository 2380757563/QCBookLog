<template>
  <div class="milkdown-wrapper">
    <MilkdownProvider>
      <EditorInner
        ref="innerRef"
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </MilkdownProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineComponent, h } from 'vue';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/core';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/vue';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/plugin-history';
import { clipboard } from '@milkdown/plugin-clipboard';
import { replaceAll } from '@milkdown/utils';
import type { NodeType, MarkType } from 'prosemirror-model';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

interface InnerExpose {
  insertText: (text: string) => void;
  toggleHeading: (level: number) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleStrike: () => void;
  wrapInBlockquote: () => void;
  wrapInBulletList: () => void;
  wrapInOrderedList: () => void;
  insertCodeBlock: () => void;
  insertHorizontalRule: () => void;
  insertLink: () => void;
  insertTable: () => void;
}

const innerRef = ref<InnerExpose | null>(null);

const EditorInner = defineComponent({
  name: 'MilkdownEditorInner',
  props: {
    modelValue: { type: String, required: true },
  },
  emits: ['update:modelValue'],
  setup(innerProps, { emit: innerEmit, expose }) {
    const isInternalChange = ref(false);
    // 标记"刚刚由编辑器内部输入回传的值"，watch 收到该值时跳过 replaceAll，避免光标被重置
    const lastInternalEmit = ref('');
    let resetInternalFlag: number | null = null;

    useEditor((root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, innerProps.modelValue || '');
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            if (!isInternalChange.value) {
              // 记录最近一次内部输入回传的值，用于 watch 跳过 replaceAll
              lastInternalEmit.value = markdown;
              if (resetInternalFlag) {
                clearTimeout(resetInternalFlag);
                resetInternalFlag = 0;
              }
              resetInternalFlag = window.setTimeout(() => {
                lastInternalEmit.value = '';
              }, 300);
              innerEmit('update:modelValue', markdown);
            }
          });
        })
        .use(commonmark)
        .use(gfm)
        .config(nord)
        .use(listener)
        .use(history)
        .use(clipboard)
    );

    const [loading, getEditor] = useInstance();

    watch(() => innerProps.modelValue, (newVal) => {
      if (loading.value) return;
      const editor = getEditor();
      if (!editor || newVal === undefined) return;
      // 用户输入触发的回传（编辑器内部已经更新），无需 replaceAll，避免光标跳到末尾
      if (lastInternalEmit.value === newVal) {
        lastInternalEmit.value = '';
        if (resetInternalFlag) {
          clearTimeout(resetInternalFlag);
          resetInternalFlag = 0;
        }
        return;
      }
      isInternalChange.value = true;
      editor.action(replaceAll(newVal || ''));
      isInternalChange.value = false;
    });

    // —— 工具函数 ——
    const getView = () => {
      const editor = getEditor();
      if (!editor) return null;
      let view: any = null;
      editor.action((ctx: any) => {
        view = ctx.get(editorViewCtx);
      });
      return view;
    };

    // 在当前光标位置插入纯文本（简单插入）
    const insertText = (text: string) => {
      const view = getView();
      if (!view) return;
      const { state, dispatch } = view;
      dispatch(state.tr.insertText(text));
      view.focus();
    };

    // 切换当前块为 heading / 普通段落
    const toggleHeading = (level: number) => {
      const view = getView();
      if (!view) return;
      const { state, dispatch } = view;
      const { $from, $to } = state.selection;
      if ($from.parent.type.name === 'heading' && $from.parent.attrs.level === level) {
        // 已是同级标题 → 变回普通段落
        setBlockType(state, dispatch, 'paragraph', {});
      } else {
        // 设为标题
        setBlockType(state, dispatch, 'heading', { level });
      }
      view.focus();
    };

    const setBlockType = (state: any, dispatch: any, nodeName: string, attrs: Record<string, any> = {}) => {
      const schema = state.schema;
      const nodeType = schema.nodes[nodeName] as NodeType | undefined;
      if (!nodeType) return;
      const { $from, $to } = state.selection;
      let tr = state.tr;
      const range = $from.blockRange($to);
      if (range) {
        tr = tr.setBlockType(range.start, range.end, nodeType, attrs);
      } else {
        tr = tr.setBlockType($from.pos, $from.pos, nodeType, attrs);
      }
      dispatch(tr);
    };

    // 切换行内 mark（粗体/斜体/删除线等）
    const toggleMark = (markName: string, attrs: Record<string, any> = {}) => {
      const view = getView();
      if (!view) return;
      const { state, dispatch } = view;
      const schema = state.schema;
      const markType = (schema.marks as Record<string, MarkType>)[markName];
      if (!markType) return;
      const { from, to, empty } = state.selection;
      if (empty) {
        // 空选区：直接切换 mark 激活状态（后续输入会带上 mark）
        const hasMark = state.storedMarks?.some((m: any) => m.type === markType)
          || (state.selection.$from.marks().some((m: any) => m.type === markType));
        if (hasMark) {
          dispatch(state.tr.removeStoredMark(markType));
        } else {
          dispatch(state.tr.addStoredMark(markType.create(attrs)));
        }
      } else {
        // 有选区：toggle
        const hasMark = state.doc.rangeHasMark(from, to, markType);
        let tr = state.tr;
        if (hasMark) {
          tr = tr.removeMark(from, to, markType);
        } else {
          tr = tr.addMark(from, to, markType.create(attrs));
        }
        dispatch(tr);
      }
      view.focus();
    };

    const toggleBold = () => toggleMark('strong');
    const toggleItalic = () => toggleMark('em');
    const toggleStrike = () => toggleMark('strike_through');

    // 引用：用 wrap 方式把当前段落包进 blockquote
    const wrapInBlockquote = () => {
      const view = getView();
      if (!view) return;
      const { state, dispatch } = view;
      const schema = state.schema;
      const wrapType = schema.nodes['blockquote'];
      if (!wrapType) return;
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return;
      // 检查是否已在 blockquote 里（外层 unwrap）
      const parent = $from.node(range.depth - 1 < 0 ? 0 : range.depth - 1);
      if (parent && parent.type.name === 'blockquote') {
        // 解开：lift
        const tr = state.tr.lift(range, range.depth - 1 < 0 ? 0 : range.depth - 1);
        dispatch(tr);
      } else {
        const wrapping = wrapType && [{ type: wrapType }];
        if (!wrapping) return;
        const tr = state.tr.wrap(range, wrapping);
        dispatch(tr);
      }
      view.focus();
    };

    // 无序列表
    const wrapInBulletList = () => {
      wrapInList('bullet_list');
    };

    // 有序列表
    const wrapInOrderedList = () => {
      wrapInList('ordered_list');
    };

    const wrapInList = (listNodeName: string) => {
      const view = getView();
      if (!view) return;
      const { state, dispatch } = view;
      const schema = state.schema;
      const listNode = schema.nodes[listNodeName];
      const listItem = schema.nodes['list_item'];
      if (!listNode || !listItem) return;
      const { $from, $to } = state.selection;
      const range = $from.blockRange($to);
      if (!range) return;

      // 检查当前是否已在对应列表里，是则 lift 出列表
      const grandParent = $from.node(range.depth - 2 < 0 ? 0 : range.depth - 2);
      if (grandParent && grandParent.type.name === listNodeName) {
        const tr = state.tr.lift(range, range.depth - 2 < 0 ? 0 : range.depth - 2);
        dispatch(tr);
      } else {
        const wrapping = [
          { type: listNode },
          { type: listItem },
        ];
        const tr = state.tr.wrap(range, wrapping);
        dispatch(tr);
      }
      view.focus();
    };

    // 插入代码块
    const insertCodeBlock = () => {
      const view = getView();
      if (!view) return;
      const { state, dispatch } = view;
      const schema = state.schema;
      const codeBlockNode = schema.nodes['code_block'];
      if (!codeBlockNode) return;
      const { $from } = state.selection;
      const pos = $from.start($from.depth);
      const node = codeBlockNode.create({}, schema.text(''));
      const tr = state.tr.replaceRangeWith(pos, $from.end($from.depth), node);
      dispatch(tr);
      view.focus();
    };

    // 插入分割线
    const insertHorizontalRule = () => {
      const view = getView();
      if (!view) return;
      const { state, dispatch } = view;
      const schema = state.schema;
      const hrNode = schema.nodes['hr'];
      if (!hrNode) return;
      const { $from } = state.selection;
      const endOfBlock = $from.after();
      const node = hrNode.create();
      dispatch(state.tr.insert(endOfBlock, node));
      view.focus();
    };

    // 插入链接
    const insertLink = () => {
      const view = getView();
      if (!view) return;
      const { state, dispatch } = view;
      const schema = state.schema;
      const linkMark = schema.marks['link'];
      if (!linkMark) {
        // fallback: 直接插入文本
        insertText('[链接文字](https://)');
        return;
      }
      const { from, to, empty, $from } = state.selection;
      const url = 'https://';
      const text = empty ? '链接文字' : state.doc.textBetween(from, to);
      const mark = linkMark.create({ href: url });
      let tr = state.tr;
      if (empty) {
        tr = tr.insertText(text);
        const newTo = $from.pos + text.length;
        tr = tr.addMark($from.pos, newTo, mark);
      } else {
        tr = tr.addMark(from, to, mark);
      }
      dispatch(tr);
      view.focus();
    };

    // 插入表格
    const insertTable = () => {
      // gfm preset 提供 table，但构造较复杂；兜底用纯文本插入
      insertText('\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n');
    };

    expose({
      insertText,
      toggleHeading,
      toggleBold,
      toggleItalic,
      toggleStrike,
      wrapInBlockquote,
      wrapInBulletList,
      wrapInOrderedList,
      insertCodeBlock,
      insertHorizontalRule,
      insertLink,
      insertTable,
    });

    return () => h(Milkdown);
  },
});

defineExpose({
  insertText: (text: string) => innerRef.value?.insertText(text),
  toggleHeading: (level: number) => innerRef.value?.toggleHeading(level),
  toggleBold: () => innerRef.value?.toggleBold(),
  toggleItalic: () => innerRef.value?.toggleItalic(),
  toggleStrike: () => innerRef.value?.toggleStrike(),
  wrapInBlockquote: () => innerRef.value?.wrapInBlockquote(),
  wrapInBulletList: () => innerRef.value?.wrapInBulletList(),
  wrapInOrderedList: () => innerRef.value?.wrapInOrderedList(),
  insertCodeBlock: () => innerRef.value?.insertCodeBlock(),
  insertHorizontalRule: () => innerRef.value?.insertHorizontalRule(),
  insertLink: () => innerRef.value?.insertLink(),
  insertTable: () => innerRef.value?.insertTable(),
});
</script>

<style>
.milkdown-wrapper {
  min-height: 300px;
}
.milkdown-wrapper .milkdown {
  padding: 16px;
  min-height: 268px;
}
.milkdown-wrapper .ProseMirror {
  outline: none;
  min-height: 268px;
  font-size: 15px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.milkdown-wrapper .ProseMirror h1 { font-size: 1.8em; margin: 0.5em 0; font-weight: 700; }
.milkdown-wrapper .ProseMirror h2 { font-size: 1.5em; margin: 0.5em 0; font-weight: 700; }
.milkdown-wrapper .ProseMirror h3 { font-size: 1.2em; margin: 0.5em 0; font-weight: 600; }
.milkdown-wrapper .ProseMirror p { margin: 0.5em 0; }
.milkdown-wrapper .ProseMirror blockquote { border-left: 4px solid #ddd; padding-left: 1em; margin: 0.5em 0; color: #666; }
.milkdown-wrapper .ProseMirror pre { background: #f5f5f5; border-radius: 6px; padding: 12px 16px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 14px; overflow-x: auto; }
.milkdown-wrapper .ProseMirror code { background: #f0f0f0; border-radius: 3px; padding: 1px 4px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.9em; }
.milkdown-wrapper .ProseMirror ul, .milkdown-wrapper .ProseMirror ol { padding-left: 1.5em; margin: 0.5em 0; }
.milkdown-wrapper .ProseMirror li { margin: 0.25em 0; }
.milkdown-wrapper .ProseMirror table { border-collapse: collapse; width: 100%; }
.milkdown-wrapper .ProseMirror th, .milkdown-wrapper .ProseMirror td { border: 1px solid #ddd; padding: 6px 12px; text-align: left; }
.milkdown-wrapper .ProseMirror th { background: #f5f5f5; font-weight: 600; }
.milkdown-wrapper .ProseMirror hr { border: none; border-top: 2px solid #e0e0e0; margin: 1em 0; }
.milkdown-wrapper .ProseMirror a { color: #0066cc; text-decoration: underline; }
.milkdown-wrapper .ProseMirror img { max-width: 100%; border-radius: 6px; }
.milkdown-wrapper .ProseMirror .tableWrapper { overflow-x: auto; }
</style>
