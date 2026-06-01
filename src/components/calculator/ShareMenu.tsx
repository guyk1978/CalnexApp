"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

const SHARE_ICON = (
  <svg
    className="cn-theme-icon"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

type ShareMenuProps = {
  shareUrl: string;
  shareMessage: string;
  calculatorTitle?: string;
  urlInputId?: string;
  /** When true, omit outer cn-calculator-share-wrap (toolbar layout). */
  embedded?: boolean;
};

export function ShareMenu({
  shareUrl,
  shareMessage,
  calculatorTitle = "CalnexApp Calculator",
  urlInputId,
  embedded = false,
}: ShareMenuProps) {
  const reactId = useId();
  const inputId = urlInputId ?? `cnShareUrl-${reactId.replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = useCallback(async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }, []);

  const socialHref = useCallback(
    (network: string) => {
      const title = encodeURIComponent(calculatorTitle);
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedMessage = encodeURIComponent(shareMessage);
      switch (network) {
        case "whatsapp":
          return `https://wa.me/?text=${encodedMessage}`;
        case "facebook":
          return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        case "twitter":
          return `https://twitter.com/intent/tweet?text=${title}&url=${encodedUrl}`;
        case "linkedin":
          return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        default:
          return "#";
      }
    },
    [calculatorTitle, shareMessage, shareUrl]
  );

  const menu = (
      <div className="cn-share-menu" data-cn-share-menu ref={rootRef}>
        <button
          type="button"
          className="btn btn-primary cn-share-menu__trigger"
          data-cn-share-toggle
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          {SHARE_ICON}
          <span>Share</span>
        </button>
        <div
          className="cn-share-menu__panel"
          data-cn-share-panel
          hidden={!open}
          role="dialog"
          aria-label="Share calculation"
        >
          <p className="cn-share-menu__title">Share this calculation</p>
          <p className="muted cn-share-menu__hint">Opens with your inputs pre-filled on CalnexApp.</p>
          <input
            id={inputId}
            className="cn-calculator-share__url"
            type="text"
            readOnly
            value={shareUrl}
            data-cn-share-url
            aria-label="Shareable calculator URL"
          />
          <div className="cn-share-menu__actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-cn-share-action="native"
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: calculatorTitle,
                      text: shareMessage.split("\n").slice(1, -1).join("\n") || calculatorTitle,
                      url: shareUrl,
                    });
                    return;
                  }
                  await copy(shareUrl);
                } catch {
                  /* user cancelled */
                }
              }}
            >
              Share…
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              data-cn-share-action="copy"
              onClick={() => void copy(shareUrl)}
            >
              Copy link
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              data-cn-share-action="copy-message"
              onClick={() => void copy(shareMessage)}
            >
              Copy summary
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              data-cn-share-action="email"
              onClick={() => {
                const subject = encodeURIComponent(calculatorTitle);
                const body = encodeURIComponent(shareMessage);
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
            >
              Email
            </button>
          </div>
          <div className="cn-share-menu__social" aria-label="Social networks">
            {(["whatsapp", "facebook", "twitter", "linkedin"] as const).map((network) => (
              <a
                key={network}
                className="cn-share-menu__social-btn"
                data-cn-share-network={network}
                href={socialHref(network)}
                target="_blank"
                rel="noopener noreferrer"
                title={network}
              >
                {network === "whatsapp"
                  ? "WA"
                  : network === "facebook"
                    ? "f"
                    : network === "twitter"
                      ? "X"
                      : "in"}
              </a>
            ))}
          </div>
        </div>
      </div>
  );

  if (embedded) return menu;

  return (
    <div className="cn-calculator-share-wrap" style={{ margin: 0 }}>
      {menu}
    </div>
  );
}
