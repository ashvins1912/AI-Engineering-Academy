import pytest
from app.ingestion import ExtractedPage, IngestionError, chunk_pages, extract_document

def test_chunking_keeps_page_provenance():
    pages = [ExtractedPage(2, "alpha beta gamma delta epsilon zeta")]
    chunks = chunk_pages(pages, max_chars=12, overlap=0)
    assert chunks and all(page == 2 for page, _ in chunks)
    assert "alpha" in chunks[0][1]

def test_rejects_empty_upload():
    with pytest.raises(IngestionError):
        extract_document("empty.pdf", "application/pdf", b"")

def test_rejects_mismatched_content_type():
    with pytest.raises(IngestionError):
        extract_document("doc.docx", "application/pdf", b"PK\x03\x04data")
