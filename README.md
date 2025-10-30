# SRT-Generator
FastAPI + faster-whisper subtitle generator with a modern React frontend. Upload a video, select model/device, and generate SRT subtitles easily.

[https://srt-generator-kavi.vercel.app/](https://srt-generator-kavi.vercel.app/)

## Motivation
I frequently edit videos in Adobe After Effects, but it lacks a built-in feature to automatically 
convert videos to SRT subtitle files for auto text generation. To streamline my workflow and save time 
on manually making text layres, I created this to generate SRT files automatically from video uploads.

### How to Run Locally (simplest/fastest way)
1. **Install and run** [Docker](https://www.docker.com/products/docker-desktop/)

2. Open a **shell** (Terminal on macOS, WSL/Git Bash/PowerShell on Windows) ensure Git is installed
   
3. **Clone the repository:**
```
git clone https://github.com/Kavi-1/SRT-Generator.git
```

4. **Navigate to the repository**
```
cd SRT-Generator
```

5. **Run:**
```
docker-compose up --build
```

6. **Open [http://localhost:5173](http://localhost:5173) in browser**


## Stack
Python • FastAPI • faster-whisper • Uvicorn • React • Typescript • Docker • Docker Compose •  AWS EC2 (used for deployment/testing)
