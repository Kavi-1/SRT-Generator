import argparse
import os
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
    segments_iter, info = model.transcribe(
        video_path,
        language=None,   # auto-detect
        beam_size=5,
    )
    segments = list(segments_iter)
    print(f"Language: {info.language} (p={info.language_probability:.2f}), segments={len(segments)}")
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

def main():
    parser = argparse.ArgumentParser(description="Auto-generate captions (SRT file) for short videos.")
    parser.add_argument("video", help="Input video (mp4/mov/mkv)")
    parser.add_argument("--out", default="out", help="Output directory (default: out)")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    base = Path(args.video).stem
    srt_path = os.path.join(args.out, f"{base}.srt")

    segments, _ = transcribe(args.video, model_size="small", device="cpu")
    write_srt(segments, srt_path)

    print("Done.")


if __name__ == "__main__":
    main()
