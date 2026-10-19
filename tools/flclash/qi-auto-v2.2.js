/**
 * 七牌 FlClash 地区锁定 + 自动测速 · 免手动测速版 v2.2 (2026-10)
 * 适用：FlClash 的 JavaScript 覆写脚本（function main(config)）及 Mihomo 内核。
 * 免手动测速版：缩短自动检查周期，降低连接失败触发阈值；保持地区锁定与账号固定功能。
 *
 * 【安全边界】
 * - 自动组只在「同一个地区」的节点之间测速择优；不会自动跨国寻找备用节点。
 * - 但同地区不同节点的出口 IP 也可能不同。重要账号请选「🔒 七·账号固定节点」，
 *   再手工选定单个节点；固定节点名称也不代表运营商绝不会改变出口 IP。
 * - 不重写原订阅 DNS / 规则 / 节点；默认不自动接管原有代理选择。
 * - 「🌏 七·地区锁定」首次默认为 REJECT：请先在其中选好地区再用它接管原主组。
 * - 如想强制把 AI 网站固定到账号节点：先在 FlClash 里给「🔒 七·账号固定节点」
 *   选定单个节点，再将下方 ROUTE_AI_SITES_TO_PINNED 改为 true，保存并重载。
 * - 网站/平台风控没有“绝对不封号”的脚本保证。
 *
 * 【安装】先进阶配置 → 脚本中保存本脚本，然后去当前「配置」订阅的覆写选项
 *         关联本脚本。不要和旧版「⚡ 七牌自动测速」同时叠加使用。
 */

const QI_SETTINGS = {
  TEST_URL: "https://www.gstatic.com/generate_204",
  INTERVAL_SECONDS: 180,    // 每 3 分钟检测一次；未使用的地区惰性停测
  TIMEOUT_MS: 5000,
  TOLERANCE_MS: 80,         // 延迟相差不明显时不轻易换节点；不是固定 IP
  LAZY: true,
  // 默认不开启改动网站分流。启用前务必在固定节点组内手动选好单个节点，
  // 因为固定节点组首次的安全默认值是 REJECT（拒绝联网）。
  ROUTE_AI_SITES_TO_PINNED: false,
};

function main(config) {
  if (!config || typeof config !== "object") return config;

  const originalGroups = Array.isArray(config["proxy-groups"])
    ? config["proxy-groups"] : [];
  const originalProxies = Array.isArray(config.proxies) ? config.proxies : [];
  const providers = config["proxy-providers"];
  const hasProviders = !!providers && typeof providers === "object" &&
    Object.keys(providers).length > 0;
  if (!originalProxies.length && !hasProviders) return config;

  const MAIN = "🌏 七·地区锁定";
  const PINNED = "🔒 七·账号固定节点";
  const INFO_FILTER = "(?i)(剩余|到期|流量|套餐|重置|官网|客服|订阅|购买|公告|过期|失效|请更新|请续费)";
  // 地区依据节点名称识别（包含国旗 / 中文 / 英文缩写 / 常见城市），不做 IP 定位。
  // 正则使用 RE2 兼容语法：不用 lookbehind / lookahead。
  const regions = [
    { name: "🇸🇬 新加坡｜自动择优", filter: "(?i)(🇸🇬|新加坡|狮城|獅城|Singapore|(^|[^A-Za-z])SG([0-9]|[^A-Za-z]|$))" },
    { name: "🇯🇵 日本｜自动择优", filter: "(?i)(🇯🇵|日本|东京|東京|大阪|Japan|(^|[^A-Za-z])JP([0-9]|[^A-Za-z]|$))" },
    { name: "🇺🇸 美国｜自动择优", filter: "(?i)(🇺🇸|美国|美國|美西|美东|美東|洛杉矶|洛杉磯|纽约|紐約|硅谷|矽谷|United[ _-]*States|USA|(^|[^A-Za-z])US([0-9]|[^A-Za-z]|$))" },
    { name: "🇭🇰 香港｜自动择优", filter: "(?i)(🇭🇰|香港|Hong[ _-]*Kong|Hongkong|(^|[^A-Za-z])HK([0-9]|[^A-Za-z]|$))" },
    { name: "🇹🇼 台湾｜自动择优", filter: "(?i)(🇹🇼|台湾|台灣|臺灣|Taiwan|(^|[^A-Za-z])TW([0-9]|[^A-Za-z]|$))" },
    { name: "🇰🇷 韩国｜自动择优", filter: "(?i)(🇰🇷|韩国|韓國|首尔|首爾|Seoul|Korea|(^|[^A-Za-z])KR([0-9]|[^A-Za-z]|$))" },
    { name: "🇬🇧 英国｜自动择优", filter: "(?i)(🇬🇧|英国|英國|伦敦|倫敦|London|Britain|United[ _-]*Kingdom|(^|[^A-Za-z])UK([0-9]|[^A-Za-z]|$)|(^|[^A-Za-z])GB([0-9]|[^A-Za-z]|$))" },
    { name: "🇩🇪 德国｜自动择优", filter: "(?i)(🇩🇪|德国|德國|法兰克福|法蘭克福|Frankfurt|Germany|(^|[^A-Za-z])DE([0-9]|[^A-Za-z]|$))" },
    { name: "🇦🇺 澳洲｜自动择优", filter: "(?i)(🇦🇺|澳大利亚|澳大利亞|澳洲|悉尼|雪梨|Sydney|Australia|(^|[^A-Za-z])AU([0-9]|[^A-Za-z]|$))" },
  ];

  const existingNames = new Set(originalGroups.filter(g => g && typeof g.name === "string")
    .map(g => g.name));
  const allNames = originalProxies.filter(p => p && typeof p.name === "string").map(p => p.name);
  const isInfo = new RegExp(INFO_FILTER.replace(/^\(\?i\)/, ""), "i");
  // 没有 providers 时可以提前排除空地区；有 providers 时须交给内核匹配订阅更新后的节点。
  const activeRegions = regions.filter(r => hasProviders ||
    allNames.some(name => !isInfo.test(name) &&
      new RegExp(r.filter.replace(/^\(\?i\)/, ""), "i").test(name)));
  if (!activeRegions.length) return config; // 不改动无可识别节点的订阅

  const groups = originalGroups.slice();
  const add = g => { if (!existingNames.has(g.name)) {
    groups.push(g);
    existingNames.add(g.name);
  }};

  // url-test 自动测速：地区之间没有自动回退链，空地区拒绝转发而不是偷跑到其它国家。
  activeRegions.forEach(r => add({
    name: r.name,
    type: "url-test",
    "include-all": true,
    filter: r.filter,
    "exclude-filter": INFO_FILTER,
    "exclude-type": "Direct|Reject|Compatible",
    "empty-fallback": "REJECT",
    url: QI_SETTINGS.TEST_URL,
    "expected-status": 204,
    interval: QI_SETTINGS.INTERVAL_SECONDS,
    timeout: QI_SETTINGS.TIMEOUT_MS,
    tolerance: QI_SETTINGS.TOLERANCE_MS,
    lazy: QI_SETTINGS.LAZY,
    "max-failed-times": 2, // 达到失败阈值后更早触发主动健康检查
  }));

  // 固定账号出口：首次默认为 REJECT，不会在用户没有选节点时擅自跨国。
  // 注意：include-all 会展示原订阅所有普通节点及 providers 节点，选定的是单个节点。
  add({
    name: PINNED,
    type: "select",
    proxies: ["REJECT"],
    "include-all": true,
    "exclude-filter": INFO_FILTER,
    "exclude-type": "Direct|Reject|Compatible",
    "default-selected": "REJECT",
    "empty-fallback": "REJECT",
  });

  // 先选择固定国家/固定出口；不提供跨国自动切换入口。
  const choices = ["REJECT"].concat(activeRegions.map(r => r.name), [PINNED]);
  add({
    name: MAIN,
    type: "select",           // 必须由人决定所在国家；不能用跨国 url-test
    proxies: choices,
    "default-selected": "REJECT", // 首次须手动选地区，绝不擅自决定出口国家
  });

  // 对接订阅当前的主代理选择组，绝不替换当前已有选项或修改其默认值。
  // 用户到“代理”页手动点选「🌏 七·地区锁定」后才会接管该组。
  const rules = Array.isArray(config.rules) ? config.rules : [];
  let matchTarget = "";
  for (let i = rules.length - 1; i >= 0; i--) {
    const found = /^MATCH\s*,\s*([^,]+)/i.exec(String(rules[i]));
    if (found) { matchTarget = found[1].trim(); break; }
  }
  const sourceSelects = originalGroups.filter(g => g && g.type === "select" &&
    Array.isArray(g.proxies) && ![MAIN, PINNED].includes(g.name));
  const entry = sourceSelects.find(g => g.name === matchTarget) ||
    sourceSelects.find(g => /^(?:🚀\s*)?(?:节点选择|代理选择|手动选择|PROXY|Proxy|代理|全局代理|默认代理|漏网之鱼|🐟\s*漏网之鱼)$/i.test(g.name));
  if (entry) {
    if (!entry.proxies.includes(MAIN)) entry.proxies.push(MAIN);
    if (!entry.proxies.includes(PINNED)) entry.proxies.push(PINNED);
  }
  // 仅把固定节点作为 AI 服务组中的「可手选选项」，不擅自改变原 AI 规则。
  sourceSelects.forEach(g => {
    if (g !== entry && /^(?:AI|AIGC|ChatGPT|OpenAI|Gemini|Claude|国外AI|人工智能|🤖\s*AI)$/i.test(g.name) &&
        !g.proxies.includes(PINNED)) g.proxies.push(PINNED);
  });

  // 默认关闭：打开后，这些具体 AI 站点将优先走固定账号出口。
  // 不拦截整个 google.com / googleapis.com，也不修改登录或 DNS 系统配置。
  if (QI_SETTINGS.ROUTE_AI_SITES_TO_PINNED) {
    const aiRules = [
      "DOMAIN-SUFFIX,chatgpt.com," + PINNED,
      "DOMAIN-SUFFIX,openai.com," + PINNED,
      "DOMAIN-SUFFIX,oaistatic.com," + PINNED,
      "DOMAIN-SUFFIX,oaiusercontent.com," + PINNED,
      "DOMAIN-SUFFIX,claude.ai," + PINNED,
      "DOMAIN-SUFFIX,anthropic.com," + PINNED,
      "DOMAIN,gemini.google.com," + PINNED,
      "DOMAIN,aistudio.google.com," + PINNED,
      "DOMAIN,makersuite.google.com," + PINNED,
      "DOMAIN,generativelanguage.googleapis.com," + PINNED,
    ];
    config.rules = aiRules.filter(r => !rules.includes(r)).concat(rules);
  }

  // 让代理页优先显示两个重要入口，再显示地区明细；原订阅分组相对顺序不变。
  // 只是布局顺序，不会改变规则引用或原有代理组的选中项。
  const priority = [MAIN, PINNED].concat(activeRegions.map(r => r.name));
  groups.sort((a, b) => {
    const ai = priority.indexOf(a.name);
    const bi = priority.indexOf(b.name);
    return (ai < 0 ? priority.length : ai) - (bi < 0 ? priority.length : bi);
  });

  // 记住手动选择，不强制打开全局代理或修改原有 DNS/TUN。
  if (!config.profile || typeof config.profile !== "object" || Array.isArray(config.profile)) {
    config.profile = {};
  }
  config.profile["store-selected"] = true;
  config["proxy-groups"] = groups;
  return config;
}