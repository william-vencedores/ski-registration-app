import { useTranslation } from '../../hooks/useTranslation'
import imgGroupSki from '../../assets/horizontal-group-ski.png'
import imgClase from '../../assets/clase-de-ski.jpg'
import imgFogata from '../../assets/fogata.jpg'
import imgGrupal from '../../assets/foto-grupal.jpg'
import imgSaludo from '../../assets/saludo.jpg'
import imgMontana from '../../assets/en-la-montana.jpg'

const photos = [
  { src: imgGroupSki, alt: 'Group skiing', span: true },
  { src: imgClase, alt: 'Ski class' },
  { src: imgMontana, alt: 'On the mountain' },
  { src: imgFogata, alt: 'Bonfire' },
  { src: imgGrupal, alt: 'Group photo' },
  { src: imgSaludo, alt: 'Greeting' },
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
          gridTemplateRows: '150px 150px 150px',
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={i}
            className="relative overflow-hidden bg-alpine cursor-pointer group"
            style={i === 0 ? { gridRow: 'span 3' } : {}}
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
    </div>
  )
}
