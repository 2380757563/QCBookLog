<template>
  <div class="reading-goal-card">
    <!-- 阅读目标卡片 -->
    <div class="card reading-goal">
      <div class="goal-header">
        <span class="goal-title">🎯 今年已读计划</span>
        <span class="goal-setting" @click="showGoalDialog = true">设置目标</span>
      </div>
      <div class="goal-progress">
        <div class="goal-number">
          <span class="current">{{ readingStats.readThisYear }}</span>
          <span class="separator">/</span>
          <span class="target">{{ readingGoal }}</span>
          <span class="unit">本</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: goalProgress + '%' }"></div>
        </div>
        <p class="goal-tip">{{ goalTip }}</p>
      </div>
    </div>

    <!-- 目标设置弹窗 -->
    <div v-if="showGoalDialog" class="dialog-overlay" @click="showGoalDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>设置阅读目标</span>
          <span class="dialog-close" @click="showGoalDialog = false">×</span>
        </div>
        <div class="dialog-body">
          <input
            type="number"
            v-model.number="tempGoal"
            class="goal-input"
            placeholder="请输入目标册数"
            min="1"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showGoalDialog = false">取消</button>
          <button class="btn btn-primary" @click="handleSaveGoal">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { readingGoalsService } from '@/services/readingGoalsService';

// 阅读统计数据
interface ReadingStats {
  readThisYear: number;
}

// Props
interface Props {
  readingStats: ReadingStats;
}

const props = defineProps<Props>();

// 内部状态
const readingGoal = ref(12);
const showGoalDialog = ref(false);
const tempGoal = ref(12);

// 计算属性
const goalProgress = computed(() => {
  return Math.min((props.readingStats.readThisYear / readingGoal.value) * 100, 100);
});

const goalTip = computed(() => {
  const remaining = readingGoal.value - props.readingStats.readThisYear;
  if (remaining <= 0) {
    return '🎉 恭喜！已完成今年阅读目标！';
  }
  return `还差 ${remaining} 本达成目标，加油！`;
});

// 保存目标
const handleSaveGoal = async () => {
  if (tempGoal.value > 0) {
    const currentYear = new Date().getFullYear();
    try {
      const goal = await readingGoalsService.setYearlyGoal(
        currentYear,
        tempGoal.value
      );
      readingGoal.value = goal.target;
    } catch (error) {
      console.error('保存阅读目标失败:', error);
      alert('保存失败，请重试');
      return;
    }
  }
  showGoalDialog.value = false;
};

// 加载目标（可由父组件调用）
const loadGoal = async () => {
  const currentYear = new Date().getFullYear();
  try {
    const goal = await readingGoalsService.getReadingGoal(currentYear);
    readingGoal.value = goal.target;
    tempGoal.value = goal.target;
  } catch (error) {
    console.error('加载阅读目标失败，使用默认值:', error);
    readingGoal.value = 12; // 默认目标
    tempGoal.value = 12;
  }
};

// 暴露方法给父组件
defineExpose({
  loadGoal,
  getGoal: () => readingGoal.value
});
</script>

<style scoped lang="scss">
.reading-goal-card {
  width: 100%;
}

.reading-goal {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  .goal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .goal-title {
      font-size: 16px;
      font-weight: 600;
    }

    .goal-setting {
      font-size: 13px;
      cursor: pointer;
      opacity: 0.9;
      transition: opacity 0.3s ease;

      &:hover {
        opacity: 1;
        text-decoration: underline;
      }
    }
  }

  .goal-progress {
    .goal-number {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 12px;

      .current {
        font-size: 36px;
      }

      .separator {
        margin: 0 4px;
        font-size: 24px;
        opacity: 0.8;
      }

      .target {
        font-size: 28px;
        opacity: 0.9;
      }

      .unit {
        font-size: 18px;
        font-weight: 400;
        margin-left: 4px;
        opacity: 0.8;
      }
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;

      .progress-fill {
        height: 100%;
        background-color: #fff;
        border-radius: 4px;
        transition: width 0.5s ease;
      }
    }

    .goal-tip {
      font-size: 13px;
      opacity: 0.9;
      margin: 0;
      line-height: 1.5;
    }
  }
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-light);

    span:first-child {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .dialog-close {
      font-size: 24px;
      color: var(--text-secondary);
      cursor: pointer;
      line-height: 1;
      transition: color 0.3s ease;

      &:hover {
        color: var(--text-primary);
      }
    }
  }

  .dialog-body {
    padding: 20px;

    .goal-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      font-size: 14px;
      outline: none;
      transition: border-color 0.3s ease;

      &:focus {
        border-color: var(--primary-color);
      }

      &::placeholder {
        color: var(--text-hint);
      }
    }
  }

  .dialog-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 16px 20px;
    border-top: 1px solid var(--border-light);

    .btn {
      padding: 8px 20px;
      border-radius: var(--radius-md);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;

      &.btn-default {
        background-color: var(--bg-secondary);
        color: var(--text-primary);
        border: none;

        &:hover {
          background-color: var(--bg-tertiary);
        }
      }

      &.btn-primary {
        background-color: var(--primary-color);
        color: white;
        border: none;

        &:hover {
          opacity: 0.9;
        }
      }
    }
  }
}
</style>
