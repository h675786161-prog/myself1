/**
 * 七牌 FlClash 赔钱机场原生组自愈补丁 v1.0
 * 只覆盖原有 url-test 组的健康检查参数，不新增代理组、不改 DNS/规则/节点。
 * 在 FlClash 当前订阅选择本脚本为唯一脚本覆写；勿与旧版 v2.2 / v3.0 同时用。
 * 测速只能评估探测 URL，不能判断 Gemini 地区解锁或实际下载带宽。
 */
function main(config) {
  if (!config || typeof config !== "object") return config;
  const groups = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  const regions = new Set(["🇯🇵日本节点", "🇸🇬狮城节点", "🇺🇸美国节点"]);
  const globalAuto = "♻️自动选择";

  for (const group of groups) {
    if (!group || group.type !== "url-test") continue;
    if (!regions.has(group.name) && group.name !== globalAuto) continue;

    // 180 秒周期、两次连接失败后可触发提前检测。
    group.interval = 180;
    group.timeout = 5000;
    group.tolerance = 80;
    group["max-failed-times"] = 2;

    // 三个地区组持续健康检查，不依赖“是否被选中”的 lazy 判定。
    // 全量组候选多，只有实际使用时才检查，减少手机耗电。
    group.lazy = !regions.has(group.name);
  }
  return config;
}
