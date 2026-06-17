<template>
  <div class="steps-container">
    <div class="steps">
      <template v-for="(step, index) in steps" :key="index">
        <div
          class="step"
          :class="{ active: currentStep >= index, completed: currentStep > index }"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-label">{{ step }}</div>
        </div>
        <div
          v-if="index < steps.length - 1"
          class="step-line"
          :class="{ active: currentStep > index }"
        ></div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ currentStep: number }>();

const steps = ['选择书库', '验证', '完成'];
</script>

<style scoped>
.steps-container {
  margin-bottom: 32px;
}

.steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.step.active .step-number {
  background-color: var(--primary-color);
  color: white;
}

.step.completed .step-number {
  background-color: var(--success-color);
  color: white;
}

.step-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.step.active .step-label {
  color: var(--primary-color);
  font-weight: 600;
}

.step-line {
  flex: 1;
  height: 2px;
  background-color: var(--border-color);
  margin: 0 8px;
  transition: background-color 0.3s ease;
}

.step-line.active {
  background-color: var(--success-color);
}
</style>
