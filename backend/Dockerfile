FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HOME=/tmp HF_HOME=/tmp/huggingface TRANSFORMERS_CACHE=/tmp/huggingface
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr poppler-utils libmagic1 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY migrations ./migrations
RUN mkdir -p /app/var/private-uploads && chown -R 10001:10001 /app/var
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
