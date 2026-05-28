import { OllamaProvider } from './providers/ollama'
import type { AiProvider } from './providers/types'
import type { AssistantRuntimeIssueCode, AssistantRuntimeStatus } from './types'
import { existsSync, readdirSync, statSync } from 'fs'
import { spawn, type ChildProcess } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'

const STATUS_CACHE_TTL_MS = 5_000
const OLLAMA_BINARY_CANDIDATES = ['/opt/homebrew/bin/ollama', '/usr/local/bin/ollama']
const RUNTIME_BOOT_TIMEOUT_MS = 15_000
const STATUS_POLL_INTERVAL_MS = 300

let cachedStatus: AssistantRuntimeStatus | null = null
let cachedAt = 0
let managedRuntimeProcess: ChildProcess | null = null
let preferredModel: string | null = null

const provider: AiProvider = new OllamaProvider()

export function getAiProvider(): AiProvider {
  return provider
}

export async function getRuntimeStatus(forceRefresh = false): Promise<AssistantRuntimeStatus> {
  const now = Date.now()

  if (!forceRefresh && cachedStatus && now - cachedAt < STATUS_CACHE_TTL_MS) {
    return cachedStatus
  }

  const nextStatus = await buildRuntimeStatus()
  cachedStatus = nextStatus
  cachedAt = now
  return nextStatus
}

export function getPreferredModel(): string | null {
  return preferredModel
}

export function setPreferredModel(model: string): void {
  const normalizedModel = model.trim()
  preferredModel = normalizedModel || null
  resetStatusCache()
}

export function isRuntimeManagedByApp(): boolean {
  return Boolean(managedRuntimeProcess && !managedRuntimeProcess.killed)
}

export function canManageRuntime(): boolean {
  return getOllamaBinaryPath() !== null
}

function getOllamaBinaryPath(): string | null {
  return OLLAMA_BINARY_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function resetStatusCache(): void {
  cachedStatus = null
  cachedAt = 0
}

function buildRuntimeIssueStatus(params: {
  issueCode: AssistantRuntimeIssueCode
  state: AssistantRuntimeStatus['state']
  reason: string
  availableModels?: string[]
  latencyMs?: number | null
}): AssistantRuntimeStatus {
  return {
    state: params.state,
    available: false,
    provider: provider.name,
    model: null,
    selectedModel: getPreferredModel(),
    availableModels: params.availableModels ?? [],
    checkedAt: Date.now(),
    latencyMs: params.latencyMs ?? null,
    issueCode: params.issueCode,
    reason: params.reason,
  }
}

function collectManifestFiles(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return []
  }

  const entries = readdirSync(directoryPath)
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(directoryPath, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...collectManifestFiles(fullPath))
      continue
    }

    files.push(fullPath)
  }

  return files
}

function parseInstalledModelsFromFilesystem(): string[] {
  const manifestsRoot = join(homedir(), '.ollama', 'models', 'manifests')
  const manifestFiles = collectManifestFiles(manifestsRoot)

  return manifestFiles
    .map((manifestPath) => {
      const relativePath = manifestPath.replace(`${manifestsRoot}/`, '')
      const segments = relativePath.split('/').filter(Boolean)

      if (segments.length < 3) {
        return ''
      }

      const repoSegments = segments.slice(1, -1)
      const tag = segments[segments.length - 1]

      if (repoSegments.length === 0 || !tag) {
        return ''
      }

      const repository =
        repoSegments[0] === 'library' ? repoSegments.slice(1).join('/') : repoSegments.join('/')

      return repository ? `${repository}:${tag}` : ''
    })
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
}

async function buildRuntimeStatus(): Promise<AssistantRuntimeStatus> {
  const status = await provider.getStatus(getPreferredModel())
  const installedModels =
    status.availableModels.length > 0 ? status.availableModels : parseInstalledModelsFromFilesystem()

  if (status.state === 'missing_runtime' && getOllamaBinaryPath()) {
    return {
      ...status,
      selectedModel: getPreferredModel(),
      availableModels: installedModels,
      issueCode: 'not_running',
      reason: 'Ollama is installed on this Mac, but it is not running yet.',
    }
  }

  if (status.state === 'missing_runtime') {
    return {
      ...status,
      selectedModel: getPreferredModel(),
      availableModels: installedModels,
      issueCode: 'not_installed',
      reason: 'Ollama is not installed on this Mac.',
    }
  }

  return {
    ...status,
    selectedModel: status.selectedModel ?? getPreferredModel(),
    availableModels: installedModels,
  }
}

async function waitForRuntimeReady(timeoutMs: number): Promise<AssistantRuntimeStatus> {
  const startedAt = Date.now()
  let latestStatus: AssistantRuntimeStatus | null = null

  while (Date.now() - startedAt < timeoutMs) {
    const status = await getRuntimeStatus(true)
    latestStatus = status
    if (
      status.available ||
      status.state === 'missing_model' ||
      (status.state === 'error' && status.issueCode !== 'status_timeout')
    ) {
      return status
    }

    await delay(STATUS_POLL_INTERVAL_MS)
  }

  const installedModels = latestStatus?.availableModels ?? parseInstalledModelsFromFilesystem()

  return buildRuntimeIssueStatus({
    state: 'error',
    issueCode: 'start_timeout',
    reason: 'Ollama did not become ready in time.',
    availableModels: installedModels,
    latencyMs: Date.now() - startedAt,
  })
}

export async function startManagedRuntime(): Promise<AssistantRuntimeStatus> {
  if (isRuntimeManagedByApp()) {
    return getRuntimeStatus(true)
  }

  const binaryPath = getOllamaBinaryPath()

  if (!binaryPath) {
    resetStatusCache()
    return buildRuntimeIssueStatus({
      state: 'missing_runtime',
      issueCode: 'not_installed',
      reason: 'Ollama is not installed on this Mac.',
    })
  }

  const currentStatus = await getRuntimeStatus(true)
  if (currentStatus.state !== 'missing_runtime') {
    return currentStatus
  }

  const childProcess = spawn(binaryPath, ['serve'], {
    env: {
      ...process.env,
      OLLAMA_FLASH_ATTENTION: process.env.OLLAMA_FLASH_ATTENTION ?? '1',
      OLLAMA_KV_CACHE_TYPE: process.env.OLLAMA_KV_CACHE_TYPE ?? 'q8_0',
    },
    stdio: 'ignore',
  })

  managedRuntimeProcess = childProcess
  let startSettled = false

  const buildStartFailureStatus = (reason: string): AssistantRuntimeStatus =>
    buildRuntimeIssueStatus({
      state: 'error',
      issueCode: 'start_failed',
      reason,
      availableModels: parseInstalledModelsFromFilesystem(),
    })

  childProcess.once('exit', () => {
    managedRuntimeProcess = null
    resetStatusCache()
  })

  childProcess.once('error', () => {
    managedRuntimeProcess = null
    resetStatusCache()
  })

  const startFailure = new Promise<AssistantRuntimeStatus>((resolve) => {
    childProcess.once('error', (error) => {
      if (startSettled) {
        return
      }

      startSettled = true
      resolve(buildStartFailureStatus(error.message || 'Ollama could not be started.'))
    })

    childProcess.once('exit', (code, signal) => {
      if (startSettled) {
        return
      }

      startSettled = true
      const detail = signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`
      resolve(buildStartFailureStatus(`Ollama stopped during startup (${detail}).`))
    })
  })

  resetStatusCache()
  const readyStatus = await Promise.race([waitForRuntimeReady(RUNTIME_BOOT_TIMEOUT_MS), startFailure])
  startSettled = true
  return readyStatus
}

export async function stopManagedRuntime(): Promise<AssistantRuntimeStatus> {
  if (!managedRuntimeProcess) {
    return getRuntimeStatus(true)
  }

  const processToStop = managedRuntimeProcess
  managedRuntimeProcess = null
  processToStop.kill('SIGTERM')
  resetStatusCache()

  const startedAt = Date.now()
  while (Date.now() - startedAt < 5_000) {
    const status = await getRuntimeStatus(true)
    if (!status.available) {
      return status
    }

    await delay(STATUS_POLL_INTERVAL_MS)
  }

  return getRuntimeStatus(true)
}
