migrate(
  (app) => {
    const collection = new Collection({
      name: 'hospitais',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'municipio', type: 'text', required: true },
        { name: 'cnes', type: 'text', required: true },
        { name: 'cnpj', type: 'text' },
        { name: 'cnpj_mantenedora', type: 'text' },
        {
          name: 'tipo',
          type: 'select',
          values: ['Hospital Geral', 'Hospital Especializado', 'Hospital-Dia'],
          maxSelect: 1,
        },
        { name: 'endereco', type: 'text' },
        { name: 'responsavel', type: 'text' },
        { name: 'cpf_responsavel', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_hospitais_municipio ON hospitais (municipio)',
        'CREATE INDEX idx_hospitais_cnes ON hospitais (cnes)',
        'CREATE INDEX idx_hospitais_nome ON hospitais (nome)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('hospitais')
      app.delete(collection)
    } catch (_) {}
  },
)
