import argparse
import os
from pathlib import Path
from core.transcriber import transcribe, write_srt

def main():
    parser = argparse.ArgumentParser(description="Auto-generate captions (SRT file) for short videos.")
    parser.add_argument("video", help="Input video (mp4/mov/mkv)")
    parser.add_argument("--out", default="out", help="Output directory (default: out)")
    parser.add_argument("--model", default="small", help="Whisper model size: tiny|base|small|medium|large")
    parser.add_argument("--device", default="cpu", help="CPU or CUDA (GPU)")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    base = Path(args.video).stem
    srt_path = os.path.join(args.out, f"{base}.srt")

    segments, _ = transcribe(args.video, model_size=args.model, device=args.device)
    write_srt(segments, srt_path)

    print("Done.")


if __name__ == "__main__":
    main()
