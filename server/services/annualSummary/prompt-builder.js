/**
 * Prompt 构建器
 *
 * 双层架构（对应 I_solutions.md 的「锁定骨架 + 可编辑风格」）：
 *   L1 骨架段：角色、JSON Schema 契约、字段释义、硬性约束 —— 用户不可编辑，且始终拼接在最后。
 *   L2 风格段：语气 / 人称 / 详略 —— 用户可自由编辑，允许套用内置模板。
 *
 * 为什么 L1 放最后：大模型对靠近末尾的指令服从度更高，
 * 这样即使用户把 L2 改得面目全非，输出结构契约依然稳固，保证「命中率」。
 */

/** 报告段落定义：字段名 → 中文段落名，用于生成 Schema 说明与兜底文案 */
export const REPORT_SECTIONS = [
  { key: 'opening', label: '开篇卷首语', source: null, minChars: 60, maxChars: 160 },
  { key: 'buying', label: '买书篇', source: 'collection', minChars: 80, maxChars: 200 },
  { key: 'spending', label: '花费篇', source: 'spending', minChars: 60, maxChars: 160 },
  { key: 'reading', label: '阅读篇', source: 'reading', minChars: 80, maxChars: 200 },
  { key: 'habit', label: '习惯篇', source: 'habit', minChars: 60, maxChars: 160 },
  { key: 'taste', label: '品味画像', source: 'taste', minChars: 80, maxChars: 200 },
  { key: 'bookmarks', label: '书摘篇', source: 'bookmarks', minChars: 60, maxChars: 180 },
  { key: 'reviews', label: '书评篇', source: 'reviews', minChars: 60, maxChars: 180 },
  { key: 'goals', label: '目标篇', source: 'goals', minChars: 40, maxChars: 140 },
  { key: 'persona', label: '人物标签', source: null, minChars: 0, maxChars: 0, isPersona: true },
  { key: 'closing', label: '结语寄语', source: null, minChars: 40, maxChars: 140 }
];

/** 各段落的数据释义：让模型理解字段含义，避免误读 */
const FIELD_GLOSSARY = {
  collection: '藏书与购书：libraryTotal=书库总藏书量，purchasedCount=本年购入本数，completedCount=本年读完本数，monthlyPurchases=1~12月各月购入本数数组，sourceDist=书籍数据来源分布',
  spending: '花费：totalPaid=本年购书实付总额(元)，totalStandard=定价总额(元)，savedAmount=相对定价省下的钱(元)，avgDiscount=平均折扣（单位「折」，如 6.8 表示 6.8 折），avgPrice=平均单本实付(元)，mostExpensive=本年最贵的一本',
  binding: '装帧属性：bindingDist=装帧方式分布，paperDist=纸张分布，edgeDist=刷边工艺分布，typeDist=纸书/电子书分布',
  reading: '阅读：completedCount=本年读完本数，totalPages=本年阅读总页数，totalMinutes=本年阅读总分钟数，totalDurationText=中文时长描述，avgPagesPerBook=平均每本页数，avgRating=平均评分(满分5)，activeDays=有阅读记录的天数，recentCompleted=本年读完的书目列表(含书名/作者/页数/评分/完成日期)，mostRead=阅读时长最长的书',
  habit: '阅读习惯：activeDays=有阅读记录的天数，longestStreak=最长连续阅读天数，bestDay=阅读最投入的一天，busiestMonth=最活跃的月份(1~12)，favoriteWeekday=最常阅读的星期，byMonth=各月活跃天数数组',
  taste: '品味：topTags=最常出现的标签，topGroups=分组分布，topPublishers=出版社分布，topAuthors=作者分布，topSeries=丛书分布（均为 {name,count} 数组）',
  bookmarks: '书摘：total=本年书摘总条数，sentCount=本次提供给你的条数，items=书摘内容(含 bookTitle 书名 / text 原文摘录 / note 个人批注)',
  reviews: '书评：total=本年书评总条数，sentCount=本次提供给你的条数，avgRating=书评平均评分，items=书评内容(含 bookTitle/bookAuthor/title 标题/rating 评分/excerpt 正文摘要)',
  goals: '年度目标：hasGoal=是否设置过目标，target=目标本数，completed=已完成本数，achieved=是否达成，progressPercent=完成百分比',
  doulist: '书单进度：listCount=书单数量，lists=各书单(含 title 名称 / buyDone 已购 / buyTotal 总需购 / readDone 已读 / readTotal 总需读)',
  favorite: '收藏与想读：favoriteCount=收藏总数，wantsCount=想读总数，favoriteTitles=收藏书名，wantsTitles=想读书名'
};

/** 无数据时的兜底文案：既保证段落不为空，也明确告知模型不要编造 */
const FALLBACK_TEXT = {
  buying: '今年没有留下购书记录，书架维持着原有的模样。',
  spending: '今年没有登记购书花费。',
  reading: '今年没有留下可统计的阅读记录。',
  habit: '今年的阅读记录太少，还不足以勾勒出稳定的习惯。',
  taste: '今年的阅读样本偏少，暂时难以拼出完整的品味轮廓。',
  bookmarks: '今年还没有写下书摘。',
  reviews: '今年还没有写下书评。',
  goals: '今年没有设定阅读目标。',
  doulist: '',
  favorite: ''
};

/**
 * 生成 L1 骨架段（锁定，不可被用户编辑）
 */
export const buildSkeletonPrompt = (stats) => {
  const enabledSections = REPORT_SECTIONS.filter(
    s => s.source === null || (stats && stats[s.source] !== undefined)
  );

  const schemaLines = enabledSections
    .filter(s => !s.isPersona)
    .map(s => {
      const fallback = FALLBACK_TEXT[s.key] ? `；若无数据可写「${FALLBACK_TEXT[s.key]}」` : '';
      return `  "${s.key}": "（${s.label}，${s.minChars}~${s.maxChars} 字${fallback}）"`;
    });

  const personaLine = enabledSections.some(s => s.isPersona)
    ? `  "persona": [\n    { "label": "（3~6 个字的标签）", "reason": "（一句话说明依据，需引用具体数据）" }\n  ]`
    : null;

  const sectionList = enabledSections
    .map(s => (s.isPersona ? `${s.label}（persona）` : `${s.label}（${s.key}）`))
    .join('、');

  const glossaryLines = Object.entries(FIELD_GLOSSARY)
    .filter(([key]) => stats && stats[key] !== undefined)
    .map(([, desc]) => `- ${desc}`);

  return [
    '## 输出契约（必须严格遵守）',
    '',
    '你只能输出一个 JSON 对象，不允许输出任何 JSON 之外的内容（不要解释、不要 markdown 代码围栏）。',
    'JSON 结构如下：',
    '',
    '{',
    [...schemaLines, personaLine].filter(Boolean).join(',\n'),
    '}',
    '',
    `需要撰写的段落共 ${enabledSections.length} 部分：${sectionList}。`,
    '',
    '## 硬性约束',
    '',
    '1. 严禁编造数据中不存在的书名、作者、数字。',
    '2. 所有提到的数字必须能在下方「年度数据」中找到来源，不得自行推算或放大。',
    '3. 若某段落所需数据缺失，用平实的语言如实说明，不要虚构细节填补。',
    '4. persona 必须是 3~5 个标签，每个标签 3~6 个字，且 reason 中必须引用具体数据作为依据。',
    '5. JSON 中出现的每个段落字段都不能缺失；确实无内容时写空字符串 ""。',
    '6. 全部使用简体中文，标点使用中文标点。',
    '',
    '## 年度数据字段释义',
    '',
    glossaryLines.join('\n')
  ].join('\n');
};

/**
 * 生成 L2 风格段的内容（来自用户配置）
 * @param {object} style { prompt }
 * @param {number} year
 */
export const buildStylePrompt = (style, year) => {
  const body = String(style?.prompt || '').trim();
  if (!body) return '';
  return ['## 文风要求', '', body.replace(/\{\{year\}\}/g, String(year)), '', '注意：文风要求仅影响表达方式，不得改变上面的输出契约与硬性约束。'].join('\n');
};

/**
 * 构建完整 messages
 * @param {object} stats  聚合后的年度数据
 * @param {object} style  { prompt }
 * @param {number} year
 * @returns {Array<{role: string, content: string}>}
 */
export const buildPrompt = (stats, style, year) => {
  const styleBlock = buildStylePrompt(style, year);
  const skeletonBlock = buildSkeletonPrompt(stats);
  const dataBlock = ['## 年度数据（JSON）', '', '```json', JSON.stringify(stats, null, 2), '```'].join('\n');

  const systemParts = [
    `你是一位擅长撰写年度阅读报告的专栏作者，正在为一位读者撰写 ${year} 年的阅读年终总结。`,
    '',
    '你的读者会收到一份数据报告，你的任务是把这些冷冰冰的数字，写成有温度、有洞察、可读性强的文字。',
    '',
    styleBlock,
    '',
    skeletonBlock
  ].filter(p => p !== '');

  return [
    { role: 'system', content: systemParts.join('\n') },
    { role: 'user', content: dataBlock }
  ];
};

/**
 * 校验并补齐 LLM 返回的叙述结构
 * 保证：所有段落字段都存在（缺失用兜底文案），persona 为合法数组，字符串长度受控。
 * @returns {{narrative: object, repaired: boolean, missing: string[]}}
 */
export const validateAndFillNarrative = (raw, stats) => {
  const narrative = {};
  const missing = [];
  let repaired = false;

  const rawObj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

  for (const section of REPORT_SECTIONS) {
    const enabled = section.source === null || (stats && stats[section.source] !== undefined);
    if (!enabled) continue;

    if (section.isPersona) {
      const value = rawObj[section.key];
      const list = Array.isArray(value) ? value : [];
      const cleaned = list
        .filter(item => item && typeof item === 'object')
        .map(item => ({
          label: String(item.label || '').trim().slice(0, 12),
          reason: String(item.reason || '').trim().slice(0, 120)
        }))
        .filter(item => item.label)
        .slice(0, 6);

      if (cleaned.length === 0) {
        missing.push(section.key);
        repaired = true;
        narrative[section.key] = buildPersonaFallback(stats);
      } else {
        narrative[section.key] = cleaned;
      }
      continue;
    }

    let value = rawObj[section.key];
    if (typeof value !== 'string') {
      if (value !== undefined) repaired = true;
      value = '';
    }
    value = value.trim();

    if (!value) {
      missing.push(section.key);
      repaired = true;
      value = FALLBACK_TEXT[section.key] || buildDataFallbackText(section.key, stats);
    }

    // 限制单段长度，避免模型输出失控
    const hardMax = section.maxChars * 3;
    if (value.length > hardMax) {
      value = `${value.slice(0, hardMax)}…`;
      repaired = true;
    }

    narrative[section.key] = value;
  }

  return { narrative, repaired, missing };
};

/**
 * 纯数据兜底：不依赖 AI 也能给出可读的人物标签
 */
const buildPersonaFallback = (stats) => {
  const tags = [];
  const reading = stats?.reading;
  const collection = stats?.collection;
  const spending = stats?.spending;
  const habit = stats?.habit;

  if (reading && reading.completedCount >= 24) {
    tags.push({ label: '重度书虫', reason: `今年读完 ${reading.completedCount} 本，平均每月超过 2 本。` });
  } else if (reading && reading.completedCount >= 12) {
    tags.push({ label: '月度读者', reason: `今年读完 ${reading.completedCount} 本，基本保持每月一本的节奏。` });
  } else if (reading && reading.completedCount > 0) {
    tags.push({ label: '细水长流', reason: `今年读完 ${reading.completedCount} 本，读书节奏舒缓但从未停下。` });
  }

  if (collection && collection.purchasedCount > 0 && collection.completedCount < collection.purchasedCount) {
    tags.push({ label: '囤书达人', reason: `今年买进 ${collection.purchasedCount} 本，读完 ${collection.completedCount} 本，书架还在长高。` });
  }

  if (spending && spending.avgDiscount > 0 && spending.avgDiscount <= 7) {
    tags.push({ label: '折扣猎人', reason: `平均 ${spending.avgDiscount} 折入手，把每一分钱都花在刀刃上。` });
  }

  if (habit && habit.longestStreak >= 7) {
    tags.push({ label: '习惯养成', reason: `最长连续阅读 ${habit.longestStreak} 天，阅读已经变成日常。` });
  }

  if (reading && reading.avgRating >= 4.5) {
    tags.push({ label: '宽容读者', reason: `平均评分 ${reading.avgRating} 分，对读到的书都心怀善意。` });
  }

  if (tags.length === 0) {
    tags.push({ label: '新手上路', reason: '今年的阅读数据还不多，故事才刚刚开始。' });
  }

  return tags.slice(0, 5);
};

/** 数据型兜底文案：用具体数字代替空洞描述 */
const buildDataFallbackText = (key, stats) => {
  const reading = stats?.reading;
  const collection = stats?.collection;

  switch (key) {
    case 'opening':
      return `${stats?.year || ''} 年，书架上又多了 ${collection?.purchasedCount || 0} 本书，读完了 ${reading?.completedCount || 0} 本。`;
    case 'closing':
      return '一年翻过去了，书页还在翻动。愿新的一年，仍有好书相伴。';
    case 'persona':
      return '';
    default:
      return FALLBACK_TEXT[key] || '';
  }
};

export default {
  REPORT_SECTIONS,
  buildPrompt,
  buildSkeletonPrompt,
  buildStylePrompt,
  validateAndFillNarrative,
  buildPersonaFallback
};
