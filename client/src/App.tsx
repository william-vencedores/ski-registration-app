import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Background from './components/layout/Background'
import Header from './components/layout/Header'
import Hero from './components/layout/Hero'
import Gallery from './components/layout/Gallery'
import Footer from './components/layout/Footer'
import EventSelector from './components/ui/EventSelector'
import RegistrationForm from './components/steps/RegistrationForm'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminEvents from './pages/AdminEvents'
import AdminUsers from './pages/AdminUsers'
import AdminDisclosures from './pages/AdminDisclosures'
import ProtectedRoute from './components/admin/ProtectedRoute'
import { useAppStore } from './lib/store'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'

function PublicSite() {
  const { selectedEvent, setSelectedEvent, resetForm } = useAppStore()

  const handleClose = () => {
    setSelectedEvent(null)
    resetForm()
  }

  // While the registration modal is open: lock background scroll and allow ESC to close.
  useEffect(() => {
    if (!selectedEvent) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent])

  return (
    <div className="relative min-h-screen">
      <Background />
      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <Gallery />
          <EventSelector />
        </main>
        <Footer />
      </div>

      {/* Registration opens as a centered modal so it can't be missed */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            key="reg-modal"
            className="fixed inset-0 z-[60] flex justify-center overflow-y-auto p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={handleClose}
            />
            <motion.div
              className="relative z-10 w-full max-w-2xl my-auto"
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <RegistrationForm onClose={handleClose} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/events" element={<ProtectedRoute><AdminEvents /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/disclosures" element={<ProtectedRoute><AdminDisclosures /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
