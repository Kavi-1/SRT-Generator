import textwrap
from datetime import timedelta
from pathlib import Path

import srt
from faster_whisper import WhisperModel

def wrap_lines(text: str, width: int = 42, max_lines: int = 2) -> str:
    """keep captions readable"""
    text = " ".join((text or "").strip().split())
    if not text:
        return ""
    lines = textwrap.wrap(text, width=width)
    return "\n".join(lines[:max_lines]) if lines else ""

def transcribe(video_path: str, model_size: str = "small", device: str = "cpu"):
    """transcribe with faster-whisper"""
    compute_type = "float16" if device == "cuda" else "int8"
    print(f"Loading model: size={model_size}, device={device}, compute_type={compute_type}")
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    print("Transcribing...")
    segments_iter, info = model.transcribe(video_path, language=None, beam_size=5)
    segments = list(segments_iter)
    return segments, info

def write_srt(segments, srt_path: str, width: int = 42, max_lines: int = 2):
    """write segments into SRT file"""
    subs, idx = [], 1
    for seg in segments:
        start = timedelta(seconds=max(float(seg.start), 0.0))
        end = timedelta(seconds=max(float(seg.end), 0.0))
        text = wrap_lines(getattr(seg, "text", ""), width=width, max_lines=max_lines)
        if not text:
            continue
        subs.append(srt.Subtitle(index=idx, start=start, end=end, content=text))
        idx += 1
    Path(srt_path).write_text(srt.compose(subs), encoding="utf-8")
    print(f"Wrote SRT: {srt_path} ({len(subs)} captions)")