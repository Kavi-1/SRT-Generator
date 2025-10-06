from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
from pathlib import Path
from faster_whisper import WhisperModel
from core.transcriber import write_srt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 
                   "http://127.0.0.1:5173", 
                   "https://srt-generator-two.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model_cache = {}

def get_model(model_size: str, device: str):
    compute_type = "float16" if device == "cuda" else "int8"
    key = (model_size, device, compute_type)
    if key not in _model_cache:
        print(f"Loading model: size={model_size}, device={device}, compute_type={compute_type}")
        _model_cache[key] = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _model_cache[key]

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
    # save video
    video_path = os.path.join(UPLOAD_DIR, video.filename)
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    m = get_model(model, device)
    
    # transcribe
    seg_iter, _info = m.transcribe(video_path, language=None, beam_size=5)
    segments = list(seg_iter)
    srt_path = os.path.join(OUT_DIR, f"{Path(video.filename).stem}.srt")
    
    write_srt(segments, srt_path)
    
    return FileResponse(srt_path, media_type="text/plain", filename=os.path.basename(srt_path))

@app.get("/")
def root():
    return {"message": "SRT Generator API. POST /generate_srt/ with a video file."}
