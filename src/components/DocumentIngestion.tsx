import { useRef, useState } from 'react'
import { FileUp, FileText, Trash2, LoaderCircle, ShieldCheck, AlertCircle } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import * as mammoth from 'mammoth'

// Vite bundles the matching PDF.js worker with the application.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export type IngestedDocument = {
  id: string
  title: string
  text: string
  tags: string[]
  format: 'PDF' | 'DOCX'
  pages?: number
  words: number
}

type Props = {
  documents: IngestedDocument[]
  onAdd: (document: IngestedDocument) => void
  onRemove: (id: string) => void
}

const MAX_BYTES = 10 * 1024 * 1024
const MAX_PDF_PAGES = 50
const MAX_EXTRACTED_CHARS = 500_000

export default function DocumentIngestion({ documents, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      for (const file of Array.from(files)) {
        if (file.size === 0) throw new Error(`${file.name}: file is empty.`)
        if (file.size > MAX_BYTES) throw new Error(`${file.name}: exceeds the 10 MB per-file limit.`)
        const ext = file.name.toLowerCase().split('.').pop()
        if (ext !== 'pdf' && ext !== 'docx') throw new Error(`${file.name}: only PDF and DOCX files are supported.`)
        const buffer = await file.arrayBuffer()
        const signature = new Uint8Array(buffer.slice(0, 4))
        const isPdf = signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46
        const isZip = signature[0] === 0x50 && signature[1] === 0x4b && signature[2] === 0x03 && signature[3] === 0x04
        if (ext === 'pdf' && !isPdf) throw new Error(`${file.name}: file signature does not look like a PDF.`)
        if (ext === 'docx' && !isZip) throw new Error(`${file.name}: file signature does not look like a DOCX archive.`)

        let text = ''
        let pages: number | undefined
        if (ext === 'pdf') {
          const task = pdfjsLib.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false })
          const pdf = await task.promise
          pages = pdf.numPages
          if (pages > MAX_PDF_PAGES) {
            await pdf.destroy()
            throw new Error(`${file.name}: ${pages} pages exceeds the ${MAX_PDF_PAGES}-page limit.`)
          }
          const pageText: string[] = []
          try {
            for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
              const page = await pdf.getPage(pageNumber)
              const content = await page.getTextContent()
              const line = content.items.map(item => 'str' in item ? item.str : '').filter(Boolean).join(' ')
              pageText.push(`\n[Page ${pageNumber}]\n${line}`)
              if (pageText.join('').length > MAX_EXTRACTED_CHARS) throw new Error(`${file.name}: extracted text exceeds the 500,000-character safety limit.`)
            }
          } finally {
            await pdf.destroy()
          }
          text = pageText.join('\n').trim()
        } else {
          const result = await mammoth.extractRawText({ arrayBuffer: buffer })
          text = result.value.trim()
          if (text.length > MAX_EXTRACTED_CHARS) throw new Error(`${file.name}: extracted text exceeds the 500,000-character safety limit.`)
        }
        if (!text) throw new Error(`${file.name}: no selectable text was found. Scanned PDFs need an OCR step; this browser importer does not run OCR.`)
        const words = text.match(/\S+/g)?.length ?? 0
        const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        onAdd({ id, title: file.name, text, tags: [ext, 'user-upload'], format: ext === 'pdf' ? 'PDF' : 'DOCX', pages, words })
      }
      setNotice(`Imported ${files.length} file${files.length === 1 ? '' : 's'} successfully. Text is held in this browser session only.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not parse this file.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return <div className="document-ingestion">
    <div className="document-ingestion-head">
      <div><strong>Import real PDF and DOCX files</strong><p>Extract selectable text locally in your browser, then send it into the chunking and retrieval labs.</p></div>
      <button className="lab-primary" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? <><LoaderCircle size={14} className="spin"/> Parsing…</> : <><FileUp size={14}/> Choose files</>}</button>
      <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden onChange={e => void handleFiles(e.target.files)}/>
    </div>
    <div className="document-safety"><ShieldCheck size={15}/><span>Browser-only extraction · 10 MB/file · PDF up to 50 pages · extracted text capped at 500,000 characters · no upload to a server</span></div>
    {error && <div className="document-message error"><AlertCircle size={15}/>{error}</div>}
    {notice && <div className="document-message success"><FileText size={15}/>{notice}</div>}
    {documents.length > 0 && <div className="uploaded-documents">{documents.map(doc => <div className="uploaded-document" key={doc.id}><FileText size={17}/><div><strong>{doc.title}</strong><span>{doc.format} · {doc.words.toLocaleString()} words{doc.pages ? ` · ${doc.pages} pages` : ''}</span></div><button type="button" onClick={() => onRemove(doc.id)} aria-label={`Remove ${doc.title}`}><Trash2 size={15}/></button></div>)}</div>}
    <p className="document-note">DOCX tables are extracted as text; complex layout and embedded images are not preserved. Scanned PDFs require a separate OCR service or local OCR engine before indexing.</p>
  </div>
}
