import { useTranslation } from '../../hooks/useTranslation'

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61587350440034'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="px-8 py-8 border-t border-white/10 flex flex-col items-center gap-4">
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${t.followUs} — Facebook`}
        className="flex items-center justify-center w-10 h-10 rounded-full
                   bg-white/8 text-white/60 ring-1 ring-white/10
                   hover:text-glacier hover:ring-glacier/40 transition-colors duration-200"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
          <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.49 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
      </a>
      <p className="text-[11px] text-white/35 tracking-wide text-center">
        © {year} Vencedores. {t.rights}
      </p>
    </footer>
  )
}
