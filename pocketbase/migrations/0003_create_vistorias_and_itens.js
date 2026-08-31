migrate(
  (app) => {
    const hospitaisCol = app.findCollectionByNameOrId('hospitais')
    const categoriasCol = app.findCollectionByNameOrId('categorias_vistoria')

    // 1. Create vistorias collection
    const vistoriasCollection = new Collection({
      name: 'vistorias',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'hospital',
          type: 'relation',
          required: true,
          collectionId: hospitaisCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['em_andamento', 'concluida'],
          maxSelect: 1,
        },
        {
          name: 'observacoes',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_vistorias_hospital ON vistorias (hospital)'],
    })
    app.save(vistoriasCollection)

    // 2. Create vistoria_itens collection
    const vistoriaItensCollection = new Collection({
      name: 'vistoria_itens',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'vistoria',
          type: 'relation',
          required: true,
          collectionId: vistoriasCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'hospital',
          type: 'relation',
          required: true,
          collectionId: hospitaisCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'categoria',
          type: 'relation',
          required: true,
          collectionId: categoriasCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        // possuiSistema: 'Sim' | 'Não' | null
        {
          name: 'possuiSistema',
          type: 'select',
          values: ['Sim', 'Não'],
          maxSelect: 1,
        },
        // prestadorServico
        {
          name: 'prestadorServico',
          type: 'text',
        },
        // numeroArt
        {
          name: 'numeroArt',
          type: 'text',
        },
        // comprovanteEntregue: 'Sim' | 'Não' | null
        {
          name: 'comprovanteEntregue',
          type: 'select',
          values: ['Sim', 'Não'],
          maxSelect: 1,
        },
        // dataUltimaVerificacao (date format YYYY-MM-DD or date field)
        {
          name: 'dataUltimaVerificacao',
          type: 'date',
        },
        // situacaoCalculada: 'não se aplica' | 'pendente' | 'vencido' | 'conforme' | null
        {
          name: 'situacaoCalculada',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_vistoria_itens_vistoria ON vistoria_itens (vistoria)',
        'CREATE INDEX idx_vistoria_itens_hospital ON vistoria_itens (hospital)',
        'CREATE INDEX idx_vistoria_itens_categoria ON vistoria_itens (categoria)',
      ],
    })
    app.save(vistoriaItensCollection)
  },
  (app) => {
    try {
      const vistoriaItens = app.findCollectionByNameOrId('vistoria_itens')
      app.delete(vistoriaItens)
    } catch (_) {}
    try {
      const vistorias = app.findCollectionByNameOrId('vistorias')
      app.delete(vistorias)
    } catch (_) {}
  },
)
