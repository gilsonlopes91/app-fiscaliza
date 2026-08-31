/* 404 Page - Displays when a user attempts to access a non-existent route - translate to the language of the user */
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  useEffect(() => {
    document.title = 'Página não encontrada · Fiscalização'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7F4] text-[#14201A] px-4 font-sans">
      <div className="text-center max-w-md bg-white p-8 rounded-xl border border-[#DDE5DF] shadow-sm">
        <h1 className="text-5xl font-bold text-[#0B6E4F] mb-3">404</h1>
        <p className="text-lg text-[#5C6B63] mb-6">Página não encontrada</p>
        <a
          href="/hospitais"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#0B6E4F] hover:bg-[#095A41] text-white font-semibold text-sm transition-colors"
        >
          Ir para Hospitais
        </a>
      </div>
    </div>
  )
}

export default NotFound
