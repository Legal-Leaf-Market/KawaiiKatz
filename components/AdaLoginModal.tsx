'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'

const ADA_PIN = 'ada2026'

type Props = {
  open: boolean
  onClose: () => void
}

export default function AdaLoginModal({ open, onClose }: Props) {
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const { dispatch } = useStore()

  function handleLogin() {
    if (pin === ADA_PIN) {
      dispatch({ type: 'SET_ADA_AUTHORIZED', on: true })
      dispatch({ type: 'SET_ADA_MODE', on: true })
      try {
        localStorage.setItem('wc_ada_authorized', '1')
        localStorage.setItem('wc_ada_mode_off', '0')
      } catch { /* ignore */ }
      setMsg('')
      setPin('')
      onClose()
    } else {
      setMsg('Wrong PIN. Try again.')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleLogin()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Ada login">
      <div className="absolute inset-0 bg-[rgba(79,69,80,.45)]" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-[#fffaf0] border-4 border-[#b79cff] rounded-[26px] shadow-[0_8px_24px_rgba(255,138,101,.16)] p-6 w-[min(380px,92vw)]">
        <button onClick={onClose} className="absolute top-3.5 right-5 text-[28px] text-[#9a8fa3] cursor-pointer border-none bg-none" aria-label="Close">×</button>
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">🌙</div>
          <h3 className="font-display font-extrabold text-[28px] text-[#4f4550] mb-1">Ada Mode</h3>
          <p className="text-[#9a8fa3] text-[14px]">Enter your curator PIN to manage picks.</p>
        </div>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter PIN…"
          className="w-full border-[3px] border-[#b79cff] bg-white rounded-[14px] px-4 py-3 font-sans font-bold text-[#4f4550] outline-none my-3 focus:border-[#ff8a65]"
          autoComplete="current-password"
          aria-label="Curator PIN"
        />
        <button
          onClick={handleLogin}
          className="w-full border-none bg-gradient-to-r from-[#b79cff] to-[#ff8a65] text-white font-display font-extrabold text-[16px] py-3 rounded-[14px] cursor-pointer hover:opacity-90 transition-opacity active:translate-y-0.5"
        >
          Enter Ada Mode 🌙
        </button>
        {msg && <p className="text-[#ff8a65] font-bold text-[13px] text-center mt-2.5">{msg}</p>}
      </div>
    </div>
  )
}
