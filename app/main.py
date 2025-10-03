from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
import shutil
import os
from pathlib import Path
from core.transcriber import transcribe, write_srt

app = FastAPI()

UPLOAD_DIR = "uploads"
OUT_DIR = "out"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)

@app.post("/generate_srt/")
def generate_srt(
    video: UploadFile = File(...),
    model: str = Form("small"),
    device: str = Form("cpu")
):
    # Save uploaded file
    video_path = os.path.join(UPLOAD_DIR, video.filename)
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    # Transcribe
    segments, _ = transcribe(video_path, model_size=model, device=device)
    # Write SRT to 'out' directory
    srt_path = os.path.join(OUT_DIR, f"{Path(video.filename).stem}.srt")
    write_srt(segments, srt_path)
    # Return SRT file
    return FileResponse(srt_path, media_type="text/plain", filename=os.path.basename(srt_path))

@app.get("/")
def root():
    return {"message": "SRT Generator API. POST /generate_srt/ with a video file."}
