/** Encapsulated banner styles (Shadow DOM) — Light Blur Teaser overlay + shadow card. */
export const COOKIE_BANNER_SHADOW_CSS = `
:host {
  position: fixed !important;
  inset: 0;
  z-index: 9999 !important;
  display: block;
  pointer-events: auto;
  box-sizing: border-box;
}
.cn-cookie-consent-overlay {
  position: absolute;
  inset: 0;
  background: transparent;
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  pointer-events: auto;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
}
.cn-cookie-banner-panel {
  pointer-events: auto;
  box-sizing: border-box;
  width: 100%;
  max-width: 56rem;
  padding: 1.5rem;
  background: #171717;
  border: none;
  border-radius: 0.75rem;
  box-shadow:
    0 20px 40px -12px rgba(0, 0, 0, 0.35),
    0 8px 16px -8px rgba(0, 0, 0, 0.2);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #f5f5f5;
}
.cn-cookie-consent__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}
@media (min-width: 768px) {
  .cn-cookie-consent__inner {
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
  }
}
.cn-cookie-consent__copy {
  min-width: 0;
  flex: 1 1 auto;
  text-align: center;
}
@media (min-width: 768px) {
  .cn-cookie-consent__copy {
    text-align: start;
  }
}
.cn-cookie-consent__title {
  margin: 0 0 0.35rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fafafa;
}
.cn-cookie-consent__desc {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: #a3a3a3;
}
.cn-cookie-consent__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
}
@media (min-width: 768px) {
  .cn-cookie-consent__actions {
    width: auto;
    margin-inline-start: auto;
  }
}
.cn-cookie-consent__btn {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
}
.cn-cookie-consent__btn--decline { color: #a3a3a3; background: transparent; }
.cn-cookie-consent__btn--decline:hover { color: #fff; }
.cn-cookie-consent__btn--accept { color: #fff; background: #2563eb; }
.cn-cookie-consent__btn--accept:hover { background: #3b82f6; }
`;
