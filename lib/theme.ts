export const THEMES = ["dark", "midnight", "graphite", "light"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "dark";

export const THEME_STORAGE_KEY = "interview-prep-theme";

export const THEME_LABELS: Record<Theme, string> = {
  dark: "Dark",
  midnight: "Midnight",
  graphite: "Graphite",
  light: "Light",
};

export function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

/** Inlined into a blocking <script> in the root layout so the theme is set before first paint. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var themes=${JSON.stringify(THEMES)};if(!t||themes.indexOf(t)===-1){t="${DEFAULT_THEME}";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
