export type Binding1Type = 0 | 1 | 2 | 3;
export type Binding2Type = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const BINDING1_LABELS: Record<Binding1Type, string> = {
  0: '电子书',
  1: '平装',
  2: '精装',
  3: '特殊装帧'
};

export const BINDING2_LABELS: Record<Binding1Type, Record<Binding2Type, string>> = {
  0: {
    0: '默认电子书',
    1: '精校版',
    2: '魔改版(Matrix)',
    3: '原版',
    4: '', 5: '', 6: '', 7: ''
  },
  1: {
    0: '默认平装',
    1: '普通纸张边角',
    2: '撕碎纸张边角',
    3: '活页装订',
    4: '锁线胶装',
    5: '', 6: '', 7: ''
  },
  2: {
    0: '默认精装（哑光）',
    1: '硬壳精装（圆脊）',
    2: '硬壳精装（方脊）',
    3: '布面精装',
    4: 'PU皮面精装',
    5: '真皮精装（头层牛皮）',
    6: '真皮精装（羊皮）',
    7: '仿皮（人造革）精装'
  },
  3: {
    0: '默认特殊装帧',
    1: '线装',
    2: '经折装',
    3: '古典纹样装帧',
    4: '', 5: '', 6: '', 7: ''
  }
};

// 纹理类型
export type EbookTexture = 'screen' | 'matrix';
export type PaperbackTexture = 'paper' | 'torn';
export type HardcoverTexture = 'matte' | 'cloth' | 'pu-leather' | 'real-leather' | 'sheepskin' | 'faux-leather';
export type SpecialTexture = 'thread' | 'accordion' | 'classic';

// 基础参数
export interface BindingBorderBaseParams {
  enabled: boolean;       // 是否启用包边
  size: number;           // 包边尺寸 (px)
  opacity: number;        // 透明度 (0-100)
  color: string;          // 颜色
  customColorEnabled: boolean;
}

// 电子书参数
export interface EbookBorderParams extends BindingBorderBaseParams {
  texture: EbookTexture;
  glowEnabled: boolean;
  glowColor: string;
  glowSpread: number;
}

// 平装参数
export interface PaperbackBorderParams extends BindingBorderBaseParams {
  texture: PaperbackTexture;
  tornIntensity: number;
}

// 精装参数
export interface HardcoverBorderParams extends BindingBorderBaseParams {
  texture: HardcoverTexture;
  oilEdgeEnabled: boolean;
  oilEdgeColor: string;
}

// 特殊装帧参数
export interface SpecialBorderParams extends BindingBorderBaseParams {
  texture: SpecialTexture;
}

export type BindingBorderParams = 
  | EbookBorderParams 
  | PaperbackBorderParams 
  | HardcoverBorderParams 
  | SpecialBorderParams;

export interface BindingBorderSettings {
  ebook: EbookBorderParams;
  paperback: PaperbackBorderParams;
  hardcover: HardcoverBorderParams;
  special: SpecialBorderParams;
}

// 电子书默认参数
export const DEFAULT_EBOOK_PARAMS: EbookBorderParams = {
  enabled: false,
  size: 35,
  opacity: 100,
  color: '#4a9eff',
  customColorEnabled: false,
  texture: 'screen',
  glowEnabled: true,
  glowColor: 'rgba(74, 158, 255, 0.4)',
  glowSpread: 3
};

// 平装默认参数
export const DEFAULT_PAPERBACK_PARAMS: PaperbackBorderParams = {
  enabled: false,
  size: 40,
  opacity: 100,
  color: '#fefdf9',
  customColorEnabled: false,
  texture: 'paper',
  tornIntensity: 45
};

// 精装默认参数
export const DEFAULT_HARDCOVER_PARAMS: HardcoverBorderParams = {
  enabled: false,
  size: 40,
  opacity: 100,
  color: '#7a6b5a',
  customColorEnabled: false,
  texture: 'matte',
  oilEdgeEnabled: false,
  oilEdgeColor: '#3d3d3d'
};

// 特殊装帧默认参数
export const DEFAULT_SPECIAL_PARAMS: SpecialBorderParams = {
  enabled: false,
  size: 38,
  opacity: 100,
  color: '#f5e6d3',
  customColorEnabled: false,
  texture: 'thread'
};

export const DEFAULT_BINDING_BORDER_SETTINGS: BindingBorderSettings = {
  ebook: DEFAULT_EBOOK_PARAMS,
  paperback: DEFAULT_PAPERBACK_PARAMS,
  hardcover: DEFAULT_HARDCOVER_PARAMS,
  special: DEFAULT_SPECIAL_PARAMS
};

// 获取装帧类型
export function getBindingType(binding1: Binding1Type): 'ebook' | 'paperback' | 'hardcover' | 'special' {
  switch (binding1) {
    case 0: return 'ebook';
    case 1: return 'paperback';
    case 2: return 'hardcover';
    case 3: return 'special';
    default: return 'paperback';
  }
}

// 获取精装纹理类型
export function getHardcoverTexture(binding2: Binding2Type): HardcoverTexture {
  switch (binding2) {
    case 3: return 'cloth';
    case 4: return 'pu-leather';
    case 5: return 'real-leather';
    case 6: return 'sheepskin';
    case 7: return 'faux-leather';
    default: return 'matte';
  }
}

// 是否显示油边
export function shouldShowOilEdge(binding2: Binding2Type): boolean {
  return binding2 === 5 || binding2 === 6;
}

// 获取特殊装帧纹理
export function getSpecialPattern(binding2: Binding2Type): SpecialTexture {
  switch (binding2) {
    case 1: return 'thread';
    case 2: return 'accordion';
    case 3: return 'classic';
    default: return 'thread';
  }
}

// 获取平装纹理
export function getPaperbackVariant(binding2: Binding2Type): PaperbackTexture {
  return binding2 === 2 ? 'torn' : 'paper';
}

// 获取电子书纹理
export function getEbookVariant(binding2: Binding2Type): EbookTexture {
  return binding2 === 2 ? 'matrix' : 'screen';
}
