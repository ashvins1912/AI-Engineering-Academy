# Stage 12 Topic 7 — Multimodal AI Systems

## Run locally

```bash
python examples/stage-12/multimodal_systems/multimodal_pipeline.py
python -m unittest discover -s examples/stage-12 -p 'test_multimodal_systems.py' -v
```

The pipeline uses synthetic OCR blocks, tables, transcripts, video frame timestamps and pre-extracted text. It does not call OCR, ASR, vision, audio or video models and does not access media files or hosted services.

## Evidence pipeline

1. Normalize OCR regions and reading order while preserving page and bounding boxes.
2. Preserve table rows/columns rather than flattening structure into ambiguous text.
3. Normalize transcript segments with start/end timestamps, speaker and confidence.
4. Sample video frames at a stable interval and align transcript spans to nearby frames within a tolerance.
5. Build evidence spans with modality, source reference, page/region or timestamp provenance.
6. Apply tenant/user/group ACLs before retrieval scoring and top-k.
7. Abstain when no authorized evidence meets the confidence threshold.

## Quality measures

- Word error rate (WER) for speech transcripts.
- Character error rate (CER) for OCR text.
- Confidence thresholds and low-confidence abstention.
- Timestamp alignment error and frame coverage.
- Citation provenance coverage by modality.
- Tenant and document ACL negative tests.

## Failure labs

- OCR reading-order or table-layout loss.
- Low-confidence OCR/transcription presented as fact.
- Audio timestamps or speaker attribution dropped.
- Video frame citations outside the alignment tolerance.
- Cross-tenant evidence returned by a multimodal search.
- Prompt injection embedded in an image, transcript or document treated as trusted instruction.

## Production gap analysis

A real deployment needs modality-specific model evaluation, OCR/ASR/vision versioning, data retention and consent controls, media malware scanning, region-level provenance, language/accent slices, diarization quality, frame-sampling policy, PII handling and secure media storage. The local pipeline validates metadata and evidence handling, not perception-model accuracy.
