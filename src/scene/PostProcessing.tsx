import { EffectComposer, DepthOfField, N8AO, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'

type Props = {
  focusDistance?: number  // 0-1 normalized; computed from camera distance to active instrument
  enabled?: boolean
}

export function PostProcessing({ focusDistance = 0.7, enabled = true }: Props) {
  if (!enabled) return null
  return (
    <EffectComposer multisampling={2}>
      <DepthOfField
        focusDistance={focusDistance}
        focalLength={0.05}
        bokehScale={2}
        height={480}
      />
      <N8AO halfRes intensity={0.6} aoRadius={0.3} distanceFalloff={0.5} />
      <Bloom intensity={0.3} luminanceThreshold={0.95} luminanceSmoothing={0.2} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.15} darkness={0.4} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  )
}
