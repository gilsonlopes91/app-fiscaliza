import { useEffect } from 'react'
import { Building2 } from 'lucide-react'

export default function Hospitais() {
  useEffect(() => {
    document.title = 'Hospitais · Fiscalização'
  }, [])

  return (
    <div className="animate-page-enter">
      {/* Page Title */}
      <h1 className="text-[22px] sm:text-[28px] font-bold text-[#14201A] tracking-[-0.2px] leading-tight mb-7">
        Hospitais
      </h1>

      {/* Empty State */}
      <div className="mt-12 flex flex-col items-center justify-center text-center py-12 px-4">
        {/* Soft Green Circle Icon */}
        <div
          className="w-24 h-24 rounded-full bg-[#E6F4EE] flex items-center justify-center text-[#0B6E4F] mb-4 shadow-sm"
          aria-hidden="true"
        >
          <Building2 className="w-10 h-10 stroke-[1.8]" />
        </div>

        {/* Empty State Message */}
        <p className="text-[16px] font-medium text-[#5C6B63] max-w-sm">
          Nenhum hospital cadastrado ainda.
        </p>
      </div>
    </div>
  )
}
