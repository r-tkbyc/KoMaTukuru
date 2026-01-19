// koma_inject.js

function isKoMaTukuruPage() {
  // かなり軽い判定：必要要素が揃ってるときだけ動く
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
  // 想定外ならそのまま返す（ユーザー運用に合わせる）
  return v;
}

function getValue(selector) {
  const el = document.querySelector(selector);
  if (!el) return "";
  if ("value" in el) return (el.value || "").trim();
  return (el.textContent || "").trim();
}

function buildPayload() {
  const titleOutput = getValue('[data-set="title"] textarea.output');
  const dtFreeRaw = getValue('[data-set="kaiki"] .dt-free');
  const publicFrom = fmtDtFree(dtFreeRaw);

  // 会期出力（kaiki-output）
  const kaikiOutput = getValue('[data-set="kaiki"] textarea.output.kaiki-output') ||
                      getValue('[data-set="kaiki"] textarea.output');

  const startStr = getValue('[data-set="kaiki"] textarea.date-start');
  const endStr   = getValue('[data-set="kaiki"] textarea.date-end');

  return {
    titleText: titleOutput,
    publicFromDate: publicFrom,
    periodText: kaikiOutput,
    articleFromDate: startStr,
    articleToDate: endStr,
    publicToDate: endStr
  };
}

function insertToCmsButton() {
  const titleSet = document.querySelector('[data-set="title"]');
  if (!titleSet) return;

  const actions = titleSet.querySelector('.set-head .actions');
  if (!actions) return;

  // 既に追加済みなら何もしない
  if (actions.querySelector('.btn-to-cms')) return;

  const convertBtn = actions.querySelector('.btn-convert');
  if (!convertBtn) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-to-cms';
  btn.textContent = 'toCMS';
  btn.title = 'CMSへ自動入力（空欄のみ）';

  // 見た目：既存ボタンと同じ雰囲気に寄せる（CSSは既存buttonに乗る）
  // クリック時：全項目まとめて送る
  btn.addEventListener('click', async (e) => {
    e.preventDefault();

    const payload = buildPayload();

    // KoMaTukuruの各値が未変換の可能性があるので、ここで「変換」してから送りたい場合は
    // convertBtn.click(); を先に呼ぶ設計も可能。今回は「現状の出力を送る」仕様でそのまま。

    try {
      await chrome.runtime.sendMessage({
        type: "KOMA_SEND_TO_CMS",
        payload
      });
    } catch {
      // 仕様：通知は後で。今は黙る。
    }
  });

  // 変換ボタンの左に挿入
  actions.insertBefore(btn, convertBtn);
}

function boot() {
  if (!isKoMaTukuruPage()) return;
  insertToCmsButton();

  // DOMが後から描画されても追従
  const mo = new MutationObserver(() => {
    if (!isKoMaTukuruPage()) return;
    insertToCmsButton();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

boot();
