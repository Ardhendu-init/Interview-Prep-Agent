const TTS_STORAGE_KEY = "interview-tts-enabled";

export function getTtsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(TTS_STORAGE_KEY) === "true";
}

export function setTtsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TTS_STORAGE_KEY, String(enabled));
}
