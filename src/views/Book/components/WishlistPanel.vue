<template>
  <div class="wishlist">
    <div v-if="wishlist.length === 0" class="empty-state">
      <span class="empty-icon">📝</span>
      <p>待购买书单为空</p>
    </div>
    <div v-else>
      <div v-for="item in wishlist" :key="item.id" class="wishlist-item">
        <span class="wishlist-title">{{ item.title }}</span>
        <span class="wishlist-author">{{ item.author }}</span>
        <button class="btn-text" @click="$emit('remove', item.isbn)">移除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WishlistItem } from '@/api/wishlistService';

defineProps<{
  wishlist: WishlistItem[];
}>();

defineEmits<{
  'remove': [isbn: string];
}>();
</script>
