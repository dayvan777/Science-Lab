import { useState } from 'react'
import { sound } from '../audio/SoundManager'

export function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted())
  const onClick = () => {
    sound.toggleMute()
    setMuted(sound.isMuted())
  }
  return (
    <button
      onClick={onClick}
      title={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
      style={{
        background: 'rgba(20,20,24,0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#f5f5f7',
        borderRadius: 8,
        width: 40,
        height: 40,
        fontSize: 18,
        cursor: 'pointer',
      }}
      aria-label={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
