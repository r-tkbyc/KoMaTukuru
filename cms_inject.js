// cms_inject.js

const TARGET_STORE_ID = "2";
const TARGET_STORE_SUFFIX = "1";

function isTargetCmsPage() {
  try {
    const u = new URL(location.href);
    if (u.origin !== "https://cmstakashimaya.com") return false;
    if (!u.pathname.startsWith("/webadmin/addon/store/article/create/")) return false;

    const sp = u.searchParams;
    return sp.get("store_id") === TARGET_STORE_ID && sp.get("store_suffix_number") === TARGET_STORE_SUFFIX;
  } catch {
    return false;
  }
}

function setIfEmpty(selector, value) {
  const v = (value || "").trim();
  if (!v) return { touched: false, filled: false };

  const el = document.querySelector(selector);
  if (!el) return { touched: false, filled: false };

  const cur = (el.value || "").trim();
  if (cur !== "") {
    return { touched: true, filled: false };
  }

  el.value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));

  return { touched: true, filled: true };
}

/**
 * フロアの<select multiple> (#article_floor) を
 * 「未選択のときだけ」 values に基づいて複数選択する
 */
function selectFloorsIfNoneSelected(values) {
  const vals = Array.isArray(values) ? values.filter(Boolean) : [];
  if (vals.length === 0) return { touched: false, filled: false };

  const sel = document.querySelector("#article_floor");
  if (!sel) return { touched: false, filled: false };

  // 既に何か選択されているなら触らない（事故防止）
  const already = Array.from(sel.options).some(o => o.selected);
  if (already) return { touched: true, filled: false };

  // values に一致する option を selected にする（存在しないものは無視）
  const set = new Set(vals);
  let any = false;
  for (const opt of sel.options) {
    if (set.has(opt.value)) {
      opt.selected = true;
      any = true;
    }
  }

  if (any) {
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return { touched: true, filled: true };
  }
  return { touched: true, filled: false };
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "CMS_FILL") return;
  if (!isTargetCmsPage()) return;

  const p = msg.payload || {};
  const results = [];

  // タイトル → 管理名、タイトル
  results.push(setIfEmpty("#manage_name_name", p.titleText));
  results.push(setIfEmpty("#title", p.titleText));

  // dt-free → 公開開始
  results.push(setIfEmpty("#public_from_date", p.publicFromDate));

  // 会期出力 → 会期
  results.push(setIfEmpty("#period", p.periodText));

  // 開始日 → 開催開始
  results.push(setIfEmpty("#article_from_date", p.articleFromDate));

  // 終了日 → 開催終了＆公開終了
  results.push(setIfEmpty("#article_to_date", p.articleToDate));
  results.push(setIfEmpty("#public_to_date", p.publicToDate));

  // ✅ フロア（未選択時だけ）
  results.push(selectFloorsIfNoneSelected(p.floorValues));

  // ダイアログ：何か1つでも入力できた場合のみ
  const filledCount = results.filter(r => r.filled).length;
  if (filledCount > 0) {
    alert("入力完了");
  }
});
