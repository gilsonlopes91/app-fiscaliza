migrate(
  (app) => {
    // 1. Create categorias_vistoria collection if it does not exist
    let collection
    try {
      collection = app.findCollectionByNameOrId('categorias_vistoria')
    } catch (_) {
      collection = new Collection({
        name: 'categorias_vistoria',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'exigeArt', type: 'bool' },
          { name: 'periodicidadeDias', type: 'number', onlyInt: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_categorias_vistoria_nome ON categorias_vistoria (nome)',
        ],
      })
      app.save(collection)
    }

    // 2. Fixed checklist items
    const fixedCategories = [
      { nome: 'Ar-condicionado e exaustão', exigeArt: true, periodicidadeDias: null },
      { nome: 'Caldeiras e vasos de pressão', exigeArt: true, periodicidadeDias: 365 },
      { nome: 'Central de GLP', exigeArt: true, periodicidadeDias: null },
      { nome: 'Elevadores', exigeArt: true, periodicidadeDias: null },
      { nome: 'Grupo gerador', exigeArt: true, periodicidadeDias: null },
      { nome: 'Instalações elétricas', exigeArt: true, periodicidadeDias: null },
      { nome: 'SPDA', exigeArt: true, periodicidadeDias: null },
      { nome: 'Sistemas de combate a incêndio', exigeArt: true, periodicidadeDias: null },
      { nome: 'Controle de pragas', exigeArt: true, periodicidadeDias: null },
      { nome: 'PGRSS (resíduos de saúde)', exigeArt: true, periodicidadeDias: null },
    ]

    for (let i = 0; i < fixedCategories.length; i++) {
      const item = fixedCategories[i]
      try {
        const existing = app.findFirstRecordByData('categorias_vistoria', 'nome', item.nome)
        existing.set('exigeArt', item.exigeArt)
        if (item.periodicidadeDias !== null) {
          existing.set('periodicidadeDias', item.periodicidadeDias)
        } else {
          existing.set('periodicidadeDias', null)
        }
        app.save(existing)
      } catch (_) {
        const record = new Record(collection)
        record.set('nome', item.nome)
        record.set('exigeArt', item.exigeArt)
        if (item.periodicidadeDias !== null) {
          record.set('periodicidadeDias', item.periodicidadeDias)
        }
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('categorias_vistoria')
      app.delete(collection)
    } catch (_) {}
  },
)
