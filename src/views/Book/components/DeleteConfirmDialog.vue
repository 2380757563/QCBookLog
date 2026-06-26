<template>
  <div class="dialog-overlay" @click="$emit('update:show', false)">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <span>{{ title || '确认删除' }}</span>
        <span class="dialog-close" @click="$emit('update:show', false)">×</span>
      </div>
      <div class="dialog-body">
        <p style="margin-bottom: 16px;">{{ message || '确定要删除吗？' }}</p>
        <p v-if="warning" style="font-size:12px; color:#999999; margin:0; padding:0;">{{ warning }}</p>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-default" @click="$emit('update:show', false)">取消</button>
        <button class="btn btn-danger" @click="$emit('confirm')">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  title?: string;
  message?: string;
  warning?: string;
}>();

defineEmits<{
  'update:show': [value: boolean];
  'confirm': [];
}>();
</script>
