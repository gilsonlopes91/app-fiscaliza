import pb from '@/lib/pocketbase/client'

export type HospitalTipo = 'Hospital Geral' | 'Hospital Especializado' | 'Hospital-Dia'

export interface Hospital {
  id: string
  nome: string
  municipio: string
  cnes: string
  cnpj?: string
  cnpj_mantenedora?: string
  tipo?: HospitalTipo
  endereco?: string
  responsavel?: string
  cpf_responsavel?: string
  created: string
  updated: string
}

export type HospitalFormData = {
  nome: string
  municipio: string
  cnes: string
  cnpj?: string
  cnpj_mantenedora?: string
  tipo?: HospitalTipo | ''
  endereco?: string
  responsavel?: string
  cpf_responsavel?: string
}

export const hospitaisService = {
  async getAll(): Promise<Hospital[]> {
    const records = await pb.collection('hospitais').getFullList<Hospital>({
      sort: '-created',
    })
    return records
  },

  async getById(id: string): Promise<Hospital> {
    const record = await pb.collection('hospitais').getOne<Hospital>(id)
    return record
  },

  async create(data: HospitalFormData): Promise<Hospital> {
    const payload: Record<string, unknown> = {
      nome: data.nome.trim(),
      municipio: data.municipio.trim(),
      cnes: data.cnes.trim(),
      cnpj: data.cnpj?.trim() || '',
      cnpj_mantenedora: data.cnpj_mantenedora?.trim() || '',
      tipo: data.tipo || null,
      endereco: data.endereco?.trim() || '',
      responsavel: data.responsavel?.trim() || '',
      cpf_responsavel: data.cpf_responsavel?.trim() || '',
    }
    const record = await pb.collection('hospitais').create<Hospital>(payload)
    return record
  },

  async update(id: string, data: Partial<HospitalFormData>): Promise<Hospital> {
    const payload: Record<string, unknown> = {}
    if (data.nome !== undefined) payload.nome = data.nome.trim()
    if (data.municipio !== undefined) payload.municipio = data.municipio.trim()
    if (data.cnes !== undefined) payload.cnes = data.cnes.trim()
    if (data.cnpj !== undefined) payload.cnpj = data.cnpj.trim()
    if (data.cnpj_mantenedora !== undefined) payload.cnpj_mantenedora = data.cnpj_mantenedora.trim()
    if (data.tipo !== undefined) payload.tipo = data.tipo || null
    if (data.endereco !== undefined) payload.endereco = data.endereco.trim()
    if (data.responsavel !== undefined) payload.responsavel = data.responsavel.trim()
    if (data.cpf_responsavel !== undefined) payload.cpf_responsavel = data.cpf_responsavel.trim()

    const record = await pb.collection('hospitais').update<Hospital>(id, payload)
    return record
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('hospitais').delete(id)
  },
}
