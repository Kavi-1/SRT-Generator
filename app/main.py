
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
from pathlib import Path
from faster_whisper import WhisperModel
from core.transcriber import write_srt

app = FastAPI()

_origins_env = os.getenv("ALLOWED_ORIGINS")
cloudfront_domain_env = os.getenv("CLOUDFRONT_DOMAIN")

if _origins_env:
    allowed_origins = [o.strip().rstrip('/') for o in _origins_env.split(',') if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://srt-generator-two.vercel.app",
        "https://d3umgeg3bslilg.cloudfront.net",
    ]

if cloudfront_domain_env:
    cf_url = cloudfront_domain_env.strip()
    if cf_url and not cf_url.startswith('http'):
        cf_url = 'https://' + cf_url
    cf_url = cf_url.rstrip('/')
    allowed_origins.append(cf_url)


seen = set()
_deduped = []
for o in allowed_origins:
    if o not in seen:
        seen.add(o)
        _deduped.append(o)
allowed_origins = _deduped


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[startup] CORS allow_origins=", allowed_origins)

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
    video_path = os.path.join(UPLOAD_DIR, video.filename)
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    m = get_model(model, device)
    seg_iter, _info = m.transcribe(video_path, language=None, beam_size=5)
    segments = list(seg_iter)
    srt_path = os.path.join(OUT_DIR, f"{Path(video.filename).stem}.srt")
    write_srt(segments, srt_path)
    return FileResponse(srt_path, media_type="text/plain", filename=os.path.basename(srt_path))


@app.get("/")
def root():
    return {"message": "SRT Generator API. POST /generate_srt/ with a video file."}


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "cors_allow_origins": allowed_origins,
    }
