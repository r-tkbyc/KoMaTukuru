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
    // 既に値あり：事故防止で触らない
    return { touched: true, filled: false };
  }

  el.value = v;

  // 反応系（validation / datetimepicker / jQuery等）向けにイベントを出す
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));

  return { touched: true, filled: true };
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "CMS_FILL") return;
  if (!isTargetCmsPage()) return;

  const p = msg.payload || {};

  // マッピング（あなたの確定仕様）
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

  // ダイアログ（シンプル）
  // ※「実際に1つでも入力した」時だけ出す（邪魔になりすぎないように）
  const filledCount = results.filter(r => r.filled).length;
  if (filledCount > 0) {
    alert("入力完了");
  } else {
    // 全部スキップ（既に埋まってる/値がない/要素がない）時は何も出さない運用
  }
});
