FROM mcr.microsoft.com/playwright/python:v1.51.0-noble

WORKDIR /scanner

COPY services/spa-scanner/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/spa-scanner/app.py .

ENV PYTHONUNBUFFERED=1
ENV PORT=8090

USER pwuser

EXPOSE 8090

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
