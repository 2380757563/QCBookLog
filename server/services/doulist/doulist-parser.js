/**
 * 豆列页面解析器
 * 基于 cheerio 解析豆瓣公开豆列页（www.douban.com/doulist/{id}/?start=N）
 * 选择器基于 2026-09 实测的页面结构：
 *   - 条目容器: div.doulist-item
 *   - 书籍链接: .post a[href*="book.douban.com/subject/"] / .title a
 *   - 评分: .rating .rating_nums，评价人数: .rating 文本 "(930人评价)"
 *   - 摘要: .abstract（按 <br> 分行，形如 "作者: xxx" / "出版社: xxx" / "出版年: xxx"）
 *   - 加入时间: .ft time.time
 *   - 豆列元信息: #content h1 span、#doulist-info .hd .meta、.paginator .thispage[data-total-page]
 */
import * as cheerio from 'cheerio';

const SUBJECT_RE = /https?:\/\/book\.douban\.com\/subject\/(\d+)/;
const VOTES_RE = /([\d,，]+)\s*人评价/;
const ALLOWED_HOSTS = new Set(['www.douban.com', 'book.douban.com']);

export class DoulistParseError extends Error {}

/**
 * 判断页面是否为风控/验证码页
 */
export function looksBlocked(html, finalUrl = '') {
  const sample = String(html).slice(0, 100000).toLowerCase();
  const markers = [
    '检测到有异常请求',
    'sec.douban.com',
    'captcha',
    '请输入验证码',
    '访问豆瓣的方式有点异常'
  ];
  return markers.some((m) => sample.includes(m.toLowerCase())) || String(finalUrl).includes('sec.douban.com');
}

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

/**
 * 解析豆列列表页
 * @returns {{ meta: object, books: Array, nextStart: number|null, blocked: boolean }}
 */
export function parseDoulistPage(html, pageUrl) {
  if (looksBlocked(html, pageUrl)) {
    throw new DoulistParseError('页面疑似为验证码或异常请求提示页');
  }

  const $ = cheerio.load(html);
  const books = [];
  const seen = new Set();

  $('div.doulist-item').each((_, el) => {
    const item = $(el);

    // 1. 书籍链接与 subject ID（唯一键）
    let href = item.find('.post a[href*="book.douban.com/subject/"]').first().attr('href')
      || item.find('.title a[href*="book.douban.com/subject/"]').first().attr('href');
    if (!href) return;
    const match = String(href).match(SUBJECT_RE);
    if (!match) return;
    const doubanId = match[1];
    if (seen.has(doubanId)) return;
    seen.add(doubanId);

    // 2. 书名（展示用）
    let title = cleanText(item.find('.title a').first().text())
      || cleanText(item.find('.title a').first().attr('title'))
      || `豆瓣书籍 ${doubanId}`;

    // 3. 封面
    let coverUrl = item.find('.post img').first().attr('src') || null;

    // 4. 评分 / 评价人数
    const ratingText = cleanText(item.find('.rating').first().text());
    let rating = null;
    let ratingCount = null;
    const ratingNums = cleanText(item.find('.rating .rating_nums').first().text());
    if (ratingNums) {
      const r = parseFloat(ratingNums);
      if (!isNaN(r) && r >= 0 && r <= 10) rating = r;
    }
    const votesMatch = ratingText.match(VOTES_RE);
    if (votesMatch) {
      ratingCount = parseInt(votesMatch[1].replace(/,/g, '').replace(/，/g, ''), 10);
    }

    // 5. 摘要（作者 / 出版社 / 出版年）
    let author = null;
    let publisher = null;
    let publishYear = null;
    const abstractHtml = item.find('.abstract').first().html() || '';
    const lines = abstractHtml.split(/<br\s*\/?>/i)
      .map((l) => cleanText(l.replace(/<[^>]+>/g, '')))
      .filter(Boolean);
    for (const line of lines) {
      let m = line.match(/^作者\s*[:：]\s*(.+)$/);
      if (m) { author = m[1]; continue; }
      m = line.match(/^出版社\s*[:：]\s*(.+)$/);
      if (m) { publisher = m[1]; continue; }
      m = line.match(/^出版年\s*[:：]\s*(.+)$/);
      if (m) { publishYear = m[1]; }
    }

    // 6. 加入豆列时间 / 备注（可选）
    const timeEl = item.find('time.time').first();
    let addedAt = timeEl.attr('datetime') || cleanText(timeEl.text()) || null;
    let remark = cleanText(item.find('.doulist-comment, .ft .comments-items p').first().text()) || null;

    books.push({
      doubanId,
      title,
      coverUrl,
      rating,
      ratingCount,
      author,
      publisher,
      publishYear,
      addedAt,
      remark,
      url: `https://book.douban.com/subject/${doubanId}/`
    });
  });

  // 豆列元信息
  const meta = {
    id: (pageUrl.match(/doulist\/(\d+)/) || [])[1] || null,
    title: cleanText($('#content h1 span').first().text())
      || cleanText($('h1').first().text())
      || cleanText($('title').first().text()) || null,
    owner: null,
    ownerUrl: null,
    totalPages: 1
  };

  const metaLink = $('#doulist-info .hd .meta a[href*="/people/"]').first();
  if (metaLink.length) {
    meta.owner = cleanText(metaLink.text()).replace(/\([^)]*\)/g, '').trim() || null;
    meta.ownerUrl = metaLink.attr('href') || null;
  }

  const thisPage = $('.paginator .thispage').first();
  const totalPagesAttr = parseInt(thisPage.attr('data-total-page'), 10);
  if (!isNaN(totalPagesAttr) && totalPagesAttr > 0) {
    meta.totalPages = totalPagesAttr;
  }

  // 下一页 offset
  let nextStart = null;
  const nextHref = $('.paginator span.next a[href]').first().attr('href');
  if (nextHref) {
    try {
      const url = new URL(nextHref, pageUrl);
      if (ALLOWED_HOSTS.has(url.hostname) && url.pathname.startsWith('/doulist/')) {
        const s = parseInt(url.searchParams.get('start'), 10);
        if (!isNaN(s)) nextStart = s;
      }
    } catch { /* 忽略非法链接 */ }
  }

  return { meta, books, nextStart, blocked: false };
}
