import pb from '@/lib/pocketbase/client'
import { Hospital } from './hospitais'
import { CategoriaVistoria } from './categoriasVistoria'

export type SituacaoChecklist = 'não se aplica' | 'pendente' | 'vencido' | 'conforme' | null

export interface Vistoria {
  id: string
  hospital: string
  status?: 'em_andamento' | 'concluida'
  observacoes?: string
  created: string
  updated: string
  expand?: {
    hospital?: Hospital
  }
}

export interface VistoriaItem {
  id: string
  vistoria: string
  hospital: string
  categoria: string
  possuiSistema?: 'Sim' | 'Não' | '' | null
  prestadorServico?: string
  numeroArt?: string
  comprovanteEntregue?: 'Sim' | 'Não' | '' | null
  dataUltimaVerificacao?: string | null
  situacaoCalculada?: SituacaoChecklist
  created: string
  updated: string
  expand?: {
    categoria?: CategoriaVistoria
    hospital?: Hospital
  }
}

export interface VistoriaItemFormData {
  possuiSistema?: 'Sim' | 'Não' | '' | null
  prestadorServico?: string
  numeroArt?: string
  comprovanteEntregue?: 'Sim' | 'Não' | '' | null
  dataUltimaVerificacao?: string | null
}

/**
 * Calculates checklist item situation with exact precedence:
 * Precedência clara:
 * 1. "Não" -> "não se aplica"
 * 2. Se não respondeu ("Sim" ou "Não"), retorna null (não avaliado)
 * 3. Se possui ("Sim"):
 *    a. "pendente" - se falta ART exigida (exigeArt=true e !numeroArt?.trim()) OU se comprovante não foi entregue (comprovanteEntregue !== 'Sim')
 *    b. "vencido" - se a categoria tem periodicidadeDias e a data da última verificação não foi informada ou passou da periodicidade (dias passados > periodicidadeDias)
 *    c. "conforme" - se passou por todas as verificações acima com sucesso
 */
export function calculateItemSituacao(
  data: {
    possuiSistema?: 'Sim' | 'Não' | '' | null
    prestadorServico?: string
    numeroArt?: string
    comprovanteEntregue?: 'Sim' | 'Não' | '' | null
    dataUltimaVerificacao?: string | null
  },
  categoria: {
    exigeArt: boolean
    periodicidadeDias?: number | null
  },
): SituacaoChecklist {
  if (data.possuiSistema === 'Não') {
    return 'não se aplica'
  }

  if (data.possuiSistema !== 'Sim') {
    return null
  }

  // Hospital possui o sistema ("Sim")

  // Check pendente:
  // - Falta ART exigida
  const faltaArt = categoria.exigeArt && (!data.numeroArt || data.numeroArt.trim().length === 0)
  // - Comprovante não foi entregue no ato da fiscalização
  const comprovanteNaoEntregue = data.comprovanteEntregue !== 'Sim'

  if (faltaArt || comprovanteNaoEntregue) {
    return 'pendente'
  }

  // Check vencido:
  // Se a categoria tiver periodicidadeDias preenchido (> 0)
  if (categoria.periodicidadeDias && categoria.periodicidadeDias > 0) {
    if (!data.dataUltimaVerificacao) {
      // Periodicidade exigida mas data não informada
      return 'vencido'
    }

    const verificacaoDate = new Date(data.dataUltimaVerificacao)
    if (isNaN(verificacaoDate.getTime())) {
      return 'vencido'
    }

    const today = new Date()
    // Difference in milliseconds
    const diffMs = today.getTime() - verificacaoDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays > categoria.periodicidadeDias) {
      return 'vencido'
    }
  }

  return 'conforme'
}

export const vistoriasService = {
  /**
   * List all vistorias with expanded hospital data
   */
  async getAll(): Promise<Vistoria[]> {
    return await pb.collection('vistorias').getFullList<Vistoria>({
      sort: '-created',
      expand: 'hospital',
    })
  },

  /**
   * Find existing vistoria for a specific hospital
   */
  async getByHospitalId(hospitalId: string): Promise<Vistoria | null> {
    try {
      const records = await pb.collection('vistorias').getList<Vistoria>(1, 1, {
        filter: `hospital = "${hospitalId}"`,
        sort: '-created',
        expand: 'hospital',
      })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  /**
   * Get vistoria by its ID
   */
  async getById(id: string): Promise<Vistoria> {
    return await pb.collection('vistorias').getOne<Vistoria>(id, {
      expand: 'hospital',
    })
  },

  /**
   * Get or create a vistoria for a given hospital (ensuring 1 vistoria per hospital)
   */
  async getOrCreateForHospital(hospitalId: string): Promise<Vistoria> {
    const existing = await this.getByHospitalId(hospitalId)
    if (existing) {
      return existing
    }

    const record = await pb.collection('vistorias').create<Vistoria>(
      {
        hospital: hospitalId,
        status: 'em_andamento',
      },
      {
        expand: 'hospital',
      },
    )

    return record
  },

  /**
   * Get all checklist items for a specific vistoria
   */
  async getItensByVistoria(vistoriaId: string): Promise<VistoriaItem[]> {
    return await pb.collection('vistoria_itens').getFullList<VistoriaItem>({
      filter: `vistoria = "${vistoriaId}"`,
      expand: 'categoria,hospital',
    })
  },

  /**
   * Save or update a checklist item
   */
  async saveItem(
    vistoriaId: string,
    hospitalId: string,
    categoriaId: string,
    formData: VistoriaItemFormData,
    categoria: { exigeArt: boolean; periodicidadeDias?: number | null },
    existingItemId?: string,
  ): Promise<VistoriaItem> {
    const situacao = calculateItemSituacao(formData, categoria)

    const payload: Record<string, unknown> = {
      vistoria: vistoriaId,
      hospital: hospitalId,
      categoria: categoriaId,
      possuiSistema: formData.possuiSistema || null,
      prestadorServico: formData.prestadorServico ? formData.prestadorServico.trim() : '',
      numeroArt: formData.numeroArt ? formData.numeroArt.trim() : '',
      comprovanteEntregue: formData.comprovanteEntregue || null,
      dataUltimaVerificacao: formData.dataUltimaVerificacao || null,
      situacaoCalculada: situacao,
    }

    if (existingItemId) {
      return await pb.collection('vistoria_itens').update<VistoriaItem>(existingItemId, payload, {
        expand: 'categoria,hospital',
      })
    }

    // Check if an item already exists in DB to prevent duplicates
    try {
      const existing = await pb.collection('vistoria_itens').getList<VistoriaItem>(1, 1, {
        filter: `vistoria = "${vistoriaId}" && categoria = "${categoriaId}"`,
      })
      if (existing.items.length > 0) {
        return await pb
          .collection('vistoria_itens')
          .update<VistoriaItem>(existing.items[0].id, payload, {
            expand: 'categoria,hospital',
          })
      }
    } catch {
      // Continue to create
    }

    return await pb.collection('vistoria_itens').create<VistoriaItem>(payload, {
      expand: 'categoria,hospital',
    })
  },
}
