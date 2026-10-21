/**
 * 七牌 FlClash 地区锁定 + 自动测速 · 统一分流版 v2.3 (2026-10)
 * 适用：FlClash 的 JavaScript 覆写脚本（function main(config)）及 Mihomo 内核。
 * 免手动测速版：缩短自动检查周期，降低连接失败触发阈值；保持地区锁定与账号固定功能。
 *
 * 【行为】
 * - 原订阅中指向代理组/节点的规则统一交给「🌏 七·地区锁定」。
 * - 保留 DIRECT / REJECT 等内置策略及原有 DNS、TUN 设置。
 * - 地区组只在同地区择优；固定出口请在地区锁定里选「账号固定节点」。
 * - 首次须手动选择地区；节点名称不能保证出口 IP 永远不变。
 * - 原代理组仅供兼容，不再决定已统一规则的出口。
 * 【安装】保存为 FlClash JavaScript 脚本，在订阅的覆写选项中关联并重载。
 */

const QI_SETTINGS = {
  TEST_URL: "https://www.gstatic.com/generate_204",
  INTERVAL_SECONDS: 180,    // 每 3 分钟检测一次；未使用的地区惰性停测
  TIMEOUT_MS: 5000,
  TOLERANCE_MS: 80,         // 延迟相差不明显时不轻易换节点；不是固定 IP
  LAZY: true,
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

  // 规则的目标位于末尾；IP 规则可能附带 no-resolve。
  // 只重定向原有代理组/节点引用，保留内置策略和未知动作。
  const proxyTargets = new Set(originalGroups.map(g => g && g.name)
    .concat(originalProxies.map(p => p && p.name))
    .filter(n => typeof n === "string"));
  [MAIN, PINNED].concat(regions.map(r => r.name)).forEach(n => proxyTargets.delete(n));
  const builtins = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);
  function routeRule(rule) {
    if (typeof rule !== "string") return rule;
    const parts = rule.split(",");
    const kind = parts[0].trim().toUpperCase();
    // SUB-RULE 的末尾是子规则名，不是出口策略。
    if (kind === "SUB-RULE") return rule;
    let index = parts.length - 1;
    while (index > 0 && /^(no-resolve|src|dst)$/i.test(parts[index].trim())) index--;
    const destination = parts[index].trim();
    if (!builtins.has(destination) && proxyTargets.has(destination)) {
      parts[index] = MAIN;
      return parts.join(",");
    }
    return rule;
  }
  if (Array.isArray(config.rules)) config.rules = config.rules.map(routeRule);
  if (config["sub-rules"] && typeof config["sub-rules"] === "object") {
    Object.keys(config["sub-rules"]).forEach(key => {
      const list = config["sub-rules"][key];
      if (Array.isArray(list)) config["sub-rules"][key] = list.map(routeRule);
    });
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