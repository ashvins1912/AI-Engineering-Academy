from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
import hashlib
import re
import zipfile
from docx import Document as DocxDocument
from pypdf import PdfReader
import pytesseract
from pdf2image import convert_from_bytes
from .config import get_settings

@dataclass
class ExtractedPage:
    number: int
    text: str
    ocr_used: bool = False

@dataclass
class ExtractedDocument:
    title: str
    media_type: str
    sha256: str
    pages: list[ExtractedPage]

class IngestionError(ValueError): pass

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def extract_document(filename: str, content_type: str, data: bytes) -> ExtractedDocument:
    cfg = get_settings()
    if not data or len(data) > cfg.max_upload_bytes:
        raise IngestionError("File is empty or exceeds upload limit")
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf" and content_type == "application/pdf":
        if not data.startswith(b"%PDF-"):
            raise IngestionError("Invalid PDF signature")
        try:
            reader = PdfReader(BytesIO(data), strict=True)
        except Exception as exc:
            raise IngestionError("PDF is malformed, encrypted or could not be parsed") from exc
        if len(reader.pages) > cfg.max_pdf_pages:
            raise IngestionError("PDF page limit exceeded")
        pages: list[ExtractedPage] = []
        ocr_pages = 0
        for index, page in enumerate(reader.pages, start=1):
            try:
                text = (page.extract_text() or "").strip()
            except Exception as exc:
                raise IngestionError(f"PDF text extraction failed on page {index}") from exc
            ocr_used = False
            if len(text) < 20 and cfg.ocr_enabled:
                ocr_pages += 1
                if ocr_pages > cfg.max_ocr_pages:
                    raise IngestionError(f"OCR page budget exceeded ({cfg.max_ocr_pages} pages)")
                images = convert_from_bytes(data, first_page=index, last_page=index, dpi=cfg.ocr_dpi, fmt="png", thread_count=1, timeout=60)
                if images:
                    text = pytesseract.image_to_string(images[0], lang=cfg.ocr_language, timeout=25).strip()
                    images[0].close()
                    ocr_used = True
            pages.append(ExtractedPage(index, text, ocr_used))
        media_type = "application/pdf"
    elif suffix == ".docx" and content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        if not data.startswith(b"PK\x03\x04"):
            raise IngestionError("Invalid DOCX signature")
        try:
            with zipfile.ZipFile(BytesIO(data)) as archive:
                entries = archive.infolist()
                if len(entries) > 5000 or sum(item.file_size for item in entries) > 30 * 1024 * 1024:
                    raise IngestionError("DOCX archive expands beyond safe parsing limits")
                if any(item.file_size > 15 * 1024 * 1024 for item in entries):
                    raise IngestionError("DOCX archive contains an oversized entry")
            doc = DocxDocument(BytesIO(data))
        except IngestionError:
            raise
        except Exception as exc:
            raise IngestionError("DOCX document could not be parsed") from exc
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                paragraphs.append(" | ".join(cell.text.strip() for cell in row.cells))
        pages = [ExtractedPage(1, "\n".join(paragraphs))]
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        raise IngestionError("Only PDF and DOCX documents are accepted")
    total = sum(len(p.text) for p in pages)
    if total > cfg.max_extracted_chars:
        raise IngestionError("Extracted text limit exceeded")
    if not any(p.text.strip() for p in pages):
        raise IngestionError("No text could be extracted; verify OCR availability for scanned PDFs")
    return ExtractedDocument(Path(filename).name[:255], media_type, sha256(data), pages)

def chunk_pages(pages: list[ExtractedPage], max_chars: int = 1400, overlap: int = 180) -> list[tuple[int, str]]:
    chunks: list[tuple[int, str]] = []
    for page in pages:
        words = re.findall(r"\S+", page.text)
        current: list[str] = []
        count = 0
        for word in words:
            if count + len(word) + 1 > max_chars and current:
                chunks.append((page.number, " ".join(current)))
                tail = " ".join(current)[-overlap:].split() if overlap else []
                current, count = tail, sum(len(w) + 1 for w in tail)
            current.append(word)
            count += len(word) + 1
        if current:
            chunks.append((page.number, " ".join(current)))
    return chunks
