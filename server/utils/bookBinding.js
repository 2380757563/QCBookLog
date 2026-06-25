/**
 * 书籍装帧相关工具函数
 *
 * 设计目标：
 * - binding1（装帧 1）：0=电子书 / 1=平装 / 2=精装 / 3=特殊装帧 / 4=套装
 * - binding2（装帧 2）：依赖 binding1，具体见 BINDING2_LABELS
 * - 默认值与载体类型（book_type）联动：
 *     电子书（book_type=0）→ binding1=0（电子书）
 *     实体书（book_type=1）→ binding1=1（平装）
 *
 * 这套规则与前端 src/views/Book/Edit.vue 保持一致，调用方应优先使用本工具
 * 取代代码中散落的 `binding1 || 0` 这类硬编码兜底。
 */

/**
 * 装帧 1 中文标签映射（binding1 -> label）
 * 与前端 src/views/Book/Edit.vue 的 binding1Options 对齐
 */
const BINDING1_LABELS = Object.freeze({
  0: '电子书',
  1: '平装',
  2: '精装',
  3: '特殊装帧',
  4: '套装'
});

/**
 * 装帧 2 中文标签映射（binding2 -> label），按 binding1 分组
 * 与前端 src/views/Book/Edit.vue 的 binding2OptionsMap 对齐
 */
const BINDING2_LABELS = Object.freeze({
  0: { 0: '无细分', 1: '精校版', 2: '魔改版', 3: '原版' },
  1: { 0: '无细分', 1: '无线胶装（胶装）', 2: '骑马钉装订', 3: '活页装订', 4: '锁线胶装（线胶装）' },
  2: {
    0: '无细分',
    1: '硬壳精装（圆脊）',
    2: '硬壳精装（方脊）',
    3: '布面精装',
    4: 'PU 皮面精装',
    5: '真皮精装（头层牛皮）',
    6: '真皮精装（羊皮）',
    7: '仿皮（人造革）精装'
  },
  3: { 0: '无细分', 1: '线装', 2: '经折装' },
  4: { 0: '无细分', 1: '套装精装', 2: '套装平装', 3: '套装其他' }
});

/**
 * 根据载体类型（book_type）推断 binding1 的默认值
 * - 电子书（0）→ 0
 * - 实体书（1）→ 1
 * - 未知/缺失 → 1（按实体书处理，避免被统计为电子书）
 */
function defaultBinding1(bookType) {
  return bookType === 0 ? 0 : 1;
}

/**
 * 规范化 binding1：
 * - 合法值（0-4）原样返回
 * - 缺失/非法值根据 book_type 兜底
 */
function normalizeBinding1(value, bookType) {
  if (value === undefined || value === null) return defaultBinding1(bookType);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 4) return defaultBinding1(bookType);
  return Math.trunc(n);
}

/**
 * 规范化 binding2：
 * - 缺失/非法值 → 0（无细分）
 * - 负数或超过当前 binding1 允许范围 → 0
 */
function normalizeBinding2(value, binding1) {
  if (value === undefined || value === null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const allowed = BINDING2_LABELS[binding1] || BINDING2_LABELS[0];
  if (!(Math.trunc(n) in allowed)) return 0;
  return Math.trunc(n);
}

/**
 * 一次性规范化装帧 1 / 装帧 2 / 载体类型三元组
 * @param {{book_type?: number|null, binding1?: number|null, binding2?: number|null}} input
 * @returns {{book_type: number, binding1: number, binding2: number}}
 */
function normalizeBookTypeBindings(input = {}) {
  const bookTypeRaw = input.book_type;
  const bookType = bookTypeRaw === 0 || bookTypeRaw === '0' ? 0 : 1;
  const binding1 = normalizeBinding1(input.binding1, bookType);
  const binding2 = normalizeBinding2(input.binding2, binding1);
  return { book_type: bookType, binding1, binding2 };
}

export {
  BINDING1_LABELS,
  BINDING2_LABELS,
  defaultBinding1,
  normalizeBinding1,
  normalizeBinding2,
  normalizeBookTypeBindings
};
