/**
 * Reading aloud.
 *
 * The single biggest accessibility win in this app: a four-year-old who cannot
 * read can still play everything if the words are spoken. Uses the browser's
 * own voices, so there is nothing to download and it works offline.
 *
 * Every call is best-effort. If the device has no voices, nothing happens and
 * nothing breaks — the pictures still carry the game on their own.
 */
import type { Lang } from '$lib/data/i18n';

let enabled = true;

export function setSpeechEnabled(v: boolean) {
  enabled = v;
  if (!v) stop();
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Prefer a voice that actually speaks the language she is hearing. */
function voiceFor(lang: Lang): SpeechSynthesisVoice | null {
  if (!speechAvailable()) return null;
  const want = lang === 'de' ? 'de' : 'en';
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith(want)) ?? null;
}

export function stop() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}

/**
 * Say something. Slower than default, because it is being read to a small
 * child; `rate` lets a caller slow it further still.
 */
export function speak(text: string, lang: Lang = 'de', rate = 0.9) {
  if (!enabled || !speechAvailable() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'de' ? 'de-DE' : 'en-GB';
    const v = voiceFor(lang);
    if (v) u.voice = v;
    u.rate = rate;
    u.pitch = 1.15;   // a touch brighter, it suits the cast
    window.speechSynthesis.speak(u);
  } catch {
    /* no voices, no problem */
  }
}

/**
 * Read a list of lines one after another, so a whole story page can be played
 * without her having to press anything between paragraphs.
 */
export function speakAll(lines: string[], lang: Lang = 'de', rate = 0.9) {
  if (!enabled || !speechAvailable() || !lines.length) return;
  try {
    window.speechSynthesis.cancel();
    for (const line of lines) {
      const u = new SpeechSynthesisUtterance(line);
      u.lang = lang === 'de' ? 'de-DE' : 'en-GB';
      const v = voiceFor(lang);
      if (v) u.voice = v;
      u.rate = rate;
      u.pitch = 1.1;
      window.speechSynthesis.speak(u);
    }
  } catch {
    /* ignore */
  }
}
