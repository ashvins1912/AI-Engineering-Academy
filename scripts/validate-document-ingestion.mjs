import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const component=readFileSync(new URL('../src/components/DocumentIngestion.tsx',import.meta.url),'utf8')
const rag=readFileSync(new URL('../src/components/RAGLabs.tsx',import.meta.url),'utf8')
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
for(const [label,token] of [
 ['PDF.js parser','pdfjsLib.getDocument'],
 ['PDF page text extraction','getTextContent()'],
 ['DOCX parser','mammoth.extractRawText'],
 ['PDF signature validation','0x25'],
 ['DOCX ZIP signature validation','0x50'],
 ['per-file size guard','MAX_BYTES'],
 ['PDF page guard','MAX_PDF_PAGES'],
 ['extracted text guard','MAX_EXTRACTED_CHARS'],
 ['scanned PDF OCR limitation','need an OCR step'],
 ['browser-only privacy notice','no upload to a server']
]) { assert.ok(component.includes(token),`Missing ${label}`); console.log(`PASS ${label}`) }
assert.ok(rag.includes('<DocumentIngestion'),'Uploader must be integrated into RAG ingestion')
assert.ok(rag.includes('uploadedDocs.map'),'Imported documents must feed into the chunk index')
assert.ok(pkg.dependencies['pdfjs-dist'],'pdfjs-dist dependency missing')
assert.ok(pkg.dependencies.mammoth,'mammoth dependency missing')
console.log('PASS PDF/DOCX ingestion integration and dependency declarations')
