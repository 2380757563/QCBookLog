export type ButtonType = 'primary' | 'default' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  type?: ButtonType;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  round?: boolean;
  icon?: string;
}

export interface ButtonEmits {
  (e: 'click', event: MouseEvent): void;
}
