<template>
  <div class="dialog-overlay" @click="$emit('update:show', false)">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <span>{{ isEditing ? '编辑分组' : '新建分组' }}</span>
        <span class="dialog-close" @click="$emit('update:show', false)">×</span>
      </div>
      <div class="dialog-body">
        <input
          v-model="localName"
          class="input"
          placeholder="请输入分组名称"
          @keydown.enter="$emit('save', localName)"
        />
      </div>
      <div class="dialog-footer">
        <button class="btn btn-default" @click="$emit('update:show', false)">取消</button>
        <button
          class="btn btn-primary"
          :disabled="!localName.trim()"
          @click="$emit('save', localName.trim())"
        >确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  show: boolean;
  isEditing: boolean;
  initialName: string;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'save': [name: string];
}>();

const localName = ref(props.initialName);

watch(
  () => [props.show, props.initialName] as const,
  ([show, initialName]) => {
    if (show) {
      localName.value = initialName;
    }
  }
);
</script>
