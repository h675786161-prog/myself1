/**
 * 七牌 FlClash 代理分组 + Gemini 专用出口 v3.0
 * FlClash -> 覆写 -> 脚本 (JavaScript); Mihomo 核心。
 * 公开分享版：无机场订阅信息、账号、密钥。
 *
 * 重要：脚本是在“应用订阅配置时”修改配置，不会常驻读取网页结果。
 * "Gemini 连通性预筛"不是 Gemini 地区解锁检测！
 * Gemini 专用出口默认复用原配置的代理组；请在代理页选一个实际可用的节点。
 * 只有人工填入下方 GEMINI_VERIFIED_NAMES 的节点才会出现在 Gemini 备用池。
 * 两个已验证节点间自动故障切换也会改变公网 IP。
 */

const QI = {
  NORMAL_URL: "https://www.gstatic.com/generate_204",
  GEMINI_URL: "https://gemini.google.com/app",
  NORMAL_INTERVAL: 180, // 秒；正在使用的自动组每 3 分钟检查
  GEMINI_INTERVAL: 300, // Gemini 连通性预筛每 5 分钟检查
  TIMEOUT: 6000,
  TOLERANCE: 80,
  // 按 FlClash 节点显示名填写，例如 "🇯🇵 日本 03"；需要先亲自确认 Gemini 可用。
  // 无法依靠测速自动识别“地区已解锁”。保留 [] 即不创建故障转移池。
  GEMINI_VERIFIED_NAMES: [],
  // 开启后精准接管 Gemini 及 AI Studio 域名；不接管整个 google.com / accounts.google.com。
  GEMINI_ROUTING: true
};

function main(config) {
  if (!config || typeof config !== "object") return config;
  const originals = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  const directProxies = Array.isArray(config.proxies) ? config.proxies : [];
  const hasProviders = config["proxy-providers"] &&
    typeof config["proxy-providers"] === "object" &&
    Object.keys(config["proxy-providers"]).length > 0;
  if (!directProxies.length && !hasProviders) return config;

  const MAIN = "🌏 七·地区锁定";
  const PINNED = "🔒 七·账号固定节点";
  const GEMINI = "🐱 七·Gemini 专用出口";
  const GEMINI_PROBE = "🧪 Gemini 连通性预筛";
  const GEMINI_POOL = "🐱 Gemini 已验证备用池";
  const INFO = "(?i)(剩余|到期|流量|套餐|重置|官网|客服|订阅|购买|公告|过期|失效|请更新|请续费)";
  const regions = [
    ["🇸🇬 新加坡｜自动择优", "(?i)(🇸🇬|新加坡|狮城|獅城|Singapore|(^|[^A-Za-z])SG([0-9]|[^A-Za-z]|$))"],
    ["🇯🇵 日本｜自动择优", "(?i)(🇯🇵|日本|东京|東京|大阪|Japan|(^|[^A-Za-z])JP([0-9]|[^A-Za-z]|$))"],
    ["🇺🇸 美国｜自动择优", "(?i)(🇺🇸|美国|美國|美西|美东|美東|洛杉矶|洛杉磯|纽约|紐約|硅谷|矽谷|United[ _-]*States|USA|(^|[^A-Za-z])US([0-9]|[^A-Za-z]|$))"],
    ["🇭🇰 香港｜自动择优", "(?i)(🇭🇰|香港|Hong[ _-]*Kong|Hongkong|(^|[^A-Za-z])HK([0-9]|[^A-Za-z]|$))"],
    ["🇹🇼 台湾｜自动择优", "(?i)(🇹🇼|台湾|台灣|臺灣|Taiwan|(^|[^A-Za-z])TW([0-9]|[^A-Za-z]|$))"],
    ["🇰🇷 韩国｜自动择优", "(?i)(🇰🇷|韩国|韓國|首尔|首爾|Seoul|Korea|(^|[^A-Za-z])KR([0-9]|[^A-Za-z]|$))"],
    ["🇬🇧 英国｜自动择优", "(?i)(🇬🇧|英国|英國|伦敦|倫敦|London|Britain|United[ _-]*Kingdom|(^|[^A-Za-z])UK([0-9]|[^A-Za-z]|$)|(^|[^A-Za-z])GB([0-9]|[^A-Za-z]|$))"],
    ["🇩🇪 德国｜自动择优", "(?i)(🇩🇪|德国|德國|法兰克福|法蘭克福|Frankfurt|Germany|(^|[^A-Za-z])DE([0-9]|[^A-Za-z]|$))"],
    ["🇦🇺 澳洲｜自动择优", "(?i)(🇦🇺|澳大利亚|澳大利亞|澳洲|悉尼|雪梨|Sydney|Australia|(^|[^A-Za-z])AU([0-9]|[^A-Za-z]|$))"]
  ];
  const allNames = directProxies.filter(p => p && typeof p.name === "string")
    .map(p => p.name);
  const validNames = new Set(allNames);
  const infoJs = new RegExp(INFO.slice(4), "i"); // strip (?i) for JS engine
  const activeRegions = regions.filter(([name, pattern]) => hasProviders ||
    allNames.some(n => !infoJs.test(n) && new RegExp(pattern.slice(4), "i").test(n)));

  const existing = new Set(originals.map(g => g && g.name).filter(Boolean));
  const additions = [];
  function add(g) {
    if (!existing.has(g.name)) { additions.push(g); existing.add(g.name); }
  }
  const urlTest = (name, url, interval, filter) => ({
    name, type: "url-test", "include-all": true,
    ...(filter ? { filter } : {}),
    "exclude-filter": INFO,
    "empty-fallback": "REJECT",
    url, "expected-status": url === QI.NORMAL_URL ? "204" : "200-399",
    interval, timeout: QI.TIMEOUT, tolerance: QI.TOLERANCE,
    lazy: true, "max-failed-times": 2
  });

  activeRegions.forEach(([name, filter]) => add(urlTest(name, QI.NORMAL_URL, QI.NORMAL_INTERVAL, filter)));
  add({ name: PINNED, type: "select", proxies: ["REJECT"], "include-all": true,
    "exclude-filter": INFO, "default-selected": "REJECT", "empty-fallback": "REJECT" });
  // 手动选国家；未选前不擅自跨国。只存在代理分组不意味着实际已启用。
  if (activeRegions.length) add({ name: MAIN, type: "select",
    proxies: ["REJECT", ...activeRegions.map(([name]) => name), PINNED],
    "default-selected": "REJECT" });

  // 找出原本 Gemini 会走的出口，避免首次装脚本就突然改变登录国家。
  const rules = Array.isArray(config.rules) ? config.rules : [];
  let matched = "";
  for (let i = rules.length - 1; i >= 0; i--) {
    const m = /^MATCH\s*,\s*([^,]+)/i.exec(String(rules[i]));
    if (m) { matched = m[1].trim(); break; }
  }
  const sourceSelects = originals.filter(g => g && g.type === "select" && Array.isArray(g.proxies));
  const base = sourceSelects.find(g => g.name === matched) ||
    sourceSelects.find(g => /^(?:🚀\s*)?(?:节点选择|代理选择|手动选择|PROXY|代理|全局代理|默认代理)$/i.test(g.name)) ||
    sourceSelects[0];
  const baseName = base ? base.name : allNames[0];

  // Gemini 网络层“候选预筛”，不读取网页内容、不保证能实际发消息。
  add(urlTest(GEMINI_PROBE, QI.GEMINI_URL, QI.GEMINI_INTERVAL));

  // 已人工验证的节点故障备用池。provider 订阅里不一定有静态节点名，
  // 如名称无法在 config.proxies 中识别，暂不创建，以免生成无效引用。
  const verified = [...new Set(QI.GEMINI_VERIFIED_NAMES)]
    .filter(n => typeof n === "string" && validNames.has(n) && !infoJs.test(n));
  if (verified.length >= 2) add({
    name: GEMINI_POOL, type: "fallback", proxies: verified,
    url: QI.NORMAL_URL, "expected-status": "204",
    interval: QI.NORMAL_INTERVAL, timeout: QI.TIMEOUT,
    lazy: true, "max-failed-times": 2
  });
  // Gemini 仍由人手动选“真能用”的节点；预筛不自动作为真实解锁依据。
  const entryChoices = [
    ...(baseName ? [baseName] : ["REJECT"]),
    ...(verified.length >= 2 ? [GEMINI_POOL] : []),
    ...verified,
    "REJECT"
  ];
  add({ name: GEMINI, type: "select", proxies: [...new Set(entryChoices)],
    "include-all": true, "exclude-filter": INFO,
    "default-selected": baseName || "REJECT", "empty-fallback": "REJECT" });

  // 把地区锁定入口添加到原来的常用选择组（不强制接管）。
  if (base && activeRegions.length) {
    if (!base.proxies.includes(MAIN)) base.proxies.push(MAIN);
    if (!base.proxies.includes(PINNED)) base.proxies.push(PINNED);
  }

  // 只对 Gemini 的几个明确域名设置专线，其它 Google/AI 使用原订阅分流。
  // 此处刻意不包含 accounts.google.com，避免把所有 Google 登录流量劫持。
  if (QI.GEMINI_ROUTING && baseName) {
    const geminiRules = [
      "DOMAIN-SUFFIX,gemini.google.com," + GEMINI,
      "DOMAIN-SUFFIX,aistudio.google.com," + GEMINI,
      "DOMAIN-SUFFIX,generativelanguage.googleapis.com," + GEMINI,
      "DOMAIN-SUFFIX,makersuite.google.com," + GEMINI
    ];
    config.rules = [...geminiRules.filter(r => !rules.includes(r)), ...rules];
  }

  const order = [GEMINI, GEMINI_POOL, GEMINI_PROBE, MAIN, PINNED,
    ...activeRegions.map(([name]) => name)];
  config["proxy-groups"] = [...originals, ...additions].sort((a, b) => {
    const x = order.indexOf(a.name), y = order.indexOf(b.name);
    return (x === -1 ? 999 : x) - (y === -1 ? 999 : y);
  });
  if (!config.profile || typeof config.profile !== "object" || Array.isArray(config.profile)) {
    config.profile = {};
  }
  config.profile["store-selected"] = true;
  return config;
}
