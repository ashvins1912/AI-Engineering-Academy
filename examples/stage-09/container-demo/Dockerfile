# syntax=docker/dockerfile:1.7
# Builder stage: validate and byte-compile source without carrying build tools forward.
FROM python:3.11-slim AS builder
WORKDIR /build
COPY app.py ./app.py
RUN python -m py_compile app.py

# Runtime stage: minimal standard-library-only inference service.
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    MODEL_PATH=/app/model/model.json
WORKDIR /app
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --home-dir /nonexistent --shell /usr/sbin/nologin app
COPY --from=builder --chown=app:app /build/app.py /app/app.py
COPY --chown=app:app model/ /app/model/
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["python","-c","import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health/ready',timeout=2)"]
CMD ["python","-m","app"]
