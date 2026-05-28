import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, readFile, rm } from 'fs/promises'
import { homedir, tmpdir } from 'os'
import { basename, join } from 'path'
import { promisify } from 'util'
import type { MeetingTranscriptionStatus } from '@preload/api'

const execFileAsync = promisify(execFile)
const TRANSCRIPTION_TIMEOUT_MS = 10 * 60 * 1000

const WHISPER_BINARY_CANDIDATES = [
  process.env.DUSTO_WHISPER_BINARY,
  '/opt/homebrew/bin/whisper-cli',
  '/usr/local/bin/whisper-cli',
  '/opt/homebrew/bin/whisper-cpp',
  '/usr/local/bin/whisper-cpp',
  '/opt/homebrew/bin/main',
  '/usr/local/bin/main',
].filter((candidate): candidate is string => Boolean(candidate))

const WHISPER_MODEL_CANDIDATES = [
  process.env.DUSTO_WHISPER_MODEL,
  join(homedir(), '.local', 'share', 'whisper.cpp', 'models', 'ggml-base.bin'),
  join(homedir(), '.local', 'share', 'whisper.cpp', 'models', 'ggml-base.en.bin'),
  join(homedir(), 'models', 'whisper.cpp', 'ggml-base.bin'),
  join(homedir(), 'models', 'whisper.cpp', 'ggml-base.en.bin'),
  join(homedir(), 'models', 'ggml-base.bin'),
  join(homedir(), 'models', 'ggml-base.en.bin'),
  '/opt/homebrew/share/whisper-cpp/models/ggml-base.bin',
  '/opt/homebrew/share/whisper-cpp/models/ggml-base.en.bin',
  '/usr/local/share/whisper-cpp/models/ggml-base.bin',
  '/usr/local/share/whisper-cpp/models/ggml-base.en.bin',
].filter((candidate): candidate is string => Boolean(candidate))

const FFMPEG_CANDIDATES = [
  process.env.DUSTO_FFMPEG_BINARY,
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/usr/bin/ffmpeg',
].filter((candidate): candidate is string => Boolean(candidate))

function firstExistingPath(candidates: string[]): string | null {
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function getBinaryPath(): string | null {
  return firstExistingPath(WHISPER_BINARY_CANDIDATES)
}

function getModelPath(): string | null {
  return firstExistingPath(WHISPER_MODEL_CANDIDATES)
}

function getConverterPath(): string | null {
  return firstExistingPath(FFMPEG_CANDIDATES)
}

export function getMeetingTranscriptionStatus(isBusy = false): MeetingTranscriptionStatus {
  const binaryPath = getBinaryPath()
  const modelPath = getModelPath()
  const converterPath = getConverterPath()

  if (isBusy) {
    return {
      state: 'busy',
      available: false,
      binaryPath,
      modelPath,
      converterPath,
      reason: 'A meeting transcription is already running.',
    }
  }

  if (!binaryPath) {
    return {
      state: 'missing_runtime',
      available: false,
      binaryPath,
      modelPath,
      converterPath,
      reason: 'Install whisper.cpp so Dusto can transcribe recordings locally.',
    }
  }

  if (!modelPath) {
    return {
      state: 'missing_model',
      available: false,
      binaryPath,
      modelPath,
      converterPath,
      reason: 'Add a whisper.cpp model file such as ggml-base.en.bin.',
    }
  }

  if (!converterPath) {
    return {
      state: 'missing_converter',
      available: false,
      binaryPath,
      modelPath,
      converterPath,
      reason: 'Install ffmpeg so Dusto can convert recordings before transcription.',
    }
  }

  return {
    state: 'ready',
    available: true,
    binaryPath,
    modelPath,
    converterPath,
    reason: null,
  }
}

function extractTranscriptionError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Local transcription failed.'
}

async function convertAudioToWav(
  converterPath: string,
  inputPath: string,
  outputPath: string
): Promise<void> {
  await execFileAsync(
    converterPath,
    ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', outputPath],
    { timeout: TRANSCRIPTION_TIMEOUT_MS }
  )
}

async function runWhisper(
  binaryPath: string,
  modelPath: string,
  wavPath: string,
  outputBasePath: string
): Promise<string> {
  const baseArgs = ['-m', modelPath, '-f', wavPath, '-otxt', '-of', outputBasePath, '-nt']

  try {
    await execFileAsync(binaryPath, baseArgs, { timeout: TRANSCRIPTION_TIMEOUT_MS })
  } catch (error) {
    const message = extractTranscriptionError(error)
    if (
      !message.includes('failed to allocate buffer') &&
      !message.toLowerCase().includes('metal')
    ) {
      throw error
    }

    await execFileAsync(binaryPath, ['-ng', ...baseArgs], { timeout: TRANSCRIPTION_TIMEOUT_MS })
  }

  const transcript = await readFile(`${outputBasePath}.txt`, 'utf8')
  return transcript.trim()
}

export async function transcribeMeetingAudio(audioPath: string): Promise<string> {
  const status = getMeetingTranscriptionStatus()
  if (!status.available || !status.binaryPath || !status.modelPath || !status.converterPath) {
    throw new Error(status.reason ?? 'Local transcription is not available.')
  }

  const workDirectory = join(tmpdir(), `dusto-transcription-${crypto.randomUUID()}`)
  const wavPath = join(workDirectory, `${basename(audioPath)}.wav`)
  const outputBasePath = join(workDirectory, 'transcript')

  await mkdir(workDirectory, { recursive: true })

  try {
    await convertAudioToWav(status.converterPath, audioPath, wavPath)
    return await runWhisper(status.binaryPath, status.modelPath, wavPath, outputBasePath)
  } catch (error) {
    throw new Error(extractTranscriptionError(error))
  } finally {
    await rm(workDirectory, { recursive: true, force: true })
  }
}
