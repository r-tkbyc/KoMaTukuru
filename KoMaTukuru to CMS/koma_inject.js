// koma_inject.js

function isKoMaTukuruPage() {
  const titleSet = document.querySelector('[data-set="title"]');
  const kaikiSet = document.querySelector('[data-set="kaiki"]');
  if (!titleSet || !kaikiSet) return false;

  const hasConvert = !!titleSet.querySelector('.btn-convert');
  const hasOutput = !!titleSet.querySelector('textarea.output');
  return hasConvert && hasOutput;
}

function fmtDtFree(datetimeLocalValue) {
  // "2026-01-19T12:30" -> "2026/01/19 12:30"
  const v = (datetimeLocalValue || "").trim();
  if (!v) return "";
  if (v.length >= 16 && v[10] === "T") {
    const y = v.slice(0, 4);
    const mo = v.slice(5, 7);
    const d = v.slice(8, 10);
    const hh = v.slice(11, 13);
    const mm = v.slice(14, 16);
    return `${y}/${mo}/${d} ${hh}:${mm}`;
  }
  return v;
}

function getValue(selector) {
  const el = document.querySelector(selector);
  if (!el) return "";
  if ("value" in el) return (el.value || "").trim();
  return (el.textContent || "").trim();
}

/**
 * 会場テキストから「地下N階」または「N階」を抽出して重複排除し配列で返す
 * 例:
 *  "■地下1階［Takase］\n■オム・メゾン6階 紳士鞄" -> ["地下1階","6階"]
 */
function extractFloorsFromVenueText(venueText) {
  const s = String(venueText || "");
  if (!s.trim()) return [];

  // 全角数字→半角（念のため）
  const half = s.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));

  // 地下N階 or N階（1つの行に複数は想定薄いが、全体から拾う）
  const re = /(地下\s*[0-9]{1,2}\s*階|[0-9]{1,2}\s*階)/g;
  const found = [];
  let m;
  while ((m = re.exec(half)) !== null) {
    const token = m[1].replace(/\s+/g, ''); // "地下 1 階" -> "地下1階"
    found.push(token);
  }

  // 重複排除（順序は出現順）
  const uniq = [];
  const seen = new Set();
  for (const t of found) {
    if (!seen.has(t)) { seen.add(t); uniq.push(t); }
  }
  return uniq;
}

/**
 * 抽出した階（地下1階/地下2階/1階〜14階）を
 * CMS「新宿 館なし」側の option value に変換する
 *
 * ルール：
 *  地下1階 -> F00201B01
 *  地下2階 -> F00201B02
 *  N階(1-14) -> F00201F + 2桁
 */
function mapFloorTokenToCmsValue(token) {
  const t = String(token || "").trim();
  if (!t) return null;

  // 地下
  const b = t.match(/^地下([0-9]{1,2})階$/);
  if (b) {
    const n = Number(b[1]);
    if (n === 1) return "F00201B01";
    if (n === 2) return "F00201B02";
    return null; // 想定外はスキップ
  }

  // 地上
  const f = t.match(/^([0-9]{1,2})階$/);
  if (f) {
    const n = Number(f[1]);
    if (n >= 1 && n <= 14) {
      return "F00201F" + String(n).padStart(2, "0");
    }
    return null;
  }

  return null;
}

function buildPayload() {
  const titleOutput = getValue('[data-set="title"] textarea.output');
  const dtFreeRaw = getValue('[data-set="kaiki"] .dt-free');
  const publicFrom = fmtDtFree(dtFreeRaw);

  const kaikiOutput = getValue('[data-set="kaiki"] textarea.output.kaiki-output') ||
                      getValue('[data-set="kaiki"] textarea.output');

  const startStr = getValue('[data-set="kaiki"] textarea.date-start');
  const endStr   = getValue('[data-set="kaiki"] textarea.date-end');

  // 会場（出力）から階を抽出 → CMS value に変換（null除外）
  const venueOut = getValue('[data-set="venue"] textarea.output');
  const floorTokens = extractFloorsFromVenueText(venueOut);
  const floorValues = floorTokens
    .map(mapFloorTokenToCmsValue)
    .filter(v => !!v);

  // 重複排除（念のため）
  const uniqFloorValues = [];
  const seen = new Set();
  for (const v of floorValues) {
    if (!seen.has(v)) { seen.add(v); uniqFloorValues.push(v); }
  }

  return {
    titleText: titleOutput,
    publicFromDate: publicFrom,
    periodText: kaikiOutput,
    articleFromDate: startStr,
    articleToDate: endStr,
    publicToDate: endStr,

    // フロア（CMS option value 配列）
    floorValues: uniqFloorValues
  };
}

function insertToCmsButton() {
  const titleSet = document.querySelector('[data-set="title"]');
  if (!titleSet) return;

  const actions = titleSet.querySelector('.set-head .actions');
  if (!actions) return;

  if (actions.querySelector('.btn-to-cms')) return;

  const convertBtn = actions.querySelector('.btn-convert');
  if (!convertBtn) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-to-cms';
  btn.textContent = 'toCMS';
  btn.title = 'CMSへ自動入力（空欄のみ）';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const payload = buildPayload();

    try {
      await chrome.runtime.sendMessage({
        type: "KOMA_SEND_TO_CMS",
        payload
      });
    } catch {
      // 仕様：通知なし
    }
  });

  // 変換ボタンの左に挿入
  actions.insertBefore(btn, convertBtn);
}

function boot() {
  if (!isKoMaTukuruPage()) return;
  insertToCmsButton();

  const mo = new MutationObserver(() => {
    if (!isKoMaTukuruPage()) return;
    insertToCmsButton();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

boot();
