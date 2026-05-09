import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

/**
 * Light post-processing pass. Bloom for highlights/LCD glow, vignette
 * for compositional focus. Tone mapping is applied at the Canvas-level
 * via gl prop (ACESFilmicToneMapping) — not via a post pass for perf.
 */
export function PostFX() {
  return (
    <EffectComposer>
      <Bloom intensity={0.22} luminanceThreshold={0.92} luminanceSmoothing={0.05} mipmapBlur />
      <Vignette eskil={false} offset={0.3} darkness={0.6} />
    </EffectComposer>
  )
}
