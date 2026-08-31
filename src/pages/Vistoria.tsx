import { useEffect } from 'react'

export default function Vistoria() {
  useEffect(() => {
    document.title = 'Vistoria · Fiscalização'
  }, [])

  return (
    <div className="animate-page-enter">
      {/* Page Title */}
      <h1 className="text-[22px] sm:text-[28px] font-bold text-[#14201A] tracking-[-0.2px] leading-tight mb-7">
        Vistoria
      </h1>
    </div>
  )
}
