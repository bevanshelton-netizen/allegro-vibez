FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8787 \
    ALLEGRO_DATA_DIR=/var/lib/allegro-engine

WORKDIR /app
COPY engine.py /app/engine.py
RUN mkdir -p /var/lib/allegro-engine \
    && chown -R 10001:10001 /app /var/lib/allegro-engine
USER 10001:10001

EXPOSE 8787
VOLUME ["/var/lib/allegro-engine"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8787/healthz', timeout=2).read()" || exit 1

CMD ["python", "/app/engine.py"]
