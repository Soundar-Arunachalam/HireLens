FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir uv
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-27.1.1.tgz | tar zxvf - --strip-components=1 -C /usr/local/bin docker/docker \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
COPY app ./app
COPY tests ./tests
COPY migrate.py ./

RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
