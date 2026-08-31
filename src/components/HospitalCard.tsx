import { Building2, MapPin, Hash, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Hospital } from '@/services/hospitais'

interface HospitalCardProps {
  hospital: Hospital
  onClick: () => void
}

export function HospitalCard({ hospital, onClick }: HospitalCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="group relative bg-white border border-[#D3DFE9] hover:border-[#004B8D] rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,75,141,0.12)] transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004B8D] focus-visible:ring-offset-2"
    >
      <div>
        {/* Top Header inside card */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8F1F8] group-hover:bg-[#004B8D] flex items-center justify-center text-[#004B8D] group-hover:text-white transition-colors duration-200 shrink-0 shadow-xs">
            <Building2 className="w-5 h-5 stroke-[2]" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hospital.tipo && (
              <Badge
                variant="outline"
                className="bg-[#F4F6F9] text-[#486581] border-[#D3DFE9] text-[11px] font-semibold px-2 py-0.5"
              >
                {hospital.tipo}
              </Badge>
            )}
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[#627D98] group-hover:text-[#004B8D] group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Hospital Name */}
        <h3 className="text-[17px] font-bold text-[#102A43] group-hover:text-[#004B8D] transition-colors leading-snug line-clamp-2 mb-3">
          {hospital.nome}
        </h3>
      </div>

      {/* Hospital Meta: Município and CNES */}
      <div className="pt-3 border-t border-[#D3DFE9]/80 flex flex-wrap items-center justify-between gap-2 text-xs text-[#486581]">
        <div className="flex items-center gap-1.5 font-medium text-[#102A43]">
          <MapPin className="w-3.5 h-3.5 text-[#004B8D] shrink-0" />
          <span className="truncate max-w-[150px] sm:max-w-[180px]">{hospital.municipio}</span>
        </div>

        <div className="flex items-center gap-1 font-mono font-semibold text-[#334E68] bg-[#F4F6F9] px-2 py-0.5 rounded border border-[#D3DFE9]">
          <Hash className="w-3 h-3 text-[#E5A812]" />
          <span>CNES: {hospital.cnes}</span>
        </div>
      </div>
    </div>
  )
}
