FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ALLEGRO_RADIO_DATA_DIR=/var/lib/allegro-radio ALLEGRO_RADIO_PORT=8788
WORKDIR /app
RUN groupadd --system radio && useradd --system --gid radio --home-dir /nonexistent radio \
    && mkdir -p /var/lib/allegro-radio && chown -R radio:radio /var/lib/allegro-radio
COPY --chown=radio:radio engine.py /app/engine.py
USER radio
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8788/healthz', timeout=2)"
CMD ["python", "/app/engine.py"]
