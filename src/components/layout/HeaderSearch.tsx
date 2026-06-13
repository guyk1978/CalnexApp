"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterSiteSearchIndex, type SiteSearchItem } from "@/lib/site-search-filter";

function resolveAsset(path: string): string {
  const calnexPath = (window as Window & { CalnexPath?: (p: string) => string }).CalnexPath;
  return calnexPath ? calnexPath(path) : path;
}

function SearchTriggerIcon() {
  return (
    <svg
      className="cn-header-search-trigger__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function FieldSearchIcon() {
  return (
    <svg
      className="cn-header-search__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function HeaderSearch() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SiteSearchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(resolveAsset("/data/search-index.json"))
      .then((response) => (response.ok ? response.json() : []))
      .then((data: SiteSearchItem[]) => {
        if (!cancelled && Array.isArray(data)) {
          setIndex(data);
          console.log("[CalnexApp] Site search index loaded", data.length, "items");
        }
      })
      .catch((err) => {
        console.warn("[CalnexApp] Site search index failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => filterSiteSearchIndex(index, query, 8), [query, index]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }, []);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    setActiveIndex(-1);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const toggleSearch = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (isSearchOpen) {
        closeSearch();
        return;
      }
      openSearch();
    },
    [closeSearch, isSearchOpen, openSearch]
  );

  useEffect(() => {
    if (!isSearchOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (wrapRef.current?.contains(target)) return;
      closeSearch();
    };

    // Defer so the opening click does not immediately close the panel.
    const timer = window.setTimeout(() => {
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [closeSearch, isSearchOpen]);

  useEffect(() => {
    setActiveIndex(results.length ? 0 : -1);
  }, [results]);

  const showDropdown = isSearchOpen && query.trim().length >= 1;

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || !results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      closeSearch();
      window.location.assign(results[activeIndex].url);
    }
  };

  return (
    <div id="cn-site-search-mount" className="cn-header-search-mount" data-cn-react-search="true">
      <div
        ref={wrapRef}
        className={`cn-header-search-wrap${isSearchOpen ? " is-open" : ""}`}
      >
        <button
          type="button"
          className="cn-header-search-trigger"
          aria-label="Search"
          aria-expanded={isSearchOpen}
          aria-controls="cn-header-search"
          onClick={toggleSearch}
        >
          <SearchTriggerIcon />
        </button>

        {isSearchOpen ? (
          <div id="cn-header-search" className="cn-header-search">
            <label className="sr-only" htmlFor="cn-header-search-input">
              Search
            </label>
            <div className="cn-header-search__field">
              <span className="cn-header-search__icon" aria-hidden>
                <FieldSearchIcon />
              </span>
              <input
                ref={inputRef}
                type="search"
                id="cn-header-search-input"
                className="cn-header-search__input"
                placeholder="Search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls="cn-header-search-list"
                aria-autocomplete="list"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
              />
            </div>

            {showDropdown ? (
              <div className="cn-header-search__dropdown" id="cn-header-search-dropdown">
                <div className="cn-header-search__list" id="cn-header-search-list" role="listbox">
                  {results.length ? (
                    results.map((item, idx) => (
                      <Link
                        key={item.url}
                        href={item.url}
                        className={`cn-header-search__item${idx === activeIndex ? " is-active" : ""}`}
                        role="option"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={closeSearch}
                      >
                        {item.title}
                      </Link>
                    ))
                  ) : (
                    <p className="cn-header-search__empty">No results found</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
