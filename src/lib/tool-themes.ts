export type AccentKey = "housing" | "lending" | "auto" | "growth" | "planning";

export type ToolTheme = {
  slug: string;
  navGroup: string;
  accent: AccentKey;
  groupLabel: string;
  icon: string;
};
