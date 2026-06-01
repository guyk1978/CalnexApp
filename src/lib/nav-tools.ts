import toolsJson from "../../data/tools.json";
import navGroupsJson from "../../data/nav-tool-groups.json";

export type NavTool = {
  slug: string;
  name: string;
  path: string;
  navGroup: string;
};

export type NavGroupMeta = {
  label: string;
  order: number;
};

const NAV_GROUP_META = navGroupsJson as Record<string, NavGroupMeta>;
const TOOLS = toolsJson as NavTool[];

export function getNavToolsByGroup(): { key: string; label: string; order: number; tools: NavTool[] }[] {
  const byGroup = new Map<string, NavTool[]>();
  for (const tool of TOOLS) {
    const key = tool.navGroup || "lending";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(tool);
  }

  return [...byGroup.entries()]
    .map(([key, groupTools]) => ({
      key,
      label: NAV_GROUP_META[key]?.label ?? key,
      order: NAV_GROUP_META[key]?.order ?? 99,
      tools: groupTools.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.order - b.order);
}
