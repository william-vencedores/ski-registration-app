import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Background from './components/layout/Background'
import Header from './components/layout/Header'
import Hero from './components/layout/Hero'
import Gallery from './components/layout/Gallery'
import EventSelector from './components/ui/EventSelector'
import RegistrationForm from './components/steps/RegistrationForm'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/admin/ProtectedRoute'
import { useAppStore } from './lib/store'
import { AnimatePresence, motion } from 'framer-motion'

function PublicSite() {
  const { selectedEvent } = useAppStore()
  return (
    <div className="relative min-h-screen">
      <Background />
      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <Gallery />
          <EventSelector />
          <AnimatePresence>
            {selectedEvent && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <RegistrationForm />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
