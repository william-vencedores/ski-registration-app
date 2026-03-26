import { useTranslation } from '../../hooks/useTranslation'

const photos = [
  { src: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=700&q=80', alt: 'Skiing', span: true },
  { src: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&q=80', alt: 'Group' },
  { src: 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=400&q=80', alt: 'Mountain' },
  { src: 'https://images.unsplash.com/photo-1547975521-6f8e5c70e7d3?w=400&q=80', alt: 'Resort' },
  { src: 'https://images.unsplash.com/photo-1578762560042-46ad127c95ea?w=400&q=80', alt: 'Snow' },
]

export default function Gallery() {
  const { t } = useTranslation()

  return (
    <div className="px-8 pb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
      <div
        className="grid gap-2 max-w-4xl mx-auto rounded-2xl overflow-hidden
                   shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]"
        style={{
          gridTemplateColumns: '2fr 1fr 1fr',
          gridTemplateRows: '185px 185px',
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={i}
            className="relative overflow-hidden bg-alpine cursor-pointer group"
            style={i === 0 ? { gridRow: 'span 2' } : {}}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const placeholder = target.nextElementSibling as HTMLElement
                if (placeholder) placeholder.style.display = 'flex'
              }}
            />
            <div className="hidden absolute inset-0 flex-col items-center justify-center gap-2
                            bg-gradient-to-br from-pine/50 to-alpine/80">
              <span className="text-3xl">🏔️</span>
              <p className="text-[11px] text-white/30 tracking-widest">VENCEDORES</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-midnight/70 to-transparent
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>
      <p className="text-center mt-2.5 text-xs text-white/30 italic">{t.galleryNote}</p>
    </div>
  )
}
