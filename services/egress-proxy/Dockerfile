FROM python:3.12-slim

WORKDIR /proxy

COPY services/egress-proxy/proxy.py .

ENV PYTHONUNBUFFERED=1

RUN useradd --system --uid 10001 proxyuser

USER 10001

EXPOSE 3128

CMD ["python", "proxy.py"]
