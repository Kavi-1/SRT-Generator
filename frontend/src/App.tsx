import { useState, useEffect, useRef } from 'react'
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Paper,
  Stack,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Box,
} from '@mui/material'

const BACKEND_BASE = (import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000')
const normalizeBase = (url: string) => url.replace(/\/$/, '')

const theme = createTheme({
  palette: { mode: 'light', background: { default: '#f3f4f6' } },
  shape: { borderRadius: 14 },
})

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [model, setModel] = useState('tiny')
  const [device, setDevice] = useState<'cpu' | 'cuda'>('cpu')
  const [progress, setProgress] = useState(0)
  const [srt, setSrt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const timerRef = useRef<number | null>(null)

  const reset = () => { setSrt(''); setError(''); setProgress(0); setStatus(''); setElapsedMs(0) }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
    reset()
  }

  const upload = () => {
    if (!file || loading) return
    reset(); setLoading(true); setStatus('Uploading…')

    const form = new FormData()
    form.append('video', file)
    form.append('model', model)
    form.append('device', device)

    const start = performance.now()
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - start))
    }, 200)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${normalizeBase(BACKEND_BASE)}/generate_srt/`)
    xhr.responseType = 'blob'

    xhr.upload.onprogress = ev => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100)
        setProgress(pct)
        if (pct === 100) setStatus('Transcribing… (server)')
      }
    }
    xhr.onload = () => {
      setLoading(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setElapsedMs(Math.round(performance.now() - start))
      if (xhr.status === 200) {
        xhr.response.text().then((txt: string) => { setSrt(txt); setStatus('Done ✅') })
      } else {
        setError(`Error ${xhr.status}`); setStatus('Failed')
      }
    }
    xhr.onerror = () => {
      setLoading(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setError('Network error'); setStatus('Failed')
    }
    xhr.send(form)
  }

  const download = () => {
    if (!srt) return
    const blob = new Blob([srt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (file?.name?.replace(/\.[^.]+$/, '') || 'captions') + '.srt'
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    let cancelled = false
    setStatus('Checking API…')
    fetch(normalizeBase(BACKEND_BASE) + '/')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => { if (!cancelled) setStatus(data.message || 'API ready') })
      .catch(() => { if (!cancelled) setStatus('API unreachable') })
    return () => { cancelled = true }
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-dvh w-screen grid place-items-center">
        <Container maxWidth="md">
          <Paper elevation={6} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
            <Stack spacing={2} alignItems="center" textAlign="center">
              <Box>
                <Typography variant="h4" fontWeight={600}>SRT Generator</Typography>
                <Typography variant="body2" color="text.secondary">
                  FastAPI + faster-whisper subtitle creator
                </Typography>
              </Box>

              {/* Controls */}
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems="center"
                justifyContent="center"
                flexWrap="wrap"
              >
                {/* File input*/}
                <Button variant="contained" component="label">
                  Choose File
                  <input hidden type="file" accept="video/*" onChange={onFile} />
                </Button>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="model-label">Model</InputLabel>
                  <Select
                    labelId="model-label"
                    label="Model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="tiny">Tiny</MenuItem>
                    <MenuItem value="small">Small</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="device-label">Device</InputLabel>
                  <Select
                    labelId="device-label"
                    label="Device"
                    value={device}
                    onChange={(e) => setDevice(e.target.value as 'cpu' | 'cuda')}
                    disabled={loading}
                  >
                    <MenuItem value="cpu">CPU</MenuItem>
                    <MenuItem value="cuda">CUDA</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={upload}
                    disabled={!file || loading}
                  >
                    {loading ? 'Transcribing…' : 'Generate'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={download}
                    disabled={!srt}
                  >
                    Download
                  </Button>
                </Stack>
              </Stack>

              {/* Status */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              >
                Status: {status}{elapsedMs > 0 && <>&nbsp;{(elapsedMs / 1000).toFixed(1)}s</>}
              </Typography>

              {/* Progress */}
              {loading && (
                <Box sx={{ width: '100%', maxWidth: 500 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    {progress}% {progress === 100 ? '(processing transcription…)' : '(uploading)'}
                  </Typography>
                </Box>
              )}

              {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

              {/* Preview of SRT file */}
              {srt && (
                <Box
                  component="pre"
                  sx={{
                    width: '100%',
                    maxHeight: 420,
                    overflow: 'auto',
                    p: 2,
                    bgcolor: '#0f172a',
                    color: '#e2e8f0',
                    textAlign: 'left',
                    borderRadius: 1.5,
                    fontSize: 12,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                >
                  {srt}
                </Box>
              )}
            </Stack>
          </Paper>
        </Container>
      </div>
    </ThemeProvider>
  )
}

export default App
