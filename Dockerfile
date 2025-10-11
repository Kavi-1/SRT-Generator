FROM python:3.10-slim
WORKDIR /app
RUN python -m venv /venv && /venv/bin/pip install --upgrade pip
COPY requirements.txt ./
RUN /venv/bin/pip install --no-cache-dir -r requirements.txt && /venv/bin/pip install fastapi uvicorn
COPY ./app ./app
COPY ./core ./core
COPY ./uploads ./uploads
COPY ./out ./out
EXPOSE 8000
CMD ["/venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
