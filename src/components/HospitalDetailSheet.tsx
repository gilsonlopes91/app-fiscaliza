import React, { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  MapPin,
  FileText,
  User,
  Edit2,
  Save,
  X,
  Trash2,
  Loader2,
  Hash,
  CreditCard,
  Building,
  ClipboardCheck,
} from 'lucide-react'
import { Hospital, HospitalFormData, HospitalTipo } from '@/services/hospitais'
import { vistoriasService } from '@/services/vistorias'
import { useToast } from '@/hooks/use-toast'
import { formatCNPJ, formatCPF, formatCNES } from '@/lib/formatters'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface HospitalDetailSheetProps {
  hospital: Hospital | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, data: Partial<HospitalFormData>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const TIPO_OPTIONS: HospitalTipo[] = ['Hospital Geral', 'Hospital Especializado', 'Hospital-Dia']

export function HospitalDetailSheet({
  hospital,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: HospitalDetailSheetProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStartingVistoria, setIsStartingVistoria] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState<HospitalFormData>({
    nome: '',
    municipio: '',
    cnes: '',
    cnpj: '',
    cnpj_mantenedora: '',
    tipo: '',
    endereco: '',
    responsavel: '',
    cpf_responsavel: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (hospital && open) {
      setFormData({
        nome: hospital.nome || '',
        municipio: hospital.municipio || '',
        cnes: hospital.cnes || '',
        cnpj: hospital.cnpj ? formatCNPJ(hospital.cnpj) : '',
        cnpj_mantenedora: hospital.cnpj_mantenedora ? formatCNPJ(hospital.cnpj_mantenedora) : '',
        tipo: hospital.tipo || '',
        endereco: hospital.endereco || '',
        responsavel: hospital.responsavel || '',
        cpf_responsavel: hospital.cpf_responsavel ? formatCPF(hospital.cpf_responsavel) : '',
      })
      setIsEditing(false)
      setErrors({})
    }
  }, [hospital, open])

  if (!hospital) return null

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome do hospital é obrigatório.'
    }
    if (!formData.municipio.trim()) {
      newErrors.municipio = 'Município é obrigatório.'
    }
    if (!formData.cnes.trim()) {
      newErrors.cnes = 'CNES é obrigatório.'
    } else if (formData.cnes.replace(/\D/g, '').length !== 7) {
      newErrors.cnes = 'CNES deve conter 7 dígitos.'
    }

    if (formData.cnpj) {
      const cnpjDigits = formData.cnpj.replace(/\D/g, '')
      if (cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
        newErrors.cnpj = 'CNPJ deve conter 14 dígitos.'
      }
    }

    if (formData.cnpj_mantenedora) {
      const mantDigits = formData.cnpj_mantenedora.replace(/\D/g, '')
      if (mantDigits.length > 0 && mantDigits.length !== 14) {
        newErrors.cnpj_mantenedora = 'CNPJ da mantenedora inválido.'
      }
    }

    if (formData.cpf_responsavel) {
      const cpfDigits = formData.cpf_responsavel.replace(/\D/g, '')
      if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
        newErrors.cpf_responsavel = 'CPF deve conter 11 dígitos.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setIsSubmitting(true)
      await onUpdate(hospital.id, formData)
      setIsEditing(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset form to original hospital values
    setFormData({
      nome: hospital.nome || '',
      municipio: hospital.municipio || '',
      cnes: hospital.cnes || '',
      cnpj: hospital.cnpj ? formatCNPJ(hospital.cnpj) : '',
      cnpj_mantenedora: hospital.cnpj_mantenedora ? formatCNPJ(hospital.cnpj_mantenedora) : '',
      tipo: hospital.tipo || '',
      endereco: hospital.endereco || '',
      responsavel: hospital.responsavel || '',
      cpf_responsavel: hospital.cpf_responsavel ? formatCPF(hospital.cpf_responsavel) : '',
    })
    setErrors({})
    setIsEditing(false)
  }

  const handleIniciarVistoria = async () => {
    if (!hospital) return
    try {
      setIsStartingVistoria(true)
      const vistoria = await vistoriasService.getOrCreateForHospital(hospital.id)
      onOpenChange(false)
      toast({
        title: 'Vistoria carregada',
        description: `Vistoria vinculada a "${hospital.nome}".`,
      })
      navigate(`/vistoria?hospitalId=${hospital.id}&vistoriaId=${vistoria.id}`)
    } catch (err) {
      console.error('Erro ao iniciar vistoria:', err)
      toast({
        title: 'Erro ao iniciar vistoria',
        description: 'Não foi possível carregar ou criar a vistoria para este hospital.',
        variant: 'destructive',
      })
    } finally {
      setIsStartingVistoria(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    try {
      setIsDeleting(true)
      await onDelete(hospital.id)
      setShowDeleteConfirm(false)
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 flex flex-col bg-white border-l border-[#D3DFE9]">
          {/* Header */}
          <SheetHeader className="p-6 border-b border-[#D3DFE9] bg-[#F4F6F9] sticky top-0 z-10">
            <div className="flex items-start justify-between gap-4 pr-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] shrink-0 mt-0.5 shadow-xs">
                  <Building2 className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <SheetTitle className="text-xl font-bold text-[#102A43] leading-tight text-left">
                      {hospital.nome}
                    </SheetTitle>
                    {hospital.tipo && (
                      <Badge className="bg-[#E8F1F8] text-[#004B8D] hover:bg-[#E8F1F8] border-0 text-xs font-semibold">
                        {hospital.tipo}
                      </Badge>
                    )}
                  </div>
                  <SheetDescription className="text-xs text-[#486581] flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium text-[#102A43]">
                      <MapPin className="w-3.5 h-3.5 text-[#004B8D]" />
                      {hospital.municipio}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-xs text-[#334E68] font-semibold">
                      CNES: {hospital.cnes}
                    </span>
                  </SheetDescription>
                </div>
              </div>

              {!isEditing && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleIniciarVistoria}
                    disabled={isStartingVistoria}
                    className="shrink-0 bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold h-9 px-3"
                  >
                    {isStartingVistoria ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <ClipboardCheck className="w-4 h-4 mr-1.5 stroke-[2.2]" />
                    )}
                    Iniciar vistoria
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="shrink-0 border-[#D3DFE9] text-[#004B8D] hover:text-[#004B8D] hover:bg-[#E8F1F8] font-semibold h-9 px-3"
                  >
                    <Edit2 className="w-4 h-4 mr-1.5" />
                    Editar
                  </Button>
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Body */}
          {isEditing ? (
            <form onSubmit={handleSave} className="p-6 space-y-6 flex-1">
              <div className="bg-[#E8F1F8] border border-[#004B8D]/20 rounded-lg p-3 text-xs text-[#004B8D] font-medium flex items-center gap-2">
                <Edit2 className="w-4 h-4 shrink-0" />
                Modo de edição ativo. Altere os campos e clique em &ldquo;Salvar Alterações&rdquo;.
              </div>

              {/* Identificação Geral */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E5A812]" />
                  Identificação Geral
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="edit-nome" className="text-sm font-semibold text-[#102A43]">
                      Nome do Hospital <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-nome"
                      value={formData.nome}
                      onChange={(e) => {
                        setFormData({ ...formData, nome: e.target.value })
                        if (errors.nome) setErrors({ ...errors, nome: '' })
                      }}
                      className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                        errors.nome ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    />
                    {errors.nome && (
                      <p className="text-xs font-medium text-red-500 mt-1">{errors.nome}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="edit-municipio"
                      className="text-sm font-semibold text-[#102A43]"
                    >
                      Município <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-municipio"
                      value={formData.municipio}
                      onChange={(e) => {
                        setFormData({ ...formData, municipio: e.target.value })
                        if (errors.municipio) setErrors({ ...errors, municipio: '' })
                      }}
                      className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                        errors.municipio ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    />
                    {errors.municipio && (
                      <p className="text-xs font-medium text-red-500 mt-1">{errors.municipio}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-cnes" className="text-sm font-semibold text-[#102A43]">
                      CNES (7 dígitos) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-cnes"
                      maxLength={7}
                      value={formData.cnes}
                      onChange={(e) => {
                        const val = formatCNES(e.target.value)
                        setFormData({ ...formData, cnes: val })
                        if (errors.cnes) setErrors({ ...errors, cnes: '' })
                      }}
                      className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                        errors.cnes ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    />
                    {errors.cnes && (
                      <p className="text-xs font-medium text-red-500 mt-1">{errors.cnes}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-tipo" className="text-sm font-semibold text-[#102A43]">
                      Tipo de Estabelecimento
                    </Label>
                    <Select
                      value={formData.tipo || 'none'}
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          tipo: val === 'none' ? '' : (val as HospitalTipo),
                        })
                      }
                    >
                      <SelectTrigger
                        id="edit-tipo"
                        className="border-[#D3DFE9] focus:ring-[#004B8D]"
                      >
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não informado</SelectItem>
                        {TIPO_OPTIONS.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-cnpj" className="text-sm font-semibold text-[#102A43]">
                      CNPJ
                    </Label>
                    <Input
                      id="edit-cnpj"
                      maxLength={18}
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => {
                        const formatted = formatCNPJ(e.target.value)
                        setFormData({ ...formData, cnpj: formatted })
                        if (errors.cnpj) setErrors({ ...errors, cnpj: '' })
                      }}
                      className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                        errors.cnpj ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    />
                    {errors.cnpj && (
                      <p className="text-xs font-medium text-red-500 mt-1">{errors.cnpj}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      htmlFor="edit-cnpj_mantenedora"
                      className="text-sm font-semibold text-[#102A43]"
                    >
                      CNPJ da Mantenedora
                    </Label>
                    <Input
                      id="edit-cnpj_mantenedora"
                      maxLength={18}
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj_mantenedora}
                      onChange={(e) => {
                        const formatted = formatCNPJ(e.target.value)
                        setFormData({ ...formData, cnpj_mantenedora: formatted })
                        if (errors.cnpj_mantenedora) setErrors({ ...errors, cnpj_mantenedora: '' })
                      }}
                      className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                        errors.cnpj_mantenedora ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    />
                    {errors.cnpj_mantenedora && (
                      <p className="text-xs font-medium text-red-500 mt-1">
                        {errors.cnpj_mantenedora}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="pt-2 border-t border-[#D3DFE9]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E5A812]" />
                  Localização
                </h3>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-endereco" className="text-sm font-semibold text-[#102A43]">
                    Endereço Completo
                  </Label>
                  <Textarea
                    id="edit-endereco"
                    rows={2}
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="border-[#D3DFE9] focus-visible:ring-[#004B8D] resize-none"
                  />
                </div>
              </div>

              {/* Responsável */}
              <div className="pt-2 border-t border-[#D3DFE9]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E5A812]" />
                  Responsável pelas Informações
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="edit-responsavel"
                      className="text-sm font-semibold text-[#102A43]"
                    >
                      Nome do Responsável
                    </Label>
                    <Input
                      id="edit-responsavel"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      className="border-[#D3DFE9] focus-visible:ring-[#004B8D]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="edit-cpf_responsavel"
                      className="text-sm font-semibold text-[#102A43]"
                    >
                      CPF do Responsável
                    </Label>
                    <Input
                      id="edit-cpf_responsavel"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      value={formData.cpf_responsavel}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value)
                        setFormData({ ...formData, cpf_responsavel: formatted })
                        if (errors.cpf_responsavel) setErrors({ ...errors, cpf_responsavel: '' })
                      }}
                      className={`border-[#D3DFE9] focus-visible:ring-[#004B8D] ${
                        errors.cpf_responsavel ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    />
                    {errors.cpf_responsavel && (
                      <p className="text-xs font-medium text-red-500 mt-1">
                        {errors.cpf_responsavel}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="pt-4 border-t border-[#D3DFE9] flex flex-row items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="border-[#D3DFE9] text-[#486581] hover:text-[#102A43]"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </SheetFooter>
            </form>
          ) : (
            <div className="p-6 space-y-6 flex-1">
              {/* Section 1: Dados Cadastrais */}
              <div className="bg-[#F4F6F9] rounded-xl p-5 border border-[#D3DFE9]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-4 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#004B8D]" />
                  Dados do Estabelecimento
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium">
                      Nome Oficial
                    </span>
                    <span className="font-semibold text-[#102A43] block">{hospital.nome}</span>
                  </div>

                  <div>
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium">
                      Tipo de Unidade
                    </span>
                    <span className="font-semibold text-[#102A43] block">
                      {hospital.tipo || (
                        <span className="text-[#829AB1] italic font-normal">Não informado</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium flex items-center gap-1">
                      <Hash className="w-3 h-3 text-[#E5A812]" />
                      Código CNES
                    </span>
                    <span className="font-mono font-bold text-[#004B8D] block bg-white px-2 py-1 rounded border border-[#D3DFE9] w-fit">
                      {hospital.cnes}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-[#004B8D]" />
                      CNPJ
                    </span>
                    <span className="font-mono font-semibold text-[#102A43] block">
                      {hospital.cnpj ? (
                        formatCNPJ(hospital.cnpj)
                      ) : (
                        <span className="text-[#829AB1] italic font-normal">Não informado</span>
                      )}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium flex items-center gap-1">
                      <Building className="w-3 h-3 text-[#004B8D]" />
                      CNPJ da Mantenedora
                    </span>
                    <span className="font-mono font-semibold text-[#102A43] block">
                      {hospital.cnpj_mantenedora ? (
                        formatCNPJ(hospital.cnpj_mantenedora)
                      ) : (
                        <span className="text-[#829AB1] italic font-normal">Não informado</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Localização */}
              <div className="bg-[#F4F6F9] rounded-xl p-5 border border-[#D3DFE9]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-4 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#004B8D]" />
                  Localização e Município
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium">
                      Município / UF
                    </span>
                    <span className="font-semibold text-[#102A43] block">{hospital.municipio}</span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium">
                      Endereço Completo
                    </span>
                    <span className="font-medium text-[#102A43] block leading-relaxed">
                      {hospital.endereco || (
                        <span className="text-[#829AB1] italic font-normal">Não informado</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Responsável */}
              <div className="bg-[#F4F6F9] rounded-xl p-5 border border-[#D3DFE9]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-4 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#004B8D]" />
                  Responsável pelas Informações
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium">
                      Nome do Responsável
                    </span>
                    <span className="font-semibold text-[#102A43] block">
                      {hospital.responsavel || (
                        <span className="text-[#829AB1] italic font-normal">Não informado</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-[#486581] block mb-0.5 font-medium">
                      CPF do Responsável
                    </span>
                    <span className="font-mono font-semibold text-[#102A43] block">
                      {hospital.cpf_responsavel ? (
                        formatCPF(hospital.cpf_responsavel)
                      ) : (
                        <span className="text-[#829AB1] italic font-normal">Não informado</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Ações Rápidas de Vistoria e Exclusão */}
              <div className="pt-2 flex flex-col gap-3">
                <div className="bg-[#E8F1F8] border border-[#004B8D]/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#004B8D] flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-[#004B8D]" />
                      Checklist Técnico de Vistoria CREA-PI
                    </p>
                    <p className="text-xs text-[#486581]">
                      Preencha ou visualize a conformidade técnica, ARTs e segurança deste hospital.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleIniciarVistoria}
                    disabled={isStartingVistoria}
                    className="bg-[#004B8D] hover:bg-[#003666] text-white shadow-sm font-semibold shrink-0 text-xs h-9 px-3.5"
                  >
                    {isStartingVistoria ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <ClipboardCheck className="w-4 h-4 mr-1.5" />
                    )}
                    Iniciar vistoria
                  </Button>
                </div>

                {onDelete && (
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-xs text-[#486581]">
                      Cadastrado em {new Date(hospital.created).toLocaleDateString('pt-BR')}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Excluir hospital
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog for Deletion */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="border-[#D3DFE9] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#102A43]">
              Excluir Hospital
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#486581]">
              Tem certeza que deseja excluir &ldquo;{hospital.nome}&rdquo;? Esta ação removerá os
              dados cadastrais permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="border-[#D3DFE9] text-[#486581]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
