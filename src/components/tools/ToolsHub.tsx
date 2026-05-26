"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ToolEntry = {
  slug: string;
  name: string;
  path: string;
  description: string;
  hubDescription?: string;
  navGroup?: string;
};

export function ToolsHub() {
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/data/tools.json")
      .then((r) => {
        if (!r.ok) throw new Error("tools.json unavailable");
        return r.json();
      })
      .then((data: ToolEntry[]) => setTools(data))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <p className="muted">Unable to load tools list.</p>;
  }

  if (!tools.length) {
    return <p className="muted">Loading calculators…</p>;
  }

  return (
    <div className="cn-tools-grid-static" style={{ display: "grid", gap: "var(--cn-space-4)" }}>
      {tools.map((tool) => (
        <article
          key={tool.slug}
          className="card tool-card cn-tool-card-link cn-card-interactive"
          style={{
            padding: "var(--cn-space-5)",
            borderRadius: "var(--cn-radius-md)",
            border: "1px solid var(--cn-border-subtle)",
            background: "var(--cn-bg-elevated)",
            boxShadow: "var(--cn-shadow-xs)",
          }}
        >
          <h2 style={{ margin: "0 0 var(--cn-space-2)", fontSize: "1.1rem" }}>{tool.name}</h2>
          <p className="muted" style={{ margin: "0 0 var(--cn-space-4)", lineHeight: 1.55 }}>
            {tool.hubDescription || tool.description}
          </p>
          <Link href={tool.path} className="btn btn-primary" style={{ display: "inline-block" }}>
            Open
          </Link>
        </article>
      ))}
    </div>
  );
}
