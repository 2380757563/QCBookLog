<template>
  <div
    :class="[
      'xm-input-wrapper',
      `xm-input-wrapper--${size}`,
      {
        'xm-input-wrapper--disabled': disabled,
        'xm-input-wrapper--focused': isFocused
      }
    ]"
  >
    <span v-if="prefixIcon" class="xm-input__prefix">
      <svg :class="`xm-icon-${prefixIcon}`" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <!-- 这里可以根据需要添加内置图标，或者使用外部图标库 -->
      </svg>
    </span>
    <input
      ref="inputRef"
      :type="showPassword && type === 'password' ? 'text' : type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength"
      :minlength="minlength"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @change="handleChange"
      class="xm-input"
    />
    <div v-if="suffixIcon || showPassword || (clearable && modelValue)" class="xm-input__suffix">
      <span
        v-if="showPassword"
        class="xm-input__icon xm-input__password-toggle"
        @click="togglePasswordVisibility"
      >
        <svg class="xm-icon-eye" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <!-- 这里可以根据需要添加内置图标，或者使用外部图标库 -->
        </svg>
      </span>
      <span
        v-else-if="suffixIcon"
        class="xm-input__icon"
      >
        <svg :class="`xm-icon-${suffixIcon}`" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <!-- 这里可以根据需要添加内置图标，或者使用外部图标库 -->
        </svg>
      </span>
      <span
        v-else-if="clearable && modelValue"
        class="xm-input__icon xm-input__clear"
        @click="handleClear"
      >
        <svg class="xm-icon-close" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <!-- 这里可以根据需要添加内置图标，或者使用外部图标库 -->
        </svg>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { InputProps, InputEmits, InputInstance } from './types';

const props = withDefaults(defineProps<InputProps>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  readonly: false,
  clearable: false,
  showPassword: false,
  size: 'medium',
  maxlength: undefined,
  minlength: undefined
});

const emit = defineEmits<InputEmits>();

const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);
const internalShowPassword = ref(props.showPassword);

const modelValue = computed({
  get: () => props.modelValue ?? props.value ?? '',
  set: (value) => {
    emit('update:modelValue', value);
    emit('input', value);
  }
});

watch(() => props.showPassword, (newValue) => {
  internalShowPassword.value = newValue;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  modelValue.value = target.value;
};

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true;
  emit('focus', event);
};

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false;
  emit('blur', event);
};

const handleChange = (event: Event) => {
  emit('change', event);
};

const handleClear = () => {
  modelValue.value = '';
  emit('clear');
  // 清除后重新聚焦
  inputRef.value?.focus();
};

const togglePasswordVisibility = () => {
  internalShowPassword.value = !internalShowPassword.value;
};

const focus = () => {
  inputRef.value?.focus();
};

const blur = () => {
  inputRef.value?.blur();
};

const select = () => {
  inputRef.value?.select();
};

// 暴露组件实例方法
defineExpose<InputInstance>({
  focus,
  blur,
  select
});
</script>

<style scoped>
.xm-input-wrapper {
  display: inline-flex;
  align-items: center;
  position: relative;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: all 0.3s ease;
  background-color: #fff;
}

.xm-input-wrapper:hover:not(.xm-input-wrapper--disabled) {
  border-color: #3498db;
}

.xm-input-wrapper--focused {
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.xm-input-wrapper--disabled {
  background-color: #f5f5f5;
  border-color: #e0e0e0;
  cursor: not-allowed;
}

.xm-input-wrapper--small {
  height: 32px;
}

.xm-input-wrapper--medium {
  height: 40px;
}

.xm-input-wrapper--large {
  height: 48px;
}

.xm-input {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 0 12px;
  font-size: 14px;
  color: #333;
  background: transparent;
  border: none;
  outline: none;
  transition: all 0.3s ease;
}

.xm-input::placeholder {
  color: #999;
}

.xm-input:disabled {
  background-color: transparent;
  cursor: not-allowed;
  color: #999;
}

.xm-input__prefix,
.xm-input__suffix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  height: 100%;
  color: #999;
}

.xm-input__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.xm-input__icon:hover {
  color: #3498db;
}

.xm-input__clear:hover {
  color: #e74c3c;
}

.xm-input__password-toggle {
  margin-right: 4px;
}
</style>
