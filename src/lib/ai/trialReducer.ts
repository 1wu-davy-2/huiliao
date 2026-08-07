import type { TrialMessage, TrialRoundLimit } from '@/types'

export type TrialPhase = 'setup' | 'running' | 'evaluating' | 'complete' | 'error'

export interface TrialState {
  phase: TrialPhase
  messages: TrialMessage[]
  roundLimit: TrialRoundLimit
  roundsUsed: number
  pendingRequestId: string | null
  hardScore: number
  errorCode: string | null
}

export type TrialAction =
  | { type: 'START'; roundLimit: TrialRoundLimit }
  | { type: 'SUBMIT'; requestId: string; content: string }
  | { type: 'MODEL_RESPONSE'; requestId: string; content: string }
  | { type: 'REQUEST_FAILED'; requestId: string; errorCode: string }
  | { type: 'CANCEL_REQUEST' }
  | { type: 'FINISH' }
  | { type: 'SET_HARD_SCORE'; score: number }
  | { type: 'EVALUATION_ERROR' }
  | { type: 'RESET' }

const MAX_MESSAGE_LENGTH = 8000

export function createInitialState(): TrialState {
  return {
    phase: 'setup',
    messages: [],
    roundLimit: 10,
    roundsUsed: 0,
    pendingRequestId: null,
    hardScore: 0,
    errorCode: null,
  }
}

function now(): string {
  return new Date().toISOString()
}

export function trialReducer(state: TrialState, action: TrialAction): TrialState {
  switch (action.type) {
    case 'START':
      return {
        ...createInitialState(),
        phase: 'running',
        roundLimit: action.roundLimit,
      }

    case 'SUBMIT': {
      if (state.phase !== 'running') return state
      if (state.pendingRequestId !== null) return state
      if (state.roundsUsed >= state.roundLimit) return state
      const trimmed = action.content.trim()
      if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return state

      return {
        ...state,
        pendingRequestId: action.requestId,
        messages: [
          ...state.messages,
          { role: 'user', content: trimmed, createdAt: now() },
        ],
      }
    }

    case 'MODEL_RESPONSE': {
      if (state.pendingRequestId !== action.requestId) return state
      const nextRounds = state.roundsUsed + 1
      const atCap = nextRounds >= state.roundLimit
      return {
        ...state,
        pendingRequestId: null,
        roundsUsed: nextRounds,
        phase: atCap ? 'evaluating' : state.phase,
        messages: [
          ...state.messages,
          { role: 'assistant', content: action.content, createdAt: now() },
        ],
      }
    }

    case 'REQUEST_FAILED': {
      if (state.pendingRequestId !== action.requestId) return state
      return {
        ...state,
        pendingRequestId: null,
        errorCode: action.errorCode,
        // 失败不增加轮数
      }
    }

    case 'CANCEL_REQUEST':
      return {
        ...state,
        pendingRequestId: null,
      }

    case 'FINISH':
      return {
        ...state,
        phase: 'evaluating',
        pendingRequestId: null,
      }

    case 'SET_HARD_SCORE':
      return {
        ...state,
        hardScore: Math.max(0, Math.min(100, Math.round(action.score))),
      }

    case 'EVALUATION_ERROR':
      return {
        ...state,
        phase: 'complete',
      }

    case 'RESET':
      return createInitialState()

    default:
      return state
  }
}
