"use client"
import { useEffect, useState } from "react"
import { ShaderAnimation } from "./shader-animation"

interface IntroScreenProps {
  onDone: () => void
}

export function IntroScreen({ onDone }: IntroScreenProps) {
  // 0 = fully visible, 1 = fading to black, 2 = black (done)
  const [phase, setPhase] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    // Start fade-out after 3.2s so it completes at ~4s total
    const fadeTimer = setTimeout(() => setPhase(1), 3200)
    // Call onDone once the black screen is fully in place
    const doneTimer = setTimeout(() => {
      setPhase(2)
      onDone()
    }, 4200)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[9999]" style={{ background: "#000" }}>
      {/* Google Fonts — Playfair Display */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');`}</style>

      {/* Shader — fades out */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          opacity: phase === 0 ? 1 : 0,
          transitionDuration: "1000ms",
          transitionTimingFunction: "ease-in-out",
        }}
      >
        <ShaderAnimation />
      </div>

      {/* "Velona" text — fades out with the shader */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity"
        style={{
          opacity: phase === 0 ? 1 : 0,
          transitionDuration: "1000ms",
          transitionTimingFunction: "ease-in-out",
        }}
      >
        <span
          style={{
            fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
            fontSize: "clamp(3rem, 10vw, 6rem)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#ffffff",
            textShadow: "0 0 60px rgba(255,255,255,0.25)",
            userSelect: "none",
          }}
        >
          Velona
        </span>
      </div>
    </div>
  )
}
