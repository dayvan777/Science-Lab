import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

type Props = {
  /** Bloom strength. Default 0.22 (unchanged for existing labs). */
  bloomIntensity?: number
  /** Luminance threshold above which pixels bloom. Default 0.92. */
  bloomThreshold?: number
}

/**
 * Light post-processing pass. Bloom for highlights/LCD glow, vignette
 * for compositional focus. Tone mapping is applied at the Canvas-level
 * via gl prop (ACESFilmicToneMapping) — not via a post pass for perf.
 *
 * Bloom is tunable per lab (defaults preserve the original look); the
 * diffusion lab passes gentler values so its glass box doesn't blow out.
 */
export function PostFX({ bloomIntensity = 0.22, bloomThreshold = 0.92 }: Props = {}) {
  return (
    <EffectComposer>
      <Bloom intensity={bloomIntensity} luminanceThreshold={bloomThreshold} luminanceSmoothing={0.05} mipmapBlur />
      <Vignette eskil={false} offset={0.3} darkness={0.6} />
    </EffectComposer>
  )
}
