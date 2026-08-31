/* 404 Page - Displays when a user attempts to access a non-existent route - translate to the language of the user */
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  useEffect(() => {
    document.title = 'Página não encontrada · CREA-PI Fiscalização'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] text-[#102A43] px-4 font-sans">
      <div className="text-center max-w-md bg-white p-8 rounded-xl border border-[#D3DFE9] shadow-sm">
        <h1 className="text-5xl font-bold text-[#004B8D] mb-3">404</h1>
        <p className="text-lg text-[#486581] mb-6">Página não encontrada</p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#004B8D] hover:bg-[#003666] rounded-lg transition-colors shadow-sm"
        >
          Voltar para o início
        </a>
      </div>
    </div>
  )
}

export default NotFound
