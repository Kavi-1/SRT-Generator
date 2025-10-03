FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install fastapi uvicorn

COPY ./app ./app
COPY ./core ./core
COPY ./uploads ./uploads
COPY ./out ./out

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
