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
      className="group relative bg-white border border-[#DDE5DF] hover:border-[#0B6E4F]/60 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_16px_rgba(11,110,79,0.08)] transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E4F] focus-visible:ring-offset-2"
    >
      <div>
        {/* Top Header inside card */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#E6F4EE] group-hover:bg-[#0B6E4F] flex items-center justify-center text-[#0B6E4F] group-hover:text-white transition-colors duration-200 shrink-0">
            <Building2 className="w-5 h-5 stroke-[1.9]" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hospital.tipo && (
              <Badge
                variant="outline"
                className="bg-[#F4F7F4] text-[#5C6B63] border-[#DDE5DF] text-[11px] font-medium px-2 py-0.5"
              >
                {hospital.tipo}
              </Badge>
            )}
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[#5C6B63] group-hover:text-[#0B6E4F] group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Hospital Name */}
        <h3 className="text-[17px] font-bold text-[#14201A] group-hover:text-[#0B6E4F] transition-colors leading-snug line-clamp-2 mb-3">
          {hospital.nome}
        </h3>
      </div>

      {/* Hospital Meta: Município and CNES */}
      <div className="pt-3 border-t border-[#DDE5DF]/80 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C6B63]">
        <div className="flex items-center gap-1.5 font-medium text-[#14201A]">
          <MapPin className="w-3.5 h-3.5 text-[#0B6E4F] shrink-0" />
          <span className="truncate max-w-[150px] sm:max-w-[180px]">{hospital.municipio}</span>
        </div>

        <div className="flex items-center gap-1 font-mono font-medium text-[#5C6B63] bg-[#F4F7F4] px-2 py-0.5 rounded border border-[#DDE5DF]">
          <Hash className="w-3 h-3 text-[#0B6E4F]" />
          <span>CNES: {hospital.cnes}</span>
        </div>
      </div>
    </div>
  )
}
