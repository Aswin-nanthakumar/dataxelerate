# URBANFLOW AI — AI Service (Python / FastAPI)
# Build from the REPO ROOT:  docker build -f ai-service/Dockerfile -t urbanflow-ai .
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN addgroup --system uf && adduser --system --ingroup uf uf
COPY ai-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ai-service/app ./app
USER uf
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
