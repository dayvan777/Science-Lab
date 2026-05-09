import { clamp } from '../animation'

export type SoundId = 'tick' | 'ding' | 'whoosh' | 'success' | 'error'

const STORAGE_KEY = 'lab-sdk.audio.muted'

export class SoundManager {
  private muted: boolean
  private volume: number = 0.6
  private buffers = new Map<SoundId, AudioBuffer>()
  private ctx: AudioContext | null = null

  constructor() {
    this.muted = readMuted()
  }

  isMuted(): boolean {
    return this.muted
  }

  toggleMute(): void {
    this.muted = !this.muted
    writeMuted(this.muted)
  }

  getVolume(): number {
    return this.volume
  }

  setVolume(v: number): void {
    this.volume = clamp(v, 0, 1)
  }

  /**
   * Lazy-init AudioContext on first user-driven play call.
   * Web Audio API forbids creating a context before user gesture.
   */
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    return this.ctx
  }

  /**
   * Preload all sounds. Call after first user interaction.
   */
  async preload(catalog: Record<SoundId, string>): Promise<void> {
    const ctx = this.ensureContext()
    if (!ctx) return
    const entries = Object.entries(catalog) as [SoundId, string][]
    await Promise.all(entries.map(async ([id, url]) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const arrayBuf = await res.arrayBuffer()
        const audioBuf = await ctx.decodeAudioData(arrayBuf)
        this.buffers.set(id, audioBuf)
      } catch {
        // Swallow; play() will no-op if buffer missing.
      }
    }))
  }

  play(id: SoundId, volumeMul: number = 1): void {
    if (this.muted) return
    const buf = this.buffers.get(id)
    if (!buf) return
    const ctx = this.ensureContext()
    if (!ctx || ctx.state === 'suspended') return
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = this.volume * volumeMul
    src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
  }
}

function readMuted(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(v: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  } catch {
    // ignore
  }
}

// Singleton for convenience.
export const sound = new SoundManager()
