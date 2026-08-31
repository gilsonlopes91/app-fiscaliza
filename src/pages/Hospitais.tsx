import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Building2,
  Plus,
  Search,
  SlidersHorizontal,
  MapPin,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HospitalCard } from '@/components/HospitalCard'
import { HospitalFormDialog } from '@/components/HospitalFormDialog'
import { HospitalDetailSheet } from '@/components/HospitalDetailSheet'
import { hospitaisService, Hospital, HospitalFormData } from '@/services/hospitais'
import { useToast } from '@/hooks/use-toast'

export default function Hospitais() {
  const { toast } = useToast()

  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('todos')

  // Modals & Sheets
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    document.title = 'Hospitais · Fiscalização'
  }, [])

  const loadHospitais = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await hospitaisService.getAll()
      setHospitais(data)
    } catch (err) {
      console.error('Erro ao carregar hospitais:', err)
      setError('Não foi possível carregar os hospitais. Verifique sua conexão e tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHospitais()
  }, [loadHospitais])

  // Extract unique sorted list of municípios
  const municipios = useMemo(() => {
    const set = new Set<string>()
    hospitais.forEach((h) => {
      if (h.municipio && h.municipio.trim()) {
        set.add(h.municipio.trim())
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [hospitais])

  // Real-time combined filtering (searchQuery matches nome, municipio or cnes + selectedMunicipio)
  const filteredHospitais = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const queryDigits = searchQuery.replace(/\D/g, '')

    return hospitais.filter((hospital) => {
      // Municipio filter
      if (selectedMunicipio !== 'todos') {
        if (hospital.municipio.toLowerCase() !== selectedMunicipio.toLowerCase()) {
          return false
        }
      }

      // Search query filter
      if (!query) return true

      const nomeMatch = hospital.nome?.toLowerCase().includes(query)
      const municipioMatch = hospital.municipio?.toLowerCase().includes(query)
      const cnesMatch =
        hospital.cnes?.toLowerCase().includes(query) ||
        (queryDigits.length > 0 && hospital.cnes?.includes(queryDigits))

      return nomeMatch || municipioMatch || cnesMatch
    })
  }, [hospitais, searchQuery, selectedMunicipio])

  // Handlers
  const handleCreateHospital = async (data: HospitalFormData) => {
    try {
      const created = await hospitaisService.create(data)
      setHospitais((prev) => [created, ...prev])
      toast({
        title: 'Hospital cadastrado com sucesso!',
        description: `${created.nome} foi adicionado à base de dados.`,
      })
    } catch (err) {
      console.error('Erro ao cadastrar hospital:', err)
      toast({
        title: 'Erro ao cadastrar hospital',
        description: 'Ocorreu uma falha ao salvar as informações no servidor.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleUpdateHospital = async (id: string, data: Partial<HospitalFormData>) => {
    try {
      const updated = await hospitaisService.update(id, data)
      setHospitais((prev) => prev.map((h) => (h.id === id ? updated : h)))
      setSelectedHospital(updated)
      toast({
        title: 'Hospital atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao atualizar hospital:', err)
      toast({
        title: 'Erro ao atualizar hospital',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleDeleteHospital = async (id: string) => {
    try {
      await hospitaisService.delete(id)
      setHospitais((prev) => prev.filter((h) => h.id !== id))
      setSelectedHospital(null)
      toast({
        title: 'Hospital excluído',
        description: 'O cadastro foi removido com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao excluir hospital:', err)
      toast({
        title: 'Erro ao excluir hospital',
        description: 'Não foi possível remover o hospital do banco de dados.',
        variant: 'destructive',
      })
      throw err
    }
  }

  const handleOpenDetail = (hospital: Hospital) => {
    setSelectedHospital(hospital)
    setIsDetailOpen(true)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedMunicipio('todos')
  }

  const hasActiveFilters = searchQuery !== '' || selectedMunicipio !== 'todos'
  const isGlobalEmpty = hospitais.length === 0 && !isLoading && !error

  return (
    <div className="animate-page-enter">
      {/* Top Header Row with Title and "+ Novo hospital" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-[#14201A] tracking-[-0.2px] leading-tight">
            Hospitais
          </h1>
          <p className="text-sm text-[#5C6B63] mt-0.5">
            Gerenciamento e cadastro das unidades hospitalares fiscalizadas
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#0B6E4F] hover:bg-[#095A41] text-white shadow-sm font-semibold h-10 px-4 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
          Novo hospital
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-[#5C6B63]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0B6E4F] mb-3" />
          <p className="text-sm font-medium">Carregando hospitais cadastrados...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-lg mx-auto my-8">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="font-bold text-[#14201A] mb-1">Erro ao carregar dados</h3>
          <p className="text-sm text-[#5C6B63] mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={loadHospitais}
            className="border-red-200 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* When no hospitals exist at all (Original Empty State) */}
      {isGlobalEmpty && (
        <div className="mt-8 flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl border border-[#DDE5DF]/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Soft Green Circle Icon */}
          <div
            className="w-24 h-24 rounded-full bg-[#E6F4EE] flex items-center justify-center text-[#0B6E4F] mb-5 shadow-sm"
            aria-hidden="true"
          >
            <Building2 className="w-10 h-10 stroke-[1.8]" />
          </div>

          {/* Empty State Message */}
          <p className="text-[17px] font-semibold text-[#14201A] max-w-sm mb-1">
            Nenhum hospital cadastrado ainda.
          </p>
          <p className="text-sm text-[#5C6B63] max-w-sm mb-6">
            Comece cadastrando a primeira unidade hospitalar para iniciar o processo de
            fiscalização.
          </p>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#0B6E4F] hover:bg-[#095A41] text-white shadow-sm font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Cadastrar primeiro hospital
          </Button>
        </div>
      )}

      {/* Content when hospitals exist */}
      {!isLoading && !error && hospitais.length > 0 && (
        <div className="space-y-6">
          {/* Search and Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DDE5DF] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#5C6B63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Buscar por nome, município ou CNES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 border-[#DDE5DF] focus-visible:ring-[#0B6E4F] bg-[#F4F7F4]/40 h-10 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6B63] hover:text-[#14201A]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Municipio Selector */}
            <div className="w-full sm:w-[240px]">
              <Select value={selectedMunicipio} onValueChange={setSelectedMunicipio}>
                <SelectTrigger className="border-[#DDE5DF] bg-[#F4F7F4]/40 focus:ring-[#0B6E4F] h-10 text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-4 h-4 text-[#0B6E4F] shrink-0" />
                    <SelectValue placeholder="Filtrar por município" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os municípios</SelectItem>
                  {municipios.map((mun) => (
                    <SelectItem key={mun} value={mun}>
                      {mun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters button if active */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-[#5C6B63] hover:text-[#0B6E4F] h-10 shrink-0 font-medium"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Results Counter */}
          <div className="flex items-center justify-between text-xs text-[#5C6B63] px-1">
            <span>
              Mostrando <strong>{filteredHospitais.length}</strong> de{' '}
              <strong>{hospitais.length}</strong>{' '}
              {hospitais.length === 1 ? 'hospital' : 'hospitais'}
            </span>
            {hasActiveFilters && (
              <span className="text-[#0B6E4F] font-medium">Filtro aplicado</span>
            )}
          </div>

          {/* No search results found */}
          {filteredHospitais.length === 0 && (
            <div className="bg-white rounded-xl border border-[#DDE5DF] p-10 text-center">
              <Search className="w-10 h-10 text-[#8E9D94] mx-auto mb-3 stroke-[1.5]" />
              <h3 className="text-base font-semibold text-[#14201A] mb-1">
                Nenhum hospital encontrado
              </h3>
              <p className="text-sm text-[#5C6B63] max-w-md mx-auto mb-4">
                Nenhum registro corresponde aos critérios de busca informados. Tente ajustar os
                termos ou limpar os filtros.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="border-[#DDE5DF] text-[#0B6E4F] hover:bg-[#E6F4EE]"
              >
                Limpar busca e filtros
              </Button>
            </div>
          )}

          {/* Grid of Hospital Cards */}
          {filteredHospitais.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredHospitais.map((hospital) => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  onClick={() => handleOpenDetail(hospital)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Dialog: Create Hospital */}
      <HospitalFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSave={handleCreateHospital}
      />

      {/* Detail / Edit Sheet: Hospital File */}
      <HospitalDetailSheet
        hospital={selectedHospital}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={handleUpdateHospital}
        onDelete={handleDeleteHospital}
      />
    </div>
  )
}
