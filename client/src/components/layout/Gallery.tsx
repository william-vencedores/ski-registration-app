import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import imgGroupSki from '../../assets/horizontal-group-ski.png'
import imgClase from '../../assets/clase-de-ski.jpg'
import imgFogata from '../../assets/fogata.jpg'
import imgGrupal from '../../assets/foto-grupal.jpg'
import imgSaludo from '../../assets/saludo.jpg'
import imgMontana from '../../assets/en-la-montana.jpg'

const photos = [
  { src: imgGroupSki, alt: 'Group skiing' },
  { src: imgClase, alt: 'Ski class' },
  { src: imgMontana, alt: 'On the mountain' },
  { src: imgFogata, alt: 'Bonfire' },
  { src: imgGrupal, alt: 'Group photo' },
  { src: imgSaludo, alt: 'Greeting' },
]

const AUTOPLAY_MS = 5000

export default function Gallery() {
  // index of the current slide and the direction of the last move (for animation)
  const [[index, dir], setSlide] = useState<[number, number]>([0, 0])
  const [paused, setPaused] = useState(false)

  const go = useCallback((step: number) => {
    setSlide(([current]) => [(current + step + photos.length) % photos.length, step])
  }, [])

  const goTo = (target: number) => {
    setSlide(([current]) => [target, target > current ? 1 : -1])
  }

  // Auto-advance unless the user is hovering/interacting.
  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => go(1), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [paused, go, index])

  return (
    <div className="px-8 pb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
      <div
        className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden h-[300px] sm:h-[460px]
                   bg-alpine select-none
                   shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.img
            key={index}
            src={photos[index].src}
            alt={photos[index].alt}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              const placeholder = target.nextElementSibling as HTMLElement
              if (placeholder) placeholder.style.display = 'flex'
            }}
          />
        </AnimatePresence>

        {/* Fallback shown if the current image fails to load */}
        <div className="hidden absolute inset-0 flex-col items-center justify-center gap-2
                        bg-gradient-to-br from-pine/50 to-alpine/80">
          <span className="text-3xl">🏔️</span>
          <p className="text-[11px] text-white/30 tracking-widest">VENCEDORES</p>
        </div>

        {/* Bottom gradient for control legibility */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-midnight/70 to-transparent pointer-events-none" />

        {/* Prev / next arrows */}
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => go(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                     flex items-center justify-center bg-black/30 text-white text-lg
                     backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => go(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
                     flex items-center justify-center bg-black/30 text-white text-lg
                     backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          ›
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
          {photos.map((photo, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to photo ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300
                ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
