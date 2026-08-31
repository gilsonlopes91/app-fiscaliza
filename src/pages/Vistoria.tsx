import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  UserCheck,
  FileCheck2,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Save,
  Check,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { hospitaisService, Hospital } from '@/services/hospitais'
import { categoriasVistoriaService, CategoriaVistoria } from '@/services/categoriasVistoria'
import {
  vistoriasService,
  Vistoria,
  VistoriaItem,
  VistoriaItemFormData,
  SituacaoChecklist,
  calculateItemSituacao,
} from '@/services/vistorias'

interface CategoryFormState extends VistoriaItemFormData {
  itemId?: string
  isDirty?: boolean
  isSaving?: boolean
}

export default function VistoriaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Master Data
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [categorias, setCategorias] = useState<CategoriaVistoria[]>([])
  const [vistorias, setVistorias] = useState<Vistoria[]>([])

  // Selection state
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('')
  const [activeVistoria, setActiveVistoria] = useState<Vistoria | null>(null)

  // Checklist form data state mapped by categoriaId
  const [itemsMap, setItemsMap] = useState<Record<string, CategoryFormState>>({})

  // Loading and error states
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isLoadingVistoria, setIsLoadingVistoria] = useState(false)
  const [openAccordionValues, setOpenAccordionValues] = useState<string[]>([])
  const [filterSituacao, setFilterSituacao] = useState<string>('todos')

  useEffect(() => {
    document.title = 'Vistoria · CREA-PI Fiscalização'
  }, [])

  // 1. Initial Load of Hospitais, Categorias, and existing Vistorias
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoadingInitial(true)
      const [hospList, catList, vistList] = await Promise.all([
        hospitaisService.getAll(),
        categoriasVistoriaService.getAll(),
        vistoriasService.getAll(),
      ])

      setHospitais(hospList)
      setCategorias(catList)
      setVistorias(vistList)

      // Determine initial selection
      const paramHospitalId = searchParams.get('hospitalId')
      const paramVistoriaId = searchParams.get('vistoriaId')

      let targetHospitalId = ''

      if (paramHospitalId && hospList.some((h) => h.id === paramHospitalId)) {
        targetHospitalId = paramHospitalId
      } else if (paramVistoriaId) {
        const foundVistoria = vistList.find((v) => v.id === paramVistoriaId)
        if (foundVistoria) {
          targetHospitalId = foundVistoria.hospital
        }
      }

      // If no valid param but we have vistorias or hospitais, select the first vistoria's hospital
      if (!targetHospitalId && vistList.length > 0) {
        targetHospitalId = vistList[0].hospital
      } else if (!targetHospitalId && hospList.length > 0) {
        targetHospitalId = hospList[0].id
      }

      if (targetHospitalId) {
        setSelectedHospitalId(targetHospitalId)
      }
    } catch (err) {
      console.error('Erro ao carregar dados iniciais de vistoria:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações do sistema.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingInitial(false)
    }
  }, [searchParams, toast])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // 2. When selectedHospitalId changes, fetch or create its vistoria and load items
  const loadVistoriaForHospital = useCallback(
    async (hospitalId: string) => {
      if (!hospitalId) {
        setActiveVistoria(null)
        setItemsMap({})
        return
      }

      try {
        setIsLoadingVistoria(true)
        const vistoria = await vistoriasService.getOrCreateForHospital(hospitalId)
        setActiveVistoria(vistoria)

        // Update URL query param quietly without page reload
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('hospitalId', hospitalId)
            next.set('vistoriaId', vistoria.id)
            return next
          },
          { replace: true },
        )

        // Load items for this vistoria
        const items = await vistoriasService.getItensByVistoria(vistoria.id)

        // Build items map from categories and existing records
        const newMap: Record<string, CategoryFormState> = {}
        categorias.forEach((cat) => {
          const existingItem = items.find((it) => it.categoria === cat.id)
          if (existingItem) {
            newMap[cat.id] = {
              itemId: existingItem.id,
              possuiSistema: existingItem.possuiSistema || null,
              prestadorServico: existingItem.prestadorServico || '',
              numeroArt: existingItem.numeroArt || '',
              comprovanteEntregue: existingItem.comprovanteEntregue || null,
              dataUltimaVerificacao: existingItem.dataUltimaVerificacao
                ? existingItem.dataUltimaVerificacao.substring(0, 10)
                : '',
              isDirty: false,
              isSaving: false,
            }
          } else {
            newMap[cat.id] = {
              possuiSistema: null,
              prestadorServico: '',
              numeroArt: '',
              comprovanteEntregue: null,
              dataUltimaVerificacao: '',
              isDirty: false,
              isSaving: false,
            }
          }
        })
        setItemsMap(newMap)

        // Refresh vistorias list so the selector stays updated
        const updatedVistorias = await vistoriasService.getAll()
        setVistorias(updatedVistorias)
      } catch (err) {
        console.error('Erro ao carregar vistoria do hospital:', err)
        toast({
          title: 'Erro ao carregar vistoria',
          description: 'Não foi possível carregar os itens desta vistoria.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingVistoria(false)
      }
    },
    [categorias, setSearchParams, toast],
  )

  useEffect(() => {
    if (selectedHospitalId && categorias.length > 0) {
      loadVistoriaForHospital(selectedHospitalId)
    }
  }, [selectedHospitalId, categorias.length, loadVistoriaForHospital])

  // Active hospital object
  const activeHospital = useMemo(() => {
    return hospitais.find((h) => h.id === selectedHospitalId) || null
  }, [hospitais, selectedHospitalId])

  // Calculation of summary counts
  const checklistSummary = useMemo(() => {
    let total = categorias.length
    let naoSeAplica = 0
    let pendente = 0
    let vencido = 0
    let conforme = 0
    let naoRespondido = 0

    categorias.forEach((cat) => {
      const itemData = itemsMap[cat.id] || {}
      const situacao = calculateItemSituacao(itemData, cat)

      if (situacao === 'não se aplica') naoSeAplica++
      else if (situacao === 'pendente') pendente++
      else if (situacao === 'vencido') vencido++
      else if (situacao === 'conforme') conforme++
      else naoRespondido++
    })

    const totalAtencao = pendente + vencido

    return {
      total,
      naoSeAplica,
      pendente,
      vencido,
      conforme,
      naoRespondido,
      totalAtencao,
    }
  }, [categorias, itemsMap])

  // Handle field changes and automatically persist or mark dirty
  const handleFieldChange = useCallback(
    (categoriaId: string, updates: Partial<CategoryFormState>) => {
      setItemsMap((prev) => {
        const current = prev[categoriaId] || {
          possuiSistema: null,
          prestadorServico: '',
          numeroArt: '',
          comprovanteEntregue: null,
          dataUltimaVerificacao: '',
        }
        return {
          ...prev,
          [categoriaId]: {
            ...current,
            ...updates,
            isDirty: true,
          },
        }
      })
    },
    [],
  )

  // Save a single category item to backend
  const handleSaveCategoryItem = async (categoria: CategoriaVistoria) => {
    if (!activeVistoria || !selectedHospitalId) return

    const itemState = itemsMap[categoria.id]
    if (!itemState) return

    try {
      setItemsMap((prev) => ({
        ...prev,
        [categoria.id]: {
          ...prev[categoria.id],
          isSaving: true,
        },
      }))

      const saved = await vistoriasService.saveItem(
        activeVistoria.id,
        selectedHospitalId,
        categoria.id,
        {
          possuiSistema: itemState.possuiSistema,
          prestadorServico: itemState.prestadorServico,
          numeroArt: itemState.numeroArt,
          comprovanteEntregue: itemState.comprovanteEntregue,
          dataUltimaVerificacao: itemState.dataUltimaVerificacao || null,
        },
        categoria,
        itemState.itemId,
      )

      setItemsMap((prev) => ({
        ...prev,
        [categoria.id]: {
          ...prev[categoria.id],
          itemId: saved.id,
          isDirty: false,
          isSaving: false,
        },
      }))

      toast({
        title: 'Item salvo!',
        description: `As informações de "${categoria.nome}" foram salvas.`,
      })
    } catch (err) {
      console.error('Erro ao salvar item de vistoria:', err)
      setItemsMap((prev) => ({
        ...prev,
        [categoria.id]: {
          ...prev[categoria.id],
          isSaving: false,
        },
      }))
      toast({
        title: 'Erro ao salvar item',
        description: 'Não foi possível persistir as respostas no servidor.',
        variant: 'destructive',
      })
    }
  }

  // Quick switch of hospital in the top bar
  const handleSelectHospital = (hospitalId: string) => {
    setSelectedHospitalId(hospitalId)
  }

  // Helper badge component for item situation (CREA-PI official palette: Green Conforme, Red Pendente/Vencido, Gray Não se aplica)
  const renderSituacaoBadge = (situacao: SituacaoChecklist, size: 'sm' | 'default' = 'default') => {
    const isSm = size === 'sm'
    switch (situacao) {
      case 'conforme':
        return (
          <Badge
            className={`bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-300 font-bold ${isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} gap-1 shrink-0 shadow-xs`}
          >
            <CheckCircle2
              className={isSm ? 'w-3 h-3 text-emerald-600' : 'w-3.5 h-3.5 text-emerald-600'}
            />
            Conforme
          </Badge>
        )
      case 'pendente':
        return (
          <Badge
            className={`bg-rose-50 text-rose-800 hover:bg-rose-50 border border-rose-300 font-bold ${isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} gap-1 shrink-0 shadow-xs`}
          >
            <AlertTriangle
              className={isSm ? 'w-3 h-3 text-rose-600' : 'w-3.5 h-3.5 text-rose-600'}
            />
            Pendente
          </Badge>
        )
      case 'vencido':
        return (
          <Badge
            className={`bg-rose-50 text-rose-800 hover:bg-rose-50 border border-rose-300 font-bold ${isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} gap-1 shrink-0 shadow-xs`}
          >
            <Clock className={isSm ? 'w-3 h-3 text-rose-600' : 'w-3.5 h-3.5 text-rose-600'} />
            Vencido
          </Badge>
        )
      case 'não se aplica':
        return (
          <Badge
            className={`bg-[#F4F6F9] text-[#486581] hover:bg-[#F4F6F9] border border-[#D3DFE9] font-medium ${isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} gap-1 shrink-0`}
          >
            <XCircle className={isSm ? 'w-3 h-3 text-[#829AB1]' : 'w-3.5 h-3.5 text-[#829AB1]'} />
            Não se aplica
          </Badge>
        )
      default:
        return (
          <Badge
            className={`bg-[#F4F6F9] text-[#829AB1] hover:bg-[#F4F6F9] border border-[#D3DFE9] font-medium ${isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} gap-1 shrink-0`}
          >
            <HelpCircle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            Não avaliado
          </Badge>
        )
    }
  }

  // Filter categories if user selects a tab filter
  const filteredCategorias = useMemo(() => {
    if (filterSituacao === 'todos') return categorias
    return categorias.filter((cat) => {
      const itemData = itemsMap[cat.id] || {}
      const situacao = calculateItemSituacao(itemData, cat)
      if (filterSituacao === 'atencao') {
        return situacao === 'pendente' || situacao === 'vencido'
      }
      if (filterSituacao === 'pendente') return situacao === 'pendente'
      if (filterSituacao === 'vencido') return situacao === 'vencido'
      if (filterSituacao === 'conforme') return situacao === 'conforme'
      if (filterSituacao === 'nao_se_aplica') return situacao === 'não se aplica'
      if (filterSituacao === 'nao_avaliado') return situacao === null
      return true
    })
  }, [categorias, itemsMap, filterSituacao])

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#486581] animate-page-enter">
        <RefreshCw className="w-8 h-8 animate-spin text-[#004B8D] mb-3" />
        <p className="text-sm font-medium">Carregando checklist de vistoria CREA-PI...</p>
      </div>
    )
  }

  // If no hospitals exist at all, invite user to create one
  if (hospitais.length === 0) {
    return (
      <div className="animate-page-enter">
        <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight mb-2">
          Vistoria Técnica
        </h1>
        <p className="text-sm text-[#486581] mb-8">
          Checklist técnico de engenharia, instalações hospitalares e conformidade de ARTs.
        </p>

        <div className="mt-4 flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl border border-[#D3DFE9] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="w-20 h-20 rounded-full bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] mb-4 shadow-xs">
            <Building2 className="w-9 h-9 stroke-[1.8]" />
          </div>
          <p className="text-lg font-bold text-[#102A43] max-w-sm mb-1">
            Nenhum hospital cadastrado
          </p>
          <p className="text-sm text-[#486581] max-w-sm mb-6">
            Para iniciar uma vistoria técnica, você precisa primeiro cadastrar ou importar um
            hospital.
          </p>
          <Button
            onClick={() => navigate('/hospitais')}
            className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold"
          >
            Ir para cadastro de Hospitais
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-page-enter space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-[#102A43] tracking-tight leading-tight">
            Vistoria Técnica CREA-PI
          </h1>
          <p className="text-sm text-[#486581] mt-0.5">
            Checklist de verificação, ARTs e conformidade das instalações hospitalares
          </p>
        </div>

        {/* Hospital Selector Dropdown (when multiple exist or switching) */}
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 bg-white p-2 sm:px-3 sm:py-2 rounded-xl border border-[#D3DFE9] shadow-sm">
            <span className="text-xs font-semibold text-[#486581] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#004B8D]" />
              Hospital selecionado:
            </span>
            <Select value={selectedHospitalId} onValueChange={handleSelectHospital}>
              <SelectTrigger className="w-full sm:w-[260px] h-9 border-[#D3DFE9] font-semibold text-xs sm:text-sm text-[#102A43] focus:ring-[#004B8D]">
                <SelectValue placeholder="Selecione um hospital" />
              </SelectTrigger>
              <SelectContent>
                {hospitais.map((h) => {
                  const hasVistoria = vistorias.some((v) => v.hospital === h.id)
                  return (
                    <SelectItem key={h.id} value={h.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{h.nome}</span>
                        {hasVistoria && (
                          <span className="text-[10px] text-[#004B8D] bg-[#E8F1F8] px-1.5 py-0.5 rounded font-semibold shrink-0">
                            Em andamento
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Active Hospital Summary Banner */}
      {activeHospital && (
        <div className="bg-white rounded-2xl border border-[#D3DFE9] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8F1F8] text-[#004B8D] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <ClipboardCheck className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[#102A43] leading-tight">
                    {activeHospital.nome}
                  </h2>
                  {activeHospital.tipo && (
                    <Badge className="bg-[#E8F1F8] text-[#004B8D] hover:bg-[#E8F1F8] border-0 text-xs font-semibold">
                      {activeHospital.tipo}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-[#486581] flex flex-wrap items-center gap-3">
                  <span>
                    Município:{' '}
                    <strong className="text-[#102A43]">{activeHospital.municipio}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    CNES:{' '}
                    <strong className="font-mono text-[#004B8D] font-bold">
                      {activeHospital.cnes}
                    </strong>
                  </span>
                  {activeHospital.responsavel && (
                    <>
                      <span>•</span>
                      <span>
                        Resp.:{' '}
                        <strong className="text-[#102A43]">{activeHospital.responsavel}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Total Pending / Expired Highlight Box */}
            <div className="flex flex-wrap items-center gap-3 bg-[#F4F6F9] p-3.5 sm:px-4 sm:py-3 rounded-xl border border-[#D3DFE9]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shadow-sm ${
                    checklistSummary.totalAtencao > 0
                      ? 'bg-[#E5A812] text-[#102A43]'
                      : 'bg-[#004B8D] text-white'
                  }`}
                >
                  {checklistSummary.totalAtencao}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#102A43]">
                    {checklistSummary.totalAtencao === 0
                      ? 'Nenhuma não conformidade'
                      : checklistSummary.totalAtencao === 1
                        ? '1 item pendente / vencido'
                        : `${checklistSummary.totalAtencao} itens pendentes ou vencidos`}
                  </div>
                  <div className="text-[11px] text-[#486581]">
                    {checklistSummary.pendente} pendentes • {checklistSummary.vencido} vencidos •{' '}
                    {checklistSummary.conforme} conformes
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="mt-5 pt-4 border-t border-[#D3DFE9] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={filterSituacao === 'todos' ? 'default' : 'outline'}
                onClick={() => setFilterSituacao('todos')}
                className={`text-xs h-8 px-3 font-semibold ${
                  filterSituacao === 'todos'
                    ? 'bg-[#004B8D] hover:bg-[#003666] text-white'
                    : 'border-[#D3DFE9] text-[#486581] hover:text-[#102A43]'
                }`}
              >
                Todos ({checklistSummary.total})
              </Button>

              <Button
                size="sm"
                variant={filterSituacao === 'atencao' ? 'default' : 'outline'}
                onClick={() => setFilterSituacao('atencao')}
                className={`text-xs h-8 px-3 font-semibold ${
                  filterSituacao === 'atencao'
                    ? 'bg-[#E5A812] hover:bg-[#C88F06] text-[#102A43] font-bold'
                    : 'border-amber-300 text-[#8C6200] hover:bg-amber-50'
                }`}
              >
                Pendentes / Vencidos ({checklistSummary.totalAtencao})
              </Button>

              <Button
                size="sm"
                variant={filterSituacao === 'conforme' ? 'default' : 'outline'}
                onClick={() => setFilterSituacao('conforme')}
                className={`text-xs h-8 px-3 font-semibold ${
                  filterSituacao === 'conforme'
                    ? 'bg-[#004B8D] hover:bg-[#003666] text-white'
                    : 'border-[#D3DFE9] text-[#004B8D] hover:bg-[#E8F1F8]'
                }`}
              >
                Conformes ({checklistSummary.conforme})
              </Button>

              <Button
                size="sm"
                variant={filterSituacao === 'nao_se_aplica' ? 'default' : 'outline'}
                onClick={() => setFilterSituacao('nao_se_aplica')}
                className={`text-xs h-8 px-3 font-semibold ${
                  filterSituacao === 'nao_se_aplica'
                    ? 'bg-[#486581] hover:bg-[#334E68] text-white'
                    : 'border-[#D3DFE9] text-[#486581] hover:bg-[#F4F6F9]'
                }`}
              >
                Não se aplica ({checklistSummary.naoSeAplica})
              </Button>
            </div>

            <div className="text-xs text-[#486581] flex items-center gap-1 font-medium">
              <span>{checklistSummary.naoRespondido} itens não avaliados</span>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Categorias Accordion */}
      {isLoadingVistoria ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#486581] bg-white rounded-2xl border border-[#D3DFE9]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#004B8D] mb-3" />
          <p className="text-sm font-medium">Carregando checklist de vistoria...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-[#102A43] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#004B8D]" />
              Categorias Técnicas de Engenharia
            </h3>
            <span className="text-xs text-[#486581]">
              Exibindo {filteredCategorias.length} de {categorias.length} itens
            </span>
          </div>

          {filteredCategorias.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#D3DFE9] p-8 text-center">
              <Search className="w-8 h-8 text-[#829AB1] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#102A43]">
                Nenhum item com a situação selecionada
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterSituacao('todos')}
                className="mt-3 text-xs border-[#D3DFE9] text-[#004B8D]"
              >
                Ver todos os itens
              </Button>
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={openAccordionValues}
              onValueChange={setOpenAccordionValues}
              className="space-y-3"
            >
              {filteredCategorias.map((categoria) => {
                const itemState = itemsMap[categoria.id] || {
                  possuiSistema: null,
                  prestadorServico: '',
                  numeroArt: '',
                  comprovanteEntregue: null,
                  dataUltimaVerificacao: '',
                  isDirty: false,
                  isSaving: false,
                }

                const situacao = calculateItemSituacao(itemState, categoria)
                const isPossuiSim = itemState.possuiSistema === 'Sim'

                return (
                  <AccordionItem
                    key={categoria.id}
                    value={categoria.id}
                    className="border border-[#D3DFE9] bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all overflow-hidden"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-1 pr-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[15px] sm:text-base text-[#102A43]">
                              {categoria.nome}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#486581]">
                            {categoria.exigeArt ? (
                              <span className="text-[#004B8D] font-bold bg-[#E8F1F8] px-2 py-0.5 rounded text-[11px]">
                                Exige ART
                              </span>
                            ) : (
                              <span className="text-[#486581] bg-[#F4F6F9] px-2 py-0.5 rounded text-[11px]">
                                ART não exigida
                              </span>
                            )}

                            {categoria.periodicidadeDias && categoria.periodicidadeDias > 0 ? (
                              <span className="flex items-center gap-1 text-[#486581] bg-[#F4F6F9] px-2 py-0.5 rounded text-[11px]">
                                <Calendar className="w-3 h-3 text-[#004B8D]" />
                                Periodicidade: {categoria.periodicidadeDias} dias
                              </span>
                            ) : (
                              <span className="text-[#829AB1] bg-[#F4F6F9] px-2 py-0.5 rounded text-[11px]">
                                Sem periodicidade fixa
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Label on the Right of Trigger */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {renderSituacaoBadge(situacao)}
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-0 pb-0 border-t border-[#D3DFE9]/80">
                      <div className="p-5 sm:p-6 space-y-6 bg-slate-50/50">
                        {/* 1. Pergunta Principal / Header: Possui o sistema/serviço? */}
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#D3DFE9] shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <Label className="text-sm font-bold text-[#102A43] block">
                                O hospital possui este sistema / serviço?{' '}
                                <span className="text-rose-600">*</span>
                              </Label>
                              <p className="text-xs text-[#486581] mt-0.5">
                                Selecione &quot;Sim&quot; para detalhar prestador, ART e
                                comprovantes, ou &quot;Não&quot; para registrar como Não se aplica.
                              </p>
                            </div>

                            <RadioGroup
                              value={itemState.possuiSistema || ''}
                              onValueChange={(val) =>
                                handleFieldChange(categoria.id, {
                                  possuiSistema: val as 'Sim' | 'Não',
                                })
                              }
                              className="flex items-center gap-5 shrink-0 pt-1 sm:pt-0"
                            >
                              <div className="flex items-center space-x-2 cursor-pointer bg-[#F4F6F9] hover:bg-[#E8F1F8] px-3 py-1.5 rounded-lg border border-[#D3DFE9] transition-colors">
                                <RadioGroupItem
                                  value="Sim"
                                  id={`possui-sim-${categoria.id}`}
                                  className="border-[#004B8D] text-[#004B8D]"
                                />
                                <Label
                                  htmlFor={`possui-sim-${categoria.id}`}
                                  className="text-xs sm:text-sm font-bold text-[#102A43] cursor-pointer"
                                >
                                  Sim
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 cursor-pointer bg-[#F4F6F9] hover:bg-[#E8F1F8] px-3 py-1.5 rounded-lg border border-[#D3DFE9] transition-colors">
                                <RadioGroupItem
                                  value="Não"
                                  id={`possui-nao-${categoria.id}`}
                                  className="border-[#004B8D] text-[#004B8D]"
                                />
                                <Label
                                  htmlFor={`possui-nao-${categoria.id}`}
                                  className="text-xs sm:text-sm font-bold text-[#102A43] cursor-pointer"
                                >
                                  Não
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>

                        {/* 2. Se a resposta for "Sim", mostrar campos adicionais estruturados */}
                        {isPossuiSim && (
                          <div className="bg-white rounded-xl border border-[#004B8D]/20 shadow-xs divide-y divide-[#D3DFE9]/60 animate-page-enter">
                            {/* Card Sub-header */}
                            <div className="px-5 py-3.5 bg-gradient-to-r from-[#E8F1F8]/80 to-white flex items-center justify-between rounded-t-xl">
                              <div className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-[#004B8D]" />
                                <span className="text-xs font-bold uppercase tracking-wider text-[#004B8D]">
                                  Dados de Fiscalização Técnica & Responsabilidade
                                </span>
                              </div>
                              <span className="text-[11px] text-[#486581] font-medium hidden sm:inline">
                                Todos os campos marcados com * são obrigatórios
                              </span>
                            </div>

                            <div className="p-5 sm:p-6 space-y-5">
                              {/* Grid: Prestador de Serviço e Número da ART */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {/* Campo: Nome do prestador de serviço */}
                                <div className="space-y-2">
                                  <Label
                                    htmlFor={`prestador-${categoria.id}`}
                                    className="text-xs font-bold text-[#102A43] flex items-center gap-1.5"
                                  >
                                    <Building2 className="w-3.5 h-3.5 text-[#004B8D]" />
                                    Nome do prestador de serviço
                                  </Label>
                                  <Input
                                    id={`prestador-${categoria.id}`}
                                    placeholder="Ex.: Empresa ABC Engenharia Ltda ou Profissional"
                                    value={itemState.prestadorServico || ''}
                                    onChange={(e) =>
                                      handleFieldChange(categoria.id, {
                                        prestadorServico: e.target.value,
                                      })
                                    }
                                    className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm bg-white h-10 shadow-2xs"
                                  />
                                  <p className="text-[11px] text-[#627D98]">
                                    Empresa contratada ou responsável técnico pelas instalações.
                                  </p>
                                </div>

                                {/* Campo: Número da ART (se exigeArt = true) */}
                                {categoria.exigeArt ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label
                                        htmlFor={`art-${categoria.id}`}
                                        className="text-xs font-bold text-[#102A43] flex items-center gap-1.5"
                                      >
                                        <FileCheck2 className="w-3.5 h-3.5 text-[#004B8D]" />
                                        Número da ART (CREA-PI){' '}
                                        <span className="text-rose-600">*</span>
                                      </Label>
                                      <span className="text-[10px] text-[#004B8D] bg-[#E8F1F8] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                        Obrigatória
                                      </span>
                                    </div>
                                    <Input
                                      id={`art-${categoria.id}`}
                                      placeholder="Ex.: PI20260012345"
                                      value={itemState.numeroArt || ''}
                                      onChange={(e) =>
                                        handleFieldChange(categoria.id, {
                                          numeroArt: e.target.value,
                                        })
                                      }
                                      className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm bg-white h-10 shadow-2xs font-mono ${
                                        !itemState.numeroArt?.trim()
                                          ? 'border-rose-300 bg-rose-50/20'
                                          : ''
                                      }`}
                                    />
                                    <p className="text-[11px] text-[#627D98]">
                                      Anotação de Responsabilidade Técnica registrada no conselho.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold text-[#829AB1] flex items-center gap-1.5">
                                      <FileCheck2 className="w-3.5 h-3.5 text-[#829AB1]" />
                                      Número da ART
                                    </Label>
                                    <div className="h-10 px-3 flex items-center bg-[#F4F6F9] border border-[#D3DFE9] rounded-md text-xs text-[#627D98] italic">
                                      Esta categoria técnica não exige obrigatoriedade de ART.
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Grid: Comprovante Entregue e Data da Última Verificação */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2 border-t border-[#D3DFE9]/60">
                                {/* Campo: Comprovante entregue no ato da fiscalização */}
                                <div className="space-y-2.5">
                                  <div>
                                    <Label className="text-xs font-bold text-[#102A43] flex items-center gap-1.5">
                                      <ClipboardCheck className="w-3.5 h-3.5 text-[#004B8D]" />
                                      Comprovante entregue no ato da fiscalização?{' '}
                                      <span className="text-rose-600">*</span>
                                    </Label>
                                    <p className="text-[11px] text-[#627D98] mt-0.5">
                                      Laudo, relatório de manutenção, nota fiscal ou certificado.
                                    </p>
                                  </div>

                                  <RadioGroup
                                    value={itemState.comprovanteEntregue || ''}
                                    onValueChange={(val) =>
                                      handleFieldChange(categoria.id, {
                                        comprovanteEntregue: val as 'Sim' | 'Não',
                                      })
                                    }
                                    className="flex items-center gap-4 pt-0.5"
                                  >
                                    <div className="flex items-center space-x-2 cursor-pointer bg-[#F4F6F9] hover:bg-[#E8F1F8] px-3.5 py-1.5 rounded-lg border border-[#D3DFE9] transition-colors">
                                      <RadioGroupItem
                                        value="Sim"
                                        id={`comp-sim-${categoria.id}`}
                                        className="border-[#004B8D] text-[#004B8D]"
                                      />
                                      <Label
                                        htmlFor={`comp-sim-${categoria.id}`}
                                        className="text-xs sm:text-sm font-semibold text-[#102A43] cursor-pointer"
                                      >
                                        Sim (Entregue)
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 cursor-pointer bg-[#F4F6F9] hover:bg-[#E8F1F8] px-3.5 py-1.5 rounded-lg border border-[#D3DFE9] transition-colors">
                                      <RadioGroupItem
                                        value="Não"
                                        id={`comp-nao-${categoria.id}`}
                                        className="border-[#004B8D] text-[#004B8D]"
                                      />
                                      <Label
                                        htmlFor={`comp-nao-${categoria.id}`}
                                        className="text-xs sm:text-sm font-semibold text-[#102A43] cursor-pointer"
                                      >
                                        Não (Pendente)
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                </div>

                                {/* Campo: Data da última verificação */}
                                {categoria.periodicidadeDias && categoria.periodicidadeDias > 0 ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label
                                        htmlFor={`data-verif-${categoria.id}`}
                                        className="text-xs font-bold text-[#102A43] flex items-center gap-1.5"
                                      >
                                        <Calendar className="w-3.5 h-3.5 text-[#004B8D]" />
                                        Data da última verificação / laudo{' '}
                                        <span className="text-rose-600">*</span>
                                      </Label>
                                      <span className="text-[11px] text-[#004B8D] font-bold">
                                        Validade: {categoria.periodicidadeDias} dias
                                      </span>
                                    </div>
                                    <Input
                                      id={`data-verif-${categoria.id}`}
                                      type="date"
                                      value={itemState.dataUltimaVerificacao || ''}
                                      onChange={(e) =>
                                        handleFieldChange(categoria.id, {
                                          dataUltimaVerificacao: e.target.value,
                                        })
                                      }
                                      className="border-[#D3DFE9] focus-visible:ring-[#004B8D] text-sm bg-white h-10 shadow-2xs"
                                    />
                                    <p className="text-[11px] text-[#627D98]">
                                      Inspeções com mais de {categoria.periodicidadeDias} dias serão
                                      marcadas como vencidas.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold text-[#829AB1] flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-[#829AB1]" />
                                      Periodicidade de inspeção
                                    </Label>
                                    <div className="h-10 px-3 flex items-center bg-[#F4F6F9] border border-[#D3DFE9] rounded-md text-xs text-[#627D98]">
                                      Esta categoria não possui ciclo de renovação temporal
                                      obrigatório.
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. Rodapé do Item: Situação Calculada + Botão de Ação */}
                        <div className="bg-white p-4 rounded-xl border border-[#D3DFE9] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#486581]">
                            <span className="font-semibold text-[#102A43]">Situação avaliada:</span>
                            {renderSituacaoBadge(situacao, 'default')}
                            {situacao === 'pendente' && (
                              <span className="text-rose-700 font-medium text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                ART obrigatória não informada ou comprovante ausente
                              </span>
                            )}
                            {situacao === 'vencido' && (
                              <span className="text-rose-700 font-medium text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Validade expirada (limite: {categoria.periodicidadeDias} dias)
                              </span>
                            )}
                            {situacao === 'conforme' && (
                              <span className="text-emerald-800 font-medium text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Atende plenamente aos requisitos de fiscalização do CREA-PI
                              </span>
                            )}
                            {situacao === 'não se aplica' && (
                              <span className="text-[#486581] font-medium text-[11px] bg-[#F4F6F9] px-2 py-0.5 rounded border border-[#D3DFE9]">
                                Hospital declarou não possuir este sistema
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Button
                              size="sm"
                              type="button"
                              onClick={() => handleSaveCategoryItem(categoria)}
                              disabled={itemState.isSaving}
                              className={`h-9 px-4 text-xs font-bold shadow-xs transition-all cursor-pointer ${
                                itemState.isDirty
                                  ? 'bg-[#004B8D] hover:bg-[#003666] text-white'
                                  : 'bg-[#E8F1F8] text-[#004B8D] hover:bg-[#D3DFE9]'
                              }`}
                            >
                              {itemState.isSaving ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  Salvando...
                                </>
                              ) : itemState.isDirty ? (
                                <>
                                  <Save className="w-3.5 h-3.5 mr-1.5" />
                                  Salvar resposta
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 mr-1.5" />
                                  Salvo
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      )}
    </div>
  )
}
