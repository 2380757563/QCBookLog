<!-- 花费篇：实付 / 定价 / 省下 / 折扣 -->
<template>
  <SectionShell
    :index="2"
    title="花费篇"
    :caption="caption"
    anchor="spending"
    :empty="empty"
  >
    <p class="narrative">{{ text }}</p>

    <div class="ledger">
      <div class="ledger__item">
        <span class="ledger__label">实付金额</span>
        <span class="ledger__value">¥{{ money(spending.totalPaid) }}</span>
      </div>
      <div class="ledger__item">
        <span class="ledger__label">图书定价</span>
        <span class="ledger__value ledger__value--muted">¥{{ money(spending.totalStandard) }}</span>
      </div>
      <div class="ledger__item ledger__item--highlight">
        <span class="ledger__label">省下的钱</span>
        <span class="ledger__value">¥{{ money(spending.savedAmount) }}</span>
      </div>
    </div>

    <div class="facts">
      <span v-if="discountText" class="fact">平均 {{ discountText }}</span>
      <span v-if="avgPriceText" class="fact">单本均价 ¥{{ avgPriceText }}</span>
      <span v-if="spending.pricedBookCount" class="fact">{{ spending.pricedBookCount }} 本有价格记录</span>
    </div>

    <div v-if="mostExpensive" class="expensive">
      <span class="expensive__tag">最贵的一本</span>
      <span class="expensive__title">《{{ mostExpensive.title }}》</span>
      <span v-if="mostExpensive.author" class="expensive__author">{{ mostExpensive.author }}</span>
      <span v-if="mostExpensive.price" class="expensive__price">¥{{ money(mostExpensive.price) }}</span>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext, isMeaningfulBlock } from '../../composables/useReportContext';

const ctx = useReportContext();

const spending = computed(() => ctx.section('spending') ?? {});
const text = computed(() => ctx.text('spending'));
const empty = computed(() => !(spending.value.totalPaid > 0) && !isMeaningfulBlock(spending.value));

const money = (v: any) => {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return '0';
  return n.toFixed(2);
};

const discountText = computed(() => {
  const d = Number(spending.value.avgDiscount);
  return isFinite(d) && d > 0 ? `${d.toFixed(2)} 折` : '';
});

const avgPriceText = computed(() => {
  const p = Number(spending.value.avgPrice);
  return isFinite(p) && p > 0 ? p.toFixed(2) : '';
});

const mostExpensive = computed(() => spending.value.mostExpensive || null);

const caption = computed(() => {
  const count = Number(spending.value.pricedBookCount);
  return count > 0 ? `${count} 本有价格记录` : '';
});
</script>

<style scoped>
.narrative {
  margin: 0 0 24px;
  text-indent: 2em;
}

.ledger {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.ledger__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 14px;
  border-radius: 8px;
  background: rgba(255, 253, 247, 0.8);
  border: 1px solid rgba(201, 162, 39, 0.22);
}

.ledger__item--highlight {
  background: linear-gradient(135deg, rgba(201, 162, 39, 0.12), rgba(201, 162, 39, 0.04));
  border-color: rgba(201, 162, 39, 0.45);
}

.ledger__label {
  font-size: 12px;
  letter-spacing: 0.06em;
  color: #9c8b73;
}

.ledger__value {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22px;
  font-weight: 700;
  color: #8c6239;
}

.ledger__value--muted {
  color: #a9927d;
  font-weight: 400;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-bottom: 18px;
}

.fact {
  padding: 4px 12px;
  font-size: 12px;
  color: #6b5c47;
  background: rgba(201, 191, 174, 0.22);
  border-radius: 999px;
}

.expensive {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-left: 3px solid #c9a227;
  background: rgba(255, 253, 247, 0.7);
}

.expensive__tag {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: #c9a227;
}

.expensive__title {
  font-size: 15px;
  font-weight: 600;
  color: #2b2118;
}

.expensive__author {
  font-size: 13px;
  color: #9c8b73;
}

.expensive__price {
  margin-left: auto;
  font-family: Georgia, serif;
  font-size: 16px;
  color: #8c6239;
}

@media (max-width: 640px) {
  .ledger {
    grid-template-columns: 1fr;
  }
}
</style>
