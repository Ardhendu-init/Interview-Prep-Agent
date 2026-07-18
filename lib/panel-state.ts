const OPEN_KEY = "interview-panel-open";
const WIDTH_KEY = "interview-panel-width";

export const PANEL_MIN_WIDTH = 360;

export function clampPanelWidth(width: number, viewportWidth: number): number {
  const max = viewportWidth * 0.45;
  return Math.min(Math.max(width, PANEL_MIN_WIDTH), Math.max(max, PANEL_MIN_WIDTH));
}

export function defaultPanelWidth(viewportWidth: number): number {
  return clampPanelWidth(viewportWidth * 0.34, viewportWidth);
}

export function getPanelOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(OPEN_KEY) === "true";
}

export function setPanelOpen(open: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(OPEN_KEY, String(open));
}

export function getPanelWidth(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(WIDTH_KEY);
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function setPanelWidth(width: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(WIDTH_KEY, String(Math.round(width)));
}
