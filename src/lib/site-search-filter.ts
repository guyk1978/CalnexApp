export type SiteSearchItem = {
  title: string;
  description: string;
  keywords?: string;
  url: string;
};

/** Case-insensitive partial match across title, description, and keywords. */
export function filterSiteSearchIndex(items: SiteSearchItem[], query: string, limit = 8): SiteSearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const filteredResults = items.filter((item) => {
    const title = String(item.title ?? "").toLowerCase();
    const description = String(item.description ?? "").toLowerCase();
    const keywords = String(item.keywords ?? "").toLowerCase();
    return title.includes(q) || description.includes(q) || keywords.includes(q);
  });

  console.log("[CalnexApp] filteredResults", filteredResults);

  return filteredResults.slice(0, limit);
}
