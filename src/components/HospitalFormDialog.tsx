import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Building2, Save, X, Loader2 } from 'lucide-react'
import { Hospital, HospitalFormData, HospitalTipo } from '@/services/hospitais'
import { formatCNPJ, formatCPF, formatCNES } from '@/lib/formatters'

interface HospitalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hospitalToEdit?: Hospital | null
  onSave: (data: HospitalFormData) => Promise<void>
}

const TIPO_OPTIONS: HospitalTipo[] = ['Hospital Geral', 'Hospital Especializado', 'Hospital-Dia']

export function HospitalFormDialog({
  open,
  onOpenChange,
  hospitalToEdit,
  onSave,
}: HospitalFormDialogProps) {
  const isEditing = !!hospitalToEdit

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync form data when dialog opens or editing changes
  useEffect(() => {
    if (open) {
      if (hospitalToEdit) {
        setFormData({
          nome: hospitalToEdit.nome || '',
          municipio: hospitalToEdit.municipio || '',
          cnes: hospitalToEdit.cnes || '',
          cnpj: hospitalToEdit.cnpj ? formatCNPJ(hospitalToEdit.cnpj) : '',
          cnpj_mantenedora: hospitalToEdit.cnpj_mantenedora
            ? formatCNPJ(hospitalToEdit.cnpj_mantenedora)
            : '',
          tipo: hospitalToEdit.tipo || '',
          endereco: hospitalToEdit.endereco || '',
          responsavel: hospitalToEdit.responsavel || '',
          cpf_responsavel: hospitalToEdit.cpf_responsavel
            ? formatCPF(hospitalToEdit.cpf_responsavel)
            : '',
        })
      } else {
        setFormData({
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
      }
      setErrors({})
      setIsSubmitting(false)
    }
  }, [open, hospitalToEdit])

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
      newErrors.cnes = 'CNES deve conter exatamente 7 dígitos.'
    }

    if (formData.cnpj) {
      const cnpjDigits = formData.cnpj.replace(/\D/g, '')
      if (cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
        newErrors.cnpj = 'CNPJ inválido (deve conter 14 dígitos).'
      }
    }

    if (formData.cnpj_mantenedora) {
      const mantDigits = formData.cnpj_mantenedora.replace(/\D/g, '')
      if (mantDigits.length > 0 && mantDigits.length !== 14) {
        newErrors.cnpj_mantenedora = 'CNPJ da mantenedora inválido (14 dígitos).'
      }
    }

    if (formData.cpf_responsavel) {
      const cpfDigits = formData.cpf_responsavel.replace(/\D/g, '')
      if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
        newErrors.cpf_responsavel = 'CPF inválido (deve conter 11 dígitos).'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setIsSubmitting(true)
      await onSave(formData)
      onOpenChange(false)
    } catch {
      // Error handled by parent or toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-[#D3DFE9] bg-white sm:rounded-xl shadow-xl">
        <DialogHeader className="p-6 pb-4 border-b border-[#D3DFE9] bg-[#F4F6F9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F1F8] flex items-center justify-center text-[#004B8D] shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#102A43]">
                {isEditing ? 'Editar Hospital' : 'Novo Hospital'}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#486581] mt-0.5">
                {isEditing
                  ? 'Atualize os dados cadastrais da unidade hospitalar no CREA-PI.'
                  : 'Preencha os campos para cadastrar uma unidade para fiscalização técnica.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Dados Principais */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E5A812]" />
              Identificação Geral
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="nome" className="text-sm font-semibold text-[#102A43]">
                  Nome do Hospital <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: Hospital Regional Dr. Francisco Ayres"
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
                <Label htmlFor="municipio" className="text-sm font-semibold text-[#102A43]">
                  Município <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="municipio"
                  placeholder="Ex: Teresina"
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
                <Label htmlFor="cnes" className="text-sm font-semibold text-[#102A43]">
                  CNES (7 dígitos) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cnes"
                  placeholder="Ex: 1234567"
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
                <Label htmlFor="tipo" className="text-sm font-semibold text-[#102A43]">
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
                  <SelectTrigger id="tipo" className="border-[#D3DFE9] focus:ring-[#004B8D]">
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
                <Label htmlFor="cnpj" className="text-sm font-semibold text-[#102A43]">
                  CNPJ
                </Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
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
                <Label htmlFor="cnpj_mantenedora" className="text-sm font-semibold text-[#102A43]">
                  CNPJ da Mantenedora
                </Label>
                <Input
                  id="cnpj_mantenedora"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
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
                  <p className="text-xs font-medium text-red-500 mt-1">{errors.cnpj_mantenedora}</p>
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
              <Label htmlFor="endereco" className="text-sm font-semibold text-[#102A43]">
                Endereço Completo
              </Label>
              <Textarea
                id="endereco"
                rows={2}
                placeholder="Avenida / Rua, número, bairro, CEP, complementos..."
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="border-[#D3DFE9] focus-visible:ring-[#004B8D] resize-none"
              />
            </div>
          </div>

          {/* Responsável pelas Informações */}
          <div className="pt-2 border-t border-[#D3DFE9]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#004B8D] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E5A812]" />
              Responsável pelas Informações
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="responsavel" className="text-sm font-semibold text-[#102A43]">
                  Nome do Responsável
                </Label>
                <Input
                  id="responsavel"
                  placeholder="Ex: Engenheiro(a) ou Diretor(a)"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  className="border-[#D3DFE9] focus-visible:ring-[#004B8D]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf_responsavel" className="text-sm font-semibold text-[#102A43]">
                  CPF do Responsável
                </Label>
                <Input
                  id="cpf_responsavel"
                  placeholder="000.000.000-00"
                  maxLength={14}
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
                  <p className="text-xs font-medium text-red-500 mt-1">{errors.cpf_responsavel}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-[#D3DFE9] flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-[#D3DFE9] text-[#486581] hover:text-[#102A43] hover:bg-[#F4F6F9]"
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
                  {isEditing ? 'Salvar Alterações' : 'Salvar Hospital'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
