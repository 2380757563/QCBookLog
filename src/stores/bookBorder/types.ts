export type BookStatus = 'normal' | 'pending' | 'favorite';

export interface BorderGlowSettings {
  enabled: boolean;
  color: string;
  spread: number;
  opacity: number;
  gradientEnabled: boolean;
  gradientColor?: string;
  pulseEnabled?: boolean;
  pulseFrequency?: number;
}

export interface BorderBaseParams {
  lineWidth: number;
  borderRadius: number;
  color: string;
  glow: BorderGlowSettings;
}

export interface NormalBorder1Params extends BorderBaseParams {
  type: 'normal-1';
}

export interface NormalBorder2Params extends BorderBaseParams {
  type: 'normal-2';
  hoverEnabled: boolean;
}

export interface NormalBorder3Params extends BorderBaseParams {
  type: 'normal-3';
}

export interface NormalBorder4Params extends BorderBaseParams {
  type: 'normal-4';
}

export interface NormalBorder5Params extends BorderBaseParams {
  type: 'normal-5';
}

export interface PendingBorder1Params extends BorderBaseParams {
  type: 'pending-1';
  dashRatio: number;
}

export interface PendingBorder2Params extends BorderBaseParams {
  type: 'pending-2';
}

export interface PendingBorder3Params extends BorderBaseParams {
  type: 'pending-3';
  strokeVariation: number;
}

export interface PendingBorder4Params extends BorderBaseParams {
  type: 'pending-4';
  gapPosition: 'top' | 'bottom' | 'left' | 'right';
  gapLength: number;
}

export interface PendingBorder5Params extends BorderBaseParams {
  type: 'pending-5';
  gradientStartColor: string;
  gradientEndColor: string;
}

export interface FavoriteBorder1Params extends BorderBaseParams {
  type: 'favorite-1';
  doubleLineGap: number;
}

export interface FavoriteBorder2Params extends BorderBaseParams {
  type: 'favorite-2';
  gradientStartColor: string;
  gradientEndColor: string;
}

export interface FavoriteBorder3Params extends BorderBaseParams {
  type: 'favorite-3';
  patternSize: number;
}

export interface FavoriteBorder4Params extends BorderBaseParams {
  type: 'favorite-4';
}

export interface FavoriteBorder5Params extends BorderBaseParams {
  type: 'favorite-5';
  gradientStartColor: string;
  gradientEndColor: string;
  pulseFrequency: number;
}

export type BorderParams = 
  | NormalBorder1Params 
  | NormalBorder2Params 
  | NormalBorder3Params 
  | NormalBorder4Params 
  | NormalBorder5Params
  | PendingBorder1Params 
  | PendingBorder2Params 
  | PendingBorder3Params 
  | PendingBorder4Params 
  | PendingBorder5Params
  | FavoriteBorder1Params 
  | FavoriteBorder2Params 
  | FavoriteBorder3Params 
  | FavoriteBorder4Params 
  | FavoriteBorder5Params;

export interface BorderDefinition {
  id: string;
  name: string;
  description: string;
  status: BookStatus;
  defaultParams: BorderParams;
  supportsGradient: boolean;
  supportsPulse: boolean;
  supportsGap: boolean;
  supportsDash: boolean;
  supportsDoubleLine: boolean;
  supportsPattern: boolean;
  supportsHover: boolean;
  supportsStrokeVariation: boolean;
}

export interface BookBorderSettings {
  normal: {
    selectedBorderId: string;
    params: BorderParams;
  };
  pending: {
    selectedBorderId: string;
    params: BorderParams;
  };
  favorite: {
    selectedBorderId: string;
    params: BorderParams;
  };
}

export const DEFAULT_GLOW_SETTINGS: BorderGlowSettings = {
  enabled: false,
  color: 'rgba(0, 0, 0, 0.3)',
  spread: 4,
  opacity: 50,
  gradientEnabled: false,
  gradientColor: undefined,
  pulseEnabled: false,
  pulseFrequency: 1
};

export const BORDER_DEFINITIONS: BorderDefinition[] = [
  {
    id: 'normal-1',
    name: '原生极简细框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，单根均匀实心细线条，圆角8px，低饱和浅灰色',
    status: 'normal',
    defaultParams: {
      type: 'normal-1',
      lineWidth: 1.5,
      borderRadius: 8,
      color: '#a0a0a0',
      glow: { ...DEFAULT_GLOW_SETTINGS }
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'normal-2',
    name: '轻量隐形细框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，单根极细实心线条，圆角6px，极浅灰色/透明，hover时显示边框',
    status: 'normal',
    defaultParams: {
      type: 'normal-2',
      lineWidth: 1,
      borderRadius: 6,
      color: 'rgba(200, 200, 200, 0.5)',
      glow: { ...DEFAULT_GLOW_SETTINGS },
      hoverEnabled: true
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: true,
    supportsStrokeVariation: false
  },
  {
    id: 'normal-3',
    name: '国风基础中锋框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，单根均匀仿毛笔中锋线条，小圆角4px，深棕灰色',
    status: 'normal',
    defaultParams: {
      type: 'normal-3',
      lineWidth: 2.5,
      borderRadius: 4,
      color: '#5d4e37',
      glow: { ...DEFAULT_GLOW_SETTINGS, color: 'rgba(93, 78, 55, 0.2)' }
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'normal-4',
    name: '高亮直角银灰框',
    description: '适配竖向书籍封面尺寸的直角矩形闭合边框，单根均匀实心细线条，直角0px，浅银灰色',
    status: 'normal',
    defaultParams: {
      type: 'normal-4',
      lineWidth: 1.5,
      borderRadius: 0,
      color: '#c0c0c0',
      glow: { ...DEFAULT_GLOW_SETTINGS }
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'normal-5',
    name: '轻量氛围中框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，单根适中粗细实心线条，圆角10px，浅暖灰色',
    status: 'normal',
    defaultParams: {
      type: 'normal-5',
      lineWidth: 2,
      borderRadius: 10,
      color: '#b8a898',
      glow: { ...DEFAULT_GLOW_SETTINGS }
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'pending-1',
    name: '原生虚线雾霾蓝框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，单根均匀虚线线条，虚实比例1:1，圆角8px，低饱和雾霾蓝色',
    status: 'pending',
    defaultParams: {
      type: 'pending-1',
      lineWidth: 1.5,
      borderRadius: 8,
      color: '#7a9eb8',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(122, 158, 184, 0.3)', spread: 6, opacity: 40 },
      dashRatio: 1
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: true,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'pending-2',
    name: '轻量氛围灰蓝大圆角框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，单根实心线条，圆角10px，低饱和灰蓝色',
    status: 'pending',
    defaultParams: {
      type: 'pending-2',
      lineWidth: 2,
      borderRadius: 10,
      color: '#8fa4b0',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(143, 164, 176, 0.3)', spread: 5, opacity: 40 }
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'pending-3',
    name: '国风顿笔黛蓝框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，单根仿毛笔行笔线条，首尾顿笔收锋有轻微粗细变化，小圆角4px，黛蓝色',
    status: 'pending',
    defaultParams: {
      type: 'pending-3',
      lineWidth: 2.5,
      borderRadius: 4,
      color: '#3a5f7a',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(58, 95, 122, 0.25)', spread: 4, opacity: 35 },
      strokeVariation: 0.3
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: true
  },
  {
    id: 'pending-4',
    name: '高亮缺口冰蓝框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，顶部居中带缺口的实心线条，缺口长度占边长15%，圆角8px，雾霾蓝色',
    status: 'pending',
    defaultParams: {
      type: 'pending-4',
      lineWidth: 1.5,
      borderRadius: 8,
      color: '#7ab8c4',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(122, 184, 196, 0.4)', spread: 6, opacity: 45 },
      gapPosition: 'top',
      gapLength: 15
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: true,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'pending-5',
    name: '潮酷蓝青渐变霓虹框',
    description: '适配竖向书籍封面尺寸的直角矩形闭合边框，单根蓝青渐变实心线条，直角0px，默认带蓝青霓虹外发光特效',
    status: 'pending',
    defaultParams: {
      type: 'pending-5',
      lineWidth: 2,
      borderRadius: 0,
      color: '#4a9eff',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(74, 158, 255, 0.5)', spread: 8, opacity: 60 },
      gradientStartColor: '#4a9eff',
      gradientEndColor: '#00d4aa'
    },
    supportsGradient: true,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'favorite-1',
    name: '原生双层暖橙框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，双层平行均匀实心线条，内外层圆角一致均为8px，暖橙色主色调',
    status: 'favorite',
    defaultParams: {
      type: 'favorite-1',
      lineWidth: 1.5,
      borderRadius: 8,
      color: '#e8a060',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(232, 160, 96, 0.35)', spread: 6, opacity: 45 },
      doubleLineGap: 4
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: true,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'favorite-2',
    name: '轻量氛围橙红渐变框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，单根加粗实心线条，圆角12px，暖橙红色，默认带暖调渐变外发光特效',
    status: 'favorite',
    defaultParams: {
      type: 'favorite-2',
      lineWidth: 2.5,
      borderRadius: 12,
      color: '#e07040',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(224, 112, 64, 0.4)', spread: 7, opacity: 50 },
      gradientStartColor: '#ff8c5a',
      gradientEndColor: '#ff6b35'
    },
    supportsGradient: true,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'favorite-3',
    name: '国风回纹朱红框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，四角带极简回纹线条装饰，小圆角2px，朱红色',
    status: 'favorite',
    defaultParams: {
      type: 'favorite-3',
      lineWidth: 2,
      borderRadius: 2,
      color: '#c04030',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(192, 64, 48, 0.3)', spread: 5, opacity: 40 },
      patternSize: 8
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: true,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'favorite-4',
    name: '高亮加粗暖粉弥散框',
    description: '适配竖向书籍封面尺寸的矩形闭合边框，加粗实心均匀线条，圆角8px，暖粉色，默认带强弥散式同色系外发光特效',
    status: 'favorite',
    defaultParams: {
      type: 'favorite-4',
      lineWidth: 3,
      borderRadius: 8,
      color: '#e08090',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(224, 128, 144, 0.5)', spread: 10, opacity: 55 }
    },
    supportsGradient: false,
    supportsPulse: false,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  },
  {
    id: 'favorite-5',
    name: '潮酷粉橙脉冲霓虹框',
    description: '适配竖向书籍封面尺寸的直角矩形闭合边框，单根粉橙渐变实心线条，直角0px，默认带脉冲式粉橙霓虹外发光特效',
    status: 'favorite',
    defaultParams: {
      type: 'favorite-5',
      lineWidth: 2,
      borderRadius: 0,
      color: '#ff7088',
      glow: { ...DEFAULT_GLOW_SETTINGS, enabled: true, color: 'rgba(255, 112, 136, 0.5)', spread: 8, opacity: 60, pulseEnabled: true, pulseFrequency: 2 },
      gradientStartColor: '#ff7088',
      gradientEndColor: '#ff9f5a',
      pulseFrequency: 2
    },
    supportsGradient: true,
    supportsPulse: true,
    supportsGap: false,
    supportsDash: false,
    supportsDoubleLine: false,
    supportsPattern: false,
    supportsHover: false,
    supportsStrokeVariation: false
  }
];

export const DEFAULT_BOOK_BORDER_SETTINGS: BookBorderSettings = {
  normal: {
    selectedBorderId: 'normal-1',
    params: BORDER_DEFINITIONS.find(b => b.id === 'normal-1')!.defaultParams
  },
  pending: {
    selectedBorderId: 'pending-1',
    params: BORDER_DEFINITIONS.find(b => b.id === 'pending-1')!.defaultParams
  },
  favorite: {
    selectedBorderId: 'favorite-1',
    params: BORDER_DEFINITIONS.find(b => b.id === 'favorite-1')!.defaultParams
  }
};

export function getBorderDefinition(id: string): BorderDefinition | undefined {
  return BORDER_DEFINITIONS.find(b => b.id === id);
}

export function getBordersByStatus(status: BookStatus): BorderDefinition[] {
  return BORDER_DEFINITIONS.filter(b => b.status === status);
}

export function createDefaultParams(borderId: string): BorderParams {
  const definition = getBorderDefinition(borderId);
  if (!definition) {
    throw new Error(`Unknown border id: ${borderId}`);
  }
  return JSON.parse(JSON.stringify(definition.defaultParams));
}
