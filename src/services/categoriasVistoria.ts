import pb from '@/lib/pocketbase/client'

export interface CategoriaVistoria {
  id: string
  nome: string
  exigeArt: boolean
  periodicidadeDias?: number | null
  created: string
  updated: string
}

export const categoriasVistoriaService = {
  async getAll(): Promise<CategoriaVistoria[]> {
    const records = await pb.collection('categorias_vistoria').getFullList<CategoriaVistoria>({
      sort: 'created',
    })
    return records.map((record) => ({
      ...record,
      // Normalize periodicidadeDias: null if <= 0 or not provided
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }))
  },

  async getById(id: string): Promise<CategoriaVistoria> {
    const record = await pb.collection('categorias_vistoria').getOne<CategoriaVistoria>(id)
    return {
      ...record,
      periodicidadeDias:
        record.periodicidadeDias && record.periodicidadeDias > 0 ? record.periodicidadeDias : null,
    }
  },
}
