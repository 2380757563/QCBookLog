export type InputType = 'text' | 'password' | 'number' | 'email' | 'tel';

export interface InputProps {
  type?: InputType;
  value?: string | number;
  modelValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  clearable?: boolean;
  showPassword?: boolean;
  size?: 'small' | 'medium' | 'large';
  maxlength?: number;
  minlength?: number;
  prefixIcon?: string;
  suffixIcon?: string;
}

export interface InputEmits {
  (e: 'input', value: string | number): void;
  (e: 'update:modelValue', value: string | number): void;
  (e: 'focus', event: FocusEvent): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'clear'): void;
  (e: 'change', event: Event): void;
}

export interface InputInstance {
  focus(): void;
  blur(): void;
  select(): void;
}
