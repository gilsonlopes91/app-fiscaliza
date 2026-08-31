import React, { useState, useRef, useMemo, useCallback } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  X,
  FileDown,
  ArrowRight,
  ShieldAlert,
  Building2,
  Trash2,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { hospitaisService, Hospital, HospitalTipo } from '@/services/hospitais'
import { formatCNPJ } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

const REQUIRED_HEADERS = [
  'nome',
  'municipio',
  'cnes',
  'cnpj',
  'cnpj_mantenedora',
  'tipo',
] as const

const VALID_TIPOS: HospitalTipo[] = [
  'Hospital Geral',
  'Hospital Especializado',
  'Hospital-Dia',
]

export interface ParsedCsvRow {
  rowNumber: number
  nome: string
  municipio: string
  cnes: string
  cnpj: string
  cnpj_mantenedora: string
  tipo: HospitalTipo | ''
  rawTipo: string
  status: 'new' | 'update' | 'invalid'
  errors: string[]
  existingHospitalId?: string
  existingHospitalName?: string
}

export interface ImportSummary {
  createdCount: number
  updatedCount: number
  totalProcessed: number
  errorsCount: number
  details: {
    nome: string
    cnes: string
    action: 'created' | 'updated'
  }[]
}

interface HospitalImportCsvProps {
  existingHospitais: Hospital[]
  onImportComplete: () => Promise<void> | void
}

/**
 * Robust RFC 4180 compliant CSV line parser with support for quotes and delimiters
 */
function parseCsvLine(text: string, delimiter: string): string[] {
  const result: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped double quote
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }
  result.push(cell.trim())
  return result
}

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) || []).length
  const semicolonCount = (headerLine.match(/;/g) || []).length
  const tabCount = (headerLine.match(/\t/g) || []).length

  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';'
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t'
  return ','
}

function normalizeTipo(rawTipo: string): HospitalTipo | null {
  if (!rawTipo) return null
  const cleaned = rawTipo.trim()
  if (!cleaned) return null

  // Direct exact match
  const direct = VALID_TIPOS.find((t) => t.toLowerCase() === cleaned.toLowerCase())
  if (direct) return direct

  // Flexible accents & slug matches
  const normalized = cleaned
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized === 'hospital geral' || normalized === 'geral') {
    return 'Hospital Geral'
  }
  if (normalized === 'hospital especializado' || normalized === 'especializado') {
    return 'Hospital Especializado'
  }
  if (
    normalized === 'hospital dia' ||
    normalized === 'hospitaldia' ||
    normalized === 'dia'
  ) {
    return 'Hospital-Dia'
  }

  return null
}

export function HospitalImportCsv({
  existingHospitais,
  onImportComplete,
}: HospitalImportCsvProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [importResult, setImportResult] = useState<ImportSummary | null>(null)

  // Fast map lookup by normalized CNES
  const existingByCnes = useMemo(() => {
    const map = new Map<string, Hospital>()
    existingHospitais.forEach((h) => {
      const clean = h.cnes ? h.cnes.replace(/\D/g, '').trim() : ''
      if (clean) {
        map.set(clean, h)
      }
      // Also map exact string value
      if (h.cnes && h.cnes.trim()) {
        map.set(h.cnes.trim(), h)
      }
    })
    return map
  }, [existingHospitais])

  const processCsvContent = useCallback(
    (text: string, name: string, size: number) => {
      setIsParsing(true)
      setFileError(null)
      setImportResult(null)
      setFileName(name)
      setFileSize(size)

      try {
        // Remove UTF-8 BOM if present
        const cleanText = text.replace(/^\uFEFF/, '')
        const lines = cleanText
          .split(/\r\n|\n|\r/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)

        if (lines.length === 0) {
          setFileError('O arquivo CSV está vazio. Adicione dados e tente novamente.')
          setParsedRows([])
          setIsParsing(false)
          return
        }

        const delimiter = detectDelimiter(lines[0])
        const rawHeaders = parseCsvLine(lines[0], delimiter).map((h) =>
          h.toLowerCase().trim().replace(/['"]/g, ''),
        )

        // Check for missing required headers
        const missingHeaders = REQUIRED_HEADERS.filter(
          (req) => !rawHeaders.includes(req),
        )

        if (missingHeaders.length > 0) {
          setFileError(
            `Cabeçalhos obrigatórios ausentes no CSV: ${missingHeaders.join(
              ', ',
            )}. O arquivo precisa conter as seguintes colunas: nome, municipio, cnes, cnpj, cnpj_mantenedora, tipo.`,
          )
          setParsedRows([])
          setIsParsing(false)
          return
        }

        // Map column names to index positions
        const headerIndices: Record<string, number> = {}
        REQUIRED_HEADERS.forEach((req) => {
          headerIndices[req] = rawHeaders.indexOf(req)
        })

        if (lines.length === 1) {
          setFileError(
            'O arquivo contém apenas o cabeçalho e nenhuma linha de dados para importação.',
          )
          setParsedRows([])
          setIsParsing(false)
          return
        }

        const rows: ParsedCsvRow[] = []
        // Track CNES within the CSV to detect duplicate rows in the same file
        const seenCsvCnes = new Map<string, number>()

        for (let i = 1; i < lines.length; i++) {
          const rowNumber = i + 1
          const cells = parseCsvLine(lines[i], delimiter)

          // Skip completely blank rows that might have commas only
          const hasContent = cells.some((c) => c.trim().length > 0)
          if (!hasContent) continue

          const rowErrors: string[] = []

          const nome = cells[headerIndices.nome]?.trim() || ''
          const municipio = cells[headerIndices.municipio]?.trim() || ''
          const rawCnes = cells[headerIndices.cnes]?.trim() || ''
          const cnpj = cells[headerIndices.cnpj]?.trim() || ''
          const cnpj_mantenedora =
            cells[headerIndices.cnpj_mantenedora]?.trim() || ''
          const rawTipo = cells[headerIndices.tipo]?.trim() || ''

          // Validation
          if (!nome) {
            rowErrors.push('O campo "nome" é obrigatório.')
          }

          if (!municipio) {
            rowErrors.push('O campo "municipio" é obrigatório.')
          }

          if (!rawCnes) {
            rowErrors.push('O campo "cnes" é obrigatório.')
          }

          // Validate CNES format (7 digits)
          const cleanCnesDigits = rawCnes.replace(/\D/g, '')
          if (rawCnes && cleanCnesDigits.length === 0) {
            rowErrors.push('CNES inválido.')
          }

          // Check duplicate within the same CSV
          if (cleanCnesDigits) {
            if (seenCsvCnes.has(cleanCnesDigits)) {
              const prevRow = seenCsvCnes.get(cleanCnesDigits)
              rowErrors.push(
                `CNES duplicado no arquivo (já apareceu na linha ${prevRow}).`,
              )
            } else {
              seenCsvCnes.set(cleanCnesDigits, rowNumber)
            }
          }

          // Validate Tipo against allowed select values
          let validatedTipo: HospitalTipo | '' = ''
          if (rawTipo) {
            const matched = normalizeTipo(rawTipo)
            if (matched) {
              validatedTipo = matched
            } else {
              rowErrors.push(
                `Tipo "${rawTipo}" inválido. Permitidos: Hospital Geral, Hospital Especializado, Hospital-Dia.`,
              )
            }
          }

          // Compare CNES with already registered hospitals
          let status: 'new' | 'update' | 'invalid' = 'new'
          let existingHospitalId: string | undefined
          let existingHospitalName: string | undefined

          if (rowErrors.length > 0) {
            status = 'invalid'
          } else {
            const foundHospital =
              existingByCnes.get(cleanCnesDigits) || existingByCnes.get(rawCnes)

            if (foundHospital) {
              status = 'update'
              existingHospitalId = foundHospital.id
              existingHospitalName = foundHospital.nome
            } else {
              status = 'new'
            }
          }

          rows.push({
            rowNumber,
            nome,
            municipio,
            cnes: cleanCnesDigits || rawCnes,
            cnpj,
            cnpj_mantenedora,
            tipo: validatedTipo,
            rawTipo,
            status,
            errors: rowErrors,
            existingHospitalId,
            existingHospitalName,
          })
        }

        if (rows.length === 0) {
          setFileError(
            'Nenhuma linha de dados válida foi encontrada após a leitura do arquivo.',
          )
        }

        setParsedRows(rows)
      } catch (err) {
        console.error('Erro no processamento do CSV:', err)
        setFileError(
          'Falha ao ler o arquivo CSV. Certifique-se de que é um arquivo de texto válido codificado em UTF-8.',
        )
        setParsedRows([])
      } finally {
        setIsParsing(false)
      }
    },
    [existingByCnes],
  )

  const handleFileSelect = (file: File) => {
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setFileError('Por favor selecione um arquivo com extensão .csv')
      setParsedRows([])
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      processCsvContent(content, file.name, file.size)
    }
    reader.onerror = () => {
      setFileError('Erro ao carregar o arquivo do disco.')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleReset = () => {
    setFileName(null)
    setFileSize(null)
    setParsedRows([])
    setFileError(null)
    setImportResult(null)
    setImportProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Count metrics for preview
  const counts = useMemo(() => {
    let newCount = 0
    let updateCount = 0
    let invalidCount = 0

    parsedRows.forEach((r) => {
      if (r.status === 'new') newCount++
      else if (r.status === 'update') updateCount++
      else if (r.status === 'invalid') invalidCount++
    })

    return {
      total: parsedRows.length,
      newCount,
      updateCount,
      invalidCount,
      validTotal: newCount + updateCount,
    }
  }, [parsedRows])

  // Execute actual import
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.status !== 'invalid')
    if (validRows.length === 0) {
      toast({
        title: 'Nenhuma linha válida',
        description: 'Corrija os erros do arquivo antes de importar.',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: validRows.length })

    let createdCount = 0
    let updatedCount = 0
    let errorsCount = 0
    const details: {
      nome: string
      cnes: string
      action: 'created' | 'updated'
    }[] = []

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      setImportProgress({ current: i + 1, total: validRows.length })

      try {
        if (row.status === 'update' && row.existingHospitalId) {
          await hospitaisService.update(row.existingHospitalId, {
            nome: row.nome,
            municipio: row.municipio,
            cnes: row.cnes,
            cnpj: row.cnpj,
            cnpj_mantenedora: row.cnpj_mantenedora,
            tipo: row.tipo,
          })
          updatedCount++
          details.push({
            nome: row.nome,
            cnes: row.cnes,
            action: 'updated',
          })
        } else {
          await hospitaisService.create({
            nome: row.nome,
            municipio: row.municipio,
            cnes: row.cnes,
            cnpj: row.cnpj,
            cnpj_mantenedora: row.cnpj_mantenedora,
            tipo: row.tipo,
          })
          createdCount++
          details.push({
            nome: row.nome,
            cnes: row.cnes,
            action: 'created',
          })
        }
      } catch (err) {
        console.error(`Erro ao importar linha ${row.rowNumber} (${row.nome}):`, err)
        errorsCount++
      }
    }

    setIsImporting(false)
    setImportProgress(null)

    const summary: ImportSummary = {
      createdCount,
      updatedCount,
      totalProcessed: createdCount + updatedCount,
      errorsCount,
      details,
    }

    setImportResult(summary)

    // Notify parent to refresh hospitals list
    await onImportComplete()

    toast({
      title: 'Importação concluída!',
      description: `${createdCount} novos hospitais criados e ${updatedCount} atualizados.`,
    })
  }

  // Download example CSV template
  const handleDownloadTemplate = () => {
    const csvContent =
      'nome,municipio,cnes,cnpj,cnpj_mantenedora,tipo\n' +
      'Hospital Regional Darcy Vargas,Rio Bonito,2296306,30.123.456/0001-90,30.123.456/0001-90,Hospital Geral\n' +
      'Instituto de Cardiologia do Estado,Niterói,2269880,12.345.678/0001-00,12.345.678/0001-00,Hospital Especializado\n' +
      'Centro Cirúrgico Dia Santa Clara,São Gonçalo,7654321,98.765.432/0001-11,,Hospital-Dia\n'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'modelo_importacao_hospitais.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white rounded-xl border border-[#DDE5DF] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E6F4EE] flex items-center justify-center text-[#0B6E4F]">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-[#14201A]">
                Importação em Lote via CSV
              </h2>
            </div>
            <p className="text-sm text-[#5C6B63] max-w-2xl leading-relaxed">
              Carregue uma planilha CSV com a relação de hospitais. O sistema
              faz a pré-visualização completa, compara o <strong>CNES</strong> com os
              registros existentes e indica quais unidades serão criadas ou
              atualizadas antes de gravar.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="border-[#DDE5DF] hover:bg-[#E6F4EE] hover:text-[#0B6E4F] text-[#14201A] text-xs font-semibold shrink-0 h-9"
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5 text-[#0B6E4F]" />
            Baixar modelo CSV
          </Button>
        </div>

        {/* Expected format requirements pill box */}
        <div className="mt-4 pt-4 border-t border-[#DDE5DF]/70 text-xs text-[#5C6B63] grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#F4F7F4]/60 p-3.5 rounded-lg">
          <div>
            <span className="font-semibold text-[#14201A] block mb-1">
              Colunas obrigatórias no cabeçalho:
            </span>
            <code className="text-[#0B6E4F] bg-white px-2 py-0.5 rounded border border-[#DDE5DF] inline-block font-mono text-[11px]">
              nome, municipio, cnes, cnpj, cnpj_mantenedora, tipo
            </code>
          </div>
          <div>
            <span className="font-semibold text-[#14201A] block mb-1">
              Valores permitidos para a coluna tipo:
            </span>
            <span className="text-[#3A4B43]">
              <code className="bg-white px-1.5 py-0.5 rounded border border-[#DDE5DF] text-[11px] font-mono mr-1">
                Hospital Geral
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-[#DDE5DF] text-[11px] font-mono mr-1">
                Hospital Especializado
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-[#DDE5DF] text-[11px] font-mono">
                Hospital-Dia
              </code>
            </span>
          </div>
        </div>
      </div>

      {/* Success Summary Banner if import finished */}
      {importResult && (
        <div className="bg-[#E6F4EE] border border-[#0B6E4F]/30 rounded-xl p-6 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#0B6E4F] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#0B6E4F]">
                  Importação concluída com sucesso!
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="border-[#0B6E4F]/40 text-[#0B6E4F] bg-white hover:bg-[#0B6E4F] hover:text-white h-8 text-xs font-semibold"
                >
                  Importar outro arquivo
                </Button>
              </div>

              <p className="text-sm text-[#14201A]">
                O processamento do arquivo foi finalizado. Veja os resultados:
              </p>

              {/* Stats badges */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <div className="bg-white px-3 py-1.5 rounded-lg border border-[#0B6E4F]/20 flex items-center gap-2">
                  <span className="text-xs text-[#5C6B63]">Novos cadastrados:</span>
                  <Badge className="bg-[#0B6E4F] text-white font-bold text-xs px-2 py-0.5">
                    +{importResult.createdCount} criados
                  </Badge>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-[#0B6E4F]/20 flex items-center gap-2">
                  <span className="text-xs text-[#5C6B63]">Hospitais atualizados:</span>
                  <Badge className="bg-[#2E6F9E] text-white font-bold text-xs px-2 py-0.5">
                    {importResult.updatedCount} atualizados
                  </Badge>
                </div>
                {importResult.errorsCount > 0 && (
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-red-200 flex items-center gap-2">
                    <span className="text-xs text-red-700">Falhas ao gravar:</span>
                    <Badge variant="destructive" className="font-bold text-xs px-2 py-0.5">
                      {importResult.errorsCount} erros
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Drop Zone (Hidden if file is parsed and not imported yet) */}
      {parsedRows.length === 0 && !importResult && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200
            ${
              isDragging
                ? 'border-[#0B6E4F] bg-[#E6F4EE]/60 scale-[0.99]'
                : 'border-[#DDE5DF] hover:border-[#0B6E4F]/60 bg-white hover:bg-[#F4F7F4]/50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0])
              }
            }}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-full bg-[#E6F4EE] flex items-center justify-center text-[#0B6E4F] mx-auto mb-4 shadow-sm">
            <UploadCloud className="w-8 h-8 stroke-[1.8]" />
          </div>

          <h3 className="text-base font-bold text-[#14201A] mb-1">
            Clique para selecionar ou arraste o arquivo CSV até aqui
          </h3>
          <p className="text-xs text-[#5C6B63] max-w-md mx-auto mb-5">
            Suporta arquivos .csv com separador por vírgula (,) ou ponto-e-vírgula (;) codificados em UTF-8.
          </p>

          <Button
            type="button"
            className="bg-[#0B6E4F] hover:bg-[#095A41] text-white shadow-sm font-semibold pointer-events-none"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Selecionar arquivo CSV
          </Button>
        </div>
      )}

      {/* Error Alert for File Parse Failures */}
      {fileError && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="font-bold text-sm">Problema ao ler o CSV</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed mt-1">
            {fileError}
          </AlertDescription>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="border-red-300 text-red-800 hover:bg-red-100 h-8 text-xs font-semibold"
            >
              Tentar outro arquivo
            </Button>
          </div>
        </Alert>
      )}

      {/* Preview Section when rows are parsed */}
      {parsedRows.length > 0 && !importResult && (
        <div className="space-y-4">
          {/* Action and Metrics Summary Header */}
          <div className="bg-white rounded-xl border border-[#DDE5DF] p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-[#14201A]">
                    Pré-visualização do arquivo:
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#0B6E4F] bg-[#E6F4EE] px-2.5 py-1 rounded-md border border-[#0B6E4F]/20">
                    {fileName}
                  </span>
                  {fileSize && (
                    <span className="text-xs text-[#5C6B63]">
                      ({(fileSize / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                {/* Badge counters */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-[#5C6B63]">
                    Total no arquivo: <strong>{counts.total}</strong> linhas
                  </span>
                  <span className="text-[#DDE5DF]">•</span>
                  <Badge className="bg-[#0B6E4F] text-white hover:bg-[#0B6E4F] text-[11px] font-semibold">
                    {counts.newCount} novos hospitais
                  </Badge>
                  <Badge className="bg-[#2E6F9E] text-white hover:bg-[#2E6F9E] text-[11px] font-semibold">
                    {counts.updateCount} existentes (atualização)
                  </Badge>
                  {counts.invalidCount > 0 && (
                    <Badge variant="destructive" className="text-[11px] font-semibold">
                      {counts.invalidCount} inválidos
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isImporting}
                  className="border-[#DDE5DF] text-[#5C6B63] hover:text-red-700 hover:bg-red-50 text-xs font-semibold h-10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Descartar
                </Button>

                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting || counts.validTotal === 0}
                  className="bg-[#0B6E4F] hover:bg-[#095A41] text-white shadow-sm font-semibold h-10 px-5 text-sm cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Importando ({importProgress?.current}/{importProgress?.total})...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar importação ({counts.validTotal})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Explanatory banner: nothing saved yet */}
            <div className="mt-4 pt-3 border-t border-[#DDE5DF] flex items-center gap-2 text-xs text-[#5C6B63]">
              <Info className="w-4 h-4 text-[#0B6E4F] shrink-0" />
              <span>
                <strong>Atenção:</strong> Nada foi salvo ainda. Revise a tabela de
                pré-visualização abaixo e clique em <strong>"Confirmar importação"</strong> para
                gravar as alterações no banco de dados.
              </span>
            </div>
          </div>

          {/* Table of Parsed Rows */}
          <div className="bg-white rounded-xl border border-[#DDE5DF] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto max-h-[520px]">
              <Table>
                <TableHeader className="bg-[#F4F7F4] sticky top-0 z-10">
                  <TableRow className="border-b border-[#DDE5DF]">
                    <TableHead className="w-12 text-center text-[11px] font-bold text-[#5C6B63]">
                      #
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-[#5C6B63] min-w-[160px]">
                      Ação prevista
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-[#5C6B63] min-w-[200px]">
                      Nome do hospital
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-[#5C6B63] min-w-[140px]">
                      Município
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-[#5C6B63] min-w-[100px]">
                      CNES
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-[#5C6B63] min-w-[130px]">
                      CNPJ
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-[#5C6B63] min-w-[140px]">
                      CNPJ Mantenedora
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-[#5C6B63] min-w-[130px]">
                      Tipo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => {
                    const isInvalid = row.status === 'invalid'
                    const isUpdate = row.status === 'update'
                    const isNew = row.status === 'new'

                    return (
                      <TableRow
                        key={row.rowNumber}
                        className={`
                          border-b border-[#DDE5DF]/80 text-xs transition-colors
                          ${
                            isInvalid
                              ? 'bg-red-50/70 hover:bg-red-50'
                              : isUpdate
                              ? 'bg-blue-50/40 hover:bg-blue-50/70'
                              : 'hover:bg-[#F4F7F4]/60'
                          }
                        `}
                      >
                        {/* Row Number */}
                        <TableCell className="text-center font-mono text-[11px] text-[#5C6B63]">
                          {row.rowNumber}
                        </TableCell>

                        {/* Status / Planned Action Badge */}
                        <TableCell>
                          {isNew && (
                            <Badge className="bg-[#E6F4EE] text-[#0B6E4F] border border-[#0B6E4F]/30 hover:bg-[#E6F4EE] font-semibold text-[11px] flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0B6E4F]" />
                              Novo hospital
                            </Badge>
                          )}

                          {isUpdate && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-[#E8F1F8] text-[#1E5F8A] border border-[#1E5F8A]/30 hover:bg-[#E8F1F8] font-semibold text-[11px] flex items-center gap-1 w-fit cursor-help">
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    Já existe — será atualizado
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs bg-[#14201A] text-white max-w-xs">
                                  CNES já cadastrado para: &ldquo;
                                  {row.existingHospitalName}&rdquo;. Os dados do cadastro
                                  serão sobrescritos com as informações desta linha.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {isInvalid && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="destructive"
                                    className="font-semibold text-[11px] flex items-center gap-1 w-fit cursor-help"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Inválido ({row.errors.length})
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs bg-red-900 text-white max-w-xs">
                                  <ul className="list-disc pl-3 space-y-0.5">
                                    {row.errors.map((err, idx) => (
                                      <li key={idx}>{err}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>

                        {/* Nome */}
                        <TableCell className="font-semibold text-[#14201A]">
                          {row.nome || (
                            <span className="text-red-500 italic">Vazio</span>
                          )}
                        </TableCell>

                        {/* Município */}
                        <TableCell className="text-[#3A4B43]">
                          {row.municipio || (
                            <span className="text-red-500 italic">Vazio</span>
                          )}
                        </TableCell>

                        {/* CNES */}
                        <TableCell className="font-mono text-[#14201A]">
                          {row.cnes || (
                            <span className="text-red-500 italic">Vazio</span>
                          )}
                        </TableCell>

                        {/* CNPJ */}
                        <TableCell className="font-mono text-[#5C6B63]">
                          {row.cnpj ? formatCNPJ(row.cnpj) : '—'}
                        </TableCell>

                        {/* CNPJ Mantenedora */}
                        <TableCell className="font-mono text-[#5C6B63]">
                          {row.cnpj_mantenedora
                            ? formatCNPJ(row.cnpj_mantenedora)
                            : '—'}
                        </TableCell>

                        {/* Tipo */}
                        <TableCell>
                          {row.tipo ? (
                            <Badge
                              variant="outline"
                              className="bg-white border-[#DDE5DF] text-[#14201A] font-normal text-[11px]"
                            >
                              {row.tipo}
                            </Badge>
                          ) : row.rawTipo ? (
                            <span className="text-red-600 text-[11px] font-medium">
                              {row.rawTipo} (inválido)
                            </span>
                          ) : (
                            <span className="text-[#8E9D94] text-[11px]">Não inf.</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
