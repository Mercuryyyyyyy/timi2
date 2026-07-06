import { HERO_CHAIN, LS_MUTED } from '../constants';

interface VoiceSet {
  files: string[];
}

let voiceData: Record<string, VoiceSet> = {};
let audioContext: AudioContext | null = null;
let bgmElement: HTMLAudioElement | null = null;
let isMuted = false;

// Preloaded audio buffers
const audioCache = new Map<string, AudioBuffer>();

/**
 * Map nameEn values to the directory keys used by the download script.
 * Most heroes derive their key via nameEn.toLowerCase().replace(/_/g, ''),
 * but a few use non-pinyin directory names.
 */
function getAudioKey(nameEn: string): string {
  const overrides: Record<string, string> = {
    'marco_polo': 'makeboluo',
    'gan_jiang_mo_ye': 'ganjiangmoxie',
  };
  return overrides[nameEn] ?? nameEn.toLowerCase().replace(/_/g, '');
}

export async function initAudio(): Promise<void> {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  // Load voice manifest (await so preloads don't race)
  try {
    const r = await fetch('/audio/voices.json');
    voiceData = await r.json();
  } catch {
    console.warn('voices.json not found, run download script');
  }

  // Load mute state
  try { isMuted = localStorage.getItem(LS_MUTED) === 'true'; } catch { isMuted = false; }
}

export function resumeAudio(): void {
  if (audioContext?.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
}

export async function preloadHeroAudio(tier: number): Promise<void> {
  const hero = HERO_CHAIN.find(h => h.tier === tier);
  if (!hero) return;

  const key = getAudioKey(hero.nameEn);
  const files = voiceData[key]?.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    const cacheKey = `${key}/${file}`;
    if (audioCache.has(cacheKey)) continue;

    try {
      const response = await fetch(`/audio/${key}/${file}`);
      const arrayBuffer = await response.arrayBuffer();
      if (audioContext) {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioCache.set(cacheKey, audioBuffer);
      }
    } catch {
      // Silently skip failed preloads
    }
  }
}

export async function preloadAllAudio(): Promise<void> {
  const promises = HERO_CHAIN.map(h => preloadHeroAudio(h.tier));
  await Promise.allSettled(promises);
}

export function playHeroVoice(tier: number): void {
  if (isMuted || !audioContext) return;

  const hero = HERO_CHAIN.find(h => h.tier === tier);
  if (!hero) return;

  const key = getAudioKey(hero.nameEn);
  const files = voiceData[key]?.files;
  if (!files || files.length === 0) return;

  // Pick a random voice file for this hero
  const file = files[Math.floor(Math.random() * files.length)];
  const cacheKey = `${key}/${file}`;

  const cached = audioCache.get(cacheKey);
  if (cached) {
    playBuffer(cached);
  } else {
    // Load on demand
    fetch(`/audio/${key}/${file}`)
      .then(r => r.arrayBuffer())
      .then(buf => audioContext!.decodeAudioData(buf))
      .then(audioBuffer => {
        audioCache.set(cacheKey, audioBuffer);
        playBuffer(audioBuffer);
      })
      .catch(() => {});
  }
}

function playBuffer(buffer: AudioBuffer): void {
  if (!audioContext || isMuted) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  // Create a gain node for volume control
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.7;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start(0);
}

export function setMuted(muted: boolean): void {
  isMuted = muted;
}

export function playBGM(): void {
  if (isMuted) return;
  // BGM is optional — no built-in BGM file
  // Could be extended to play a looping background track
}

export function stopBGM(): void {
  if (bgmElement) {
    bgmElement.pause();
    bgmElement.currentTime = 0;
  }
}

/** Play the special 甄姬 BGM if available */
export async function playZhenjiBGM(): Promise<void> {
  if (isMuted || !audioContext) return;
  try {
    const response = await fetch('/audio/zhenji/betray.mp3');
    if (!response.ok) return;
    const buffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(buffer);
    playBuffer(audioBuffer);
  } catch {}
}

export function getIsMuted(): boolean {
  return isMuted;
}
