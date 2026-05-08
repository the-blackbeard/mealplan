import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import HouseholdSetup from './pages/HouseholdSetup'
import PlannerPage from './pages/PlannerPage'
import HistoryPage from './pages/HistoryPage'
import MealsPage from './pages/MealsPage'
import MealDetailPage from './pages/MealDetailPage'
import SettingsPage from './pages/SettingsPage'
import Navbar from './components/Navbar'

function AppRoutes() {
  const { user, profile, household, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--cream)', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '36px', height: '36px', border: '3px solid var(--cream-mid)',
          borderTopColor: 'var(--brown)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: 'var(--slate-light)', fontSize: '0.9rem' }}>Loading TableWeek…</p>
      </div>
    )
  }

  if (!user) return <AuthPage />

  if (!household) return <HouseholdSetup />

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<PlannerPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/meals/:id" element={<MealDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
