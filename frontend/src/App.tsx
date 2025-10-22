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
  Snackbar,
  Box,
} from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const BACKEND_BASE = (import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8000')
const normalizeBase = (url: string) => url.replace(/\/$/, '')

const theme = createTheme({
  palette: { mode: 'light', background: { default: '#f3f4f6' } },
  shape: { borderRadius: 14 },
})

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [model, setModel] = useState('tiny')
  const [device, setDevice] = useState<'cpu' | 'cuda'>('cpu')
  const [progress, setProgress] = useState(0)
  const [srt, setSrt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMsg, setSnackbarMsg] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success')
  const [status, setStatus] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const timerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fontStyle = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }

  const reset = () => { setSrt(''); setError(''); setProgress(0); setElapsedMs(0) }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
    reset()
    // setStatus(`${e.target.files?.[0]?.name}`)
    setStatus('File selected')
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) {
      setFile(f)
      reset()
      setStatus('File selected')
    }
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
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
        xhr.response.text().then((txt: string) => { setSrt(txt); setStatus('Done!') })
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

  const copySrt = async () => {
    if (!srt) return
    try {
      await navigator.clipboard.writeText(srt)
      setSnackbarMsg('Copied to clipboard')
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMsg('Failed to copy')
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
    }
  }

  useEffect(() => {
    let cancelled = false
    setStatus('Checking API…')
    fetch(normalizeBase(BACKEND_BASE) + '/')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => { if (!cancelled) setStatus(data.message || 'API ready') })
      .catch(() => { if (!cancelled) setStatus('API offline') })
    return () => { cancelled = true }
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-dvh w-screen grid place-items-center"
        style={{ background: 'linear-gradient(135deg, #1A2980 0%, #26D0CE 100%)' }}>
        <Container maxWidth="md">
          <Paper elevation={6}
            sx=
            {{
              p: { xs: 3, md: 5 },
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            }}>
            <Stack spacing={2} alignItems="center" textAlign="center">
              <Box>
                <Typography variant="h4" fontWeight={600}>SRT Generator</Typography>
                <Typography variant="body2" color="text.secondary">
                  {/* FastAPI + faster-whisper subtitle creator */}
                  Auto-generate subtitles using faster-whisper AI.
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
                {/* drag/drop file*/}
                <Box
                  sx={{
                    border: theme => `2px dashed ${theme.palette.divider}`,
                    p: 2,
                    px: 3,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: dragActive ? 'grey.100' : 'transparent',
                    minWidth: 220,
                    textAlign: 'center',
                  }}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      inputRef.current?.click()
                    }
                  }}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    ref={inputRef}
                    style={{ display: 'none' }}
                    type="file"
                    accept="video/*"
                    onChange={onFile}
                  />
                  {/* <Typography variant="button">{dragActive ? 'Drop file here' : 'Choose or drop a file'}</Typography> */}
                  {/* <Typography variant="caption" display="block" color="text.secondary">Accepts video files</Typography> */}
                  {file ? <Typography sx={fontStyle}>{file.name}</Typography>
                    : <><Typography variant="button">{dragActive ? 'Drop file here' : 'Choose or drop a file'}</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">Accepts video/audio files</Typography></>}
                </Box>

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
                    <MenuItem value="base">Base</MenuItem>
                    <MenuItem value="small">Small</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="large">Large</MenuItem>
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
                </Stack>
              </Stack>

              {/* {file && <Typography sx={fontStyle}>{file.name}</Typography>} */}

              {/* Status */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={fontStyle}
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
                <>
                  <div className="flex gap-2">
                    <Button
                      variant="outlined"
                      onClick={download}
                      disabled={!srt}
                      startIcon={<FileDownloadIcon sx={{ mr: -0.75 }} />}
                    >
                      Download
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={copySrt}
                      disabled={!srt}
                      startIcon={<ContentCopyIcon sx={{ mr: -0.75 }} />}
                    >
                      Copy
                    </Button>
                  </div>
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
                      ...fontStyle,
                    }}
                  >
                    {srt}
                  </Box>
                </>
              )}
              <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
                  {snackbarMsg}
                </Alert>
              </Snackbar>
            </Stack>
          </Paper>
        </Container>
      </div>
    </ThemeProvider>
  )
}

export default App