export const SKILL_KEYS = [
  'clarity',
  'authenticity',
  'listening',
  'pace',
  'boundaries',
] as const

export type SkillKey = (typeof SKILL_KEYS)[number]

export const SKILL_LABELS: Record<SkillKey, string> = {
  clarity: '清晰',
  authenticity: '真诚',
  listening: '倾听',
  pace: '分寸',
  boundaries: '边界',
}

export type Difficulty = '入门' | '进阶' | '挑战'

export type StageKey =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'matched'
  | 'chatting'
  | 'first-date'
  | 'dating'

export const STAGE_LABELS: Record<StageKey, string> = {
  stranger: '陌生人',
  acquaintance: '熟人',
  friend: '朋友',
  matched: '刚匹配',
  chatting: '持续聊天',
  'first-date': '初次约会',
  dating: '稳定交往',
}

export type ChannelKey = 'offline' | 'instant' | 'voice' | 'date'

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  offline: '线下',
  instant: '即时消息',
  voice: '语音',
  date: '约会现场',
}

export type PurposeKey =
  | 'meet'
  | 'continue'
  | 'express'
  | 'invite'
  | 'clarify'
  | 'conflict'
  | 'end'
  | 'intimacy'

export const PURPOSE_LABELS: Record<PurposeKey, string> = {
  meet: '认识',
  continue: '续聊',
  express: '表达好感',
  invite: '邀约',
  clarify: '澄清关系',
  conflict: '处理冲突',
  end: '结束互动',
  intimacy: '亲密沟通',
}

export type StatusKey = 'positive' | 'insufficient' | 'cooling' | 'rejection'

export const STATUS_LABELS: Record<StatusKey, string> = {
  positive: '积极回应',
  insufficient: '信息不足',
  cooling: '回复冷淡',
  rejection: '明确拒绝',
}

export type OptionQuality = 'good' | 'ok' | 'risky'

export interface Character {
  id: string
  name: string
  age: number
  avatar: string
  tagline: string
}

export interface ScenarioChoice {
  id: string
  text: string
  quality: OptionQuality
  response: string
  strengths: string[]
  feelings: string
  deltas: Partial<Record<SkillKey, number>>
  keyChange: string
  boundaryNote?: string
  goesTo: string
}

export interface ScenarioNode {
  id: string
  characterMessage: string
  note?: string
  choices: ScenarioChoice[]
}

export type EndingTone = 'mutual' | 'neutral' | 'rejection' | 'safe-stop'

export interface ScenarioEnding {
  id: string
  title: string
  tone: EndingTone
  summary: string
  boundarySummary: string
  reviewQuestions: string[]
  realTask: string
}

export interface Scenario {
  id: string
  /** 内容审校状态：draft 不进入用户界面，reviewed 可发布 */
  reviewStatus?: ContentReviewStatus
  title: string
  summary: string
  durationMinutes: number
  difficulty: Difficulty
  stage: StageKey
  channel: ChannelKey
  purpose: PurposeKey
  status: StatusKey
  skills: SkillKey[]
  riskTags: string[]
  character: Character
  intro: string
  goal: string
  principles: string[]
  notRecommended: string[]
  startNodeId: string
  nodes: ScenarioNode[]
  endings: ScenarioEnding[]
}

export type SafetyCategory =
  | 'manipulation'
  | 'deception'
  | 'coercion'
  | 'harassment'
  | 'intoxication'
  | 'minor'
  | 'powerImbalance'
  | 'privacyViolation'
  | 'healthRisk'

export const SAFETY_CATEGORY_LABELS: Record<SafetyCategory, string> = {
  manipulation: '操控',
  deception: '欺骗',
  coercion: '强迫',
  harassment: '纠缠',
  intoxication: '醉酒',
  minor: '未成年人',
  powerImbalance: '权力差',
  privacyViolation: '隐私侵犯',
  healthRisk: '健康风险',
}

export type SafetyLevel = 'safe' | 'caution' | 'blocked'

export interface SafetyResult {
  level: SafetyLevel
  categories: SafetyCategory[]
  explanation: string
  safeAlternative: string
}

export type LabStatus = 'ok' | 'caution' | 'blocked'

export interface LabScores {
  clarity: number
  authenticity: number
  listening: number
  pace: number
  boundaries: number
}

export interface LabExample {
  tone: '直接' | '轻松' | '稳重'
  text: string
  why: string
}

export interface AnalyzeResult {
  status: LabStatus
  strengths: string[]
  concerns: string[]
  scores: LabScores
  rewritePrinciple: string
  examples: LabExample[]
  stopCondition: string
}

export interface LabContext {
  stage: StageKey
  purpose: PurposeKey
  responseStatus: StatusKey
}

export type ContentReviewStatus = 'draft' | 'reviewed'

export type ConsentSignalKey = 'green' | 'yellow' | 'red'

export interface ConsentSignal {
  id: ConsentSignalKey
  label: string
  meaning: string
  requiredResponse: string
  icon: 'check' | 'alert' | 'stop'
}

export interface PrivacyExample {
  context: string
  suggested: string
  avoid: string
  why: string
}

export interface PrivacyTopic {
  id: string
  title: string
  summary: string
  principles: string[]
  examples: PrivacyExample[]
  stopConditions: string[]
  reviewStatus: ContentReviewStatus
}

export type UserSettings = {
  isAdultConfirmed: boolean
  selectedChallenges: string[]
  onboardingCompleted: boolean
  reducedMotion: boolean
}

export type ProgressRecord = {
  scenarioId: string
  completedAt: string
  /** 已提交回应总数（预设选项 + 自由输入提交），重试不回退 */
  attempts: number
  /** 重试节点次数 */
  retryCount: number
  scores: Record<SkillKey, number>
  /** 本局是否曾出现边界违反（危险选项或被拦截的自由输入）；重试/改写不消除 */
  boundaryCheckPassed: boolean
  /** 曾出现越界但在反馈后完成正确修复（不覆盖越界事实） */
  resolvedAfterFeedback?: boolean
}

export type Reflection = {
  id: string
  scenarioId: string
  createdAt: string
  text: string
}

export interface StoredData {
  schemaVersion: number
  settings: UserSettings
  progress: ProgressRecord[]
  favorites: string[]
  reflections: Reflection[]
  trialSummaries?: TrialSummary[]
}

// ─── AI 试炼场 ───────────────────────────────────────────────

export type TrialMode = 'communication' | 'promptcraft'

export type TrialDifficulty = 'simple' | 'normal' | 'hard'

export type ApiProtocol = 'openai-compatible' | 'anthropic' | 'gemini'

export type TrialRoundLimit = number

export type TrialHardCheck =
  | { type: 'nonEmpty' }
  | { type: 'jsonObject'; requiredKeys: string[] }
  | { type: 'containsAll'; values: string[]; caseSensitive: boolean }
  | { type: 'maxChars'; max: number }
  | { type: 'safeCommunication' }

export interface TrialMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface TrialChallenge {
  id: string
  reviewStatus: ContentReviewStatus
  mode: TrialMode
  difficulty: TrialDifficulty
  title: string
  brief: string
  objective: string
  initialPrompt: string
  testInput?: string
  acceptanceCriteria: string[]
  hardChecks: TrialHardCheck[]
}

export interface TrialSummary {
  id: string
  challengeId: string
  mode: TrialMode
  difficulty: TrialDifficulty
  protocol: ApiProtocol
  model: string
  roundLimit: number
  roundsUsed: number
  hardScore: number
  selfScore: number | null
  completedAt: string
}

export interface TrialSessionRecord extends TrialSummary {
  upstreamHost: string
  challengeSnapshot: Omit<TrialChallenge, 'reviewStatus'>
  messages: TrialMessage[]
  hardCheckResults: Array<{ type: TrialHardCheck['type']; passed: boolean; explanation: string }>
  evaluation: TrialEvaluation | null
}

export interface TrialEvaluation {
  score: number
  strengths: string[]
  weaknesses: string[]
  nextAction: string
  disclaimer: 'model-self-evaluation'
}
