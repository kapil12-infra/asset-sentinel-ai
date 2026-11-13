FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8091 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /runner

RUN groupadd --system pwuser \
    && useradd --system --gid pwuser \
       --create-home --home-dir /home/pwuser \
       --shell /usr/sbin/nologin pwuser \
    && mkdir -p /ms-playwright \
    && chown pwuser:pwuser /runner /home/pwuser

COPY services/qa-runner/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt \
    && python -m playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright \
    && rm -rf /root/.cache/pip /var/lib/apt/lists/*

COPY services/qa-runner/app.py .

RUN chown pwuser:pwuser /runner/app.py

USER pwuser

EXPOSE 8091

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8091"]
