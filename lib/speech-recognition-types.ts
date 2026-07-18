/**
 * Minimal ambient types for the Web Speech API's SpeechRecognition interface.
 * Not part of TypeScript's default lib.dom.d.ts — only the members this app
 * actually uses are declared here, deliberately not the full spec surface.
 */

export interface SpeechRecognitionResultLike {
  readonly length: number;
  [index: number]: { readonly transcript: string };
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike extends Event {
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

export interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
}

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as WindowWithSpeechRecognition;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
