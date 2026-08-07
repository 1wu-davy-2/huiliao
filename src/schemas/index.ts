import { z } from 'zod'
import type { OptionQuality, SkillKey } from '@/types'

export const contentReviewStatusSchema = z.enum(['draft', 'reviewed'])

export const skillKeySchema = z.enum([
  'clarity',
  'authenticity',
  'listening',
  'pace',
  'boundaries',
])

export const stageSchema = z.enum([
  'stranger',
  'acquaintance',
  'friend',
  'matched',
  'chatting',
  'first-date',
  'dating',
])

export const channelSchema = z.enum(['offline', 'instant', 'voice', 'date'])

export const purposeSchema = z.enum([
  'meet',
  'continue',
  'express',
  'invite',
  'clarify',
  'conflict',
  'end',
  'intimacy',
])

export const statusSchema = z.enum(['positive', 'insufficient', 'cooling', 'rejection'])

export const difficultySchema = z.enum(['入门', '进阶', '挑战'])

export const optionQualitySchema: z.ZodType<OptionQuality> = z.enum(['good', 'ok', 'risky'])

export const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  age: z.number().int().min(18),
  avatar: z.string().min(1),
  tagline: z.string().min(1),
})

export const scenarioChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  quality: optionQualitySchema,
  response: z.string().min(1),
  strengths: z.array(z.string().min(1)),
  feelings: z.string().min(1),
  deltas: z.record(skillKeySchema, z.number().int().min(-30).max(30)).optional(),
  keyChange: z.string().min(1),
  boundaryNote: z.string().optional(),
  goesTo: z.string().min(1),
})

export const scenarioNodeSchema = z.object({
  id: z.string().min(1),
  characterMessage: z.string().min(1),
  note: z.string().optional(),
  choices: z.array(scenarioChoiceSchema).min(2).max(4),
})

export const endingToneSchema = z.enum(['mutual', 'neutral', 'rejection', 'safe-stop'])

export const scenarioEndingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tone: endingToneSchema,
  summary: z.string().min(1),
  boundarySummary: z.string().min(1),
  reviewQuestions: z.array(z.string().min(1)).min(2),
  realTask: z.string().min(1),
})

export const scenarioSchema = z.object({
  id: z.string().min(1),
  reviewStatus: contentReviewStatusSchema.optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  difficulty: difficultySchema,
  stage: stageSchema,
  channel: channelSchema,
  purpose: purposeSchema,
  status: statusSchema,
  skills: z.array(skillKeySchema).min(1),
  riskTags: z.array(z.string()),
  character: characterSchema,
  intro: z.string().min(1),
  goal: z.string().min(1),
  principles: z.array(z.string().min(1)).min(1),
  notRecommended: z.array(z.string().min(1)).min(1),
  startNodeId: z.string().min(1),
  nodes: z.array(scenarioNodeSchema).min(3),
  endings: z.array(scenarioEndingSchema).min(2),
})

export const settingsSchema = z.object({
  isAdultConfirmed: z.boolean(),
  selectedChallenges: z.array(z.string()).max(2),
  onboardingCompleted: z.boolean(),
  reducedMotion: z.boolean(),
})

export const progressRecordSchema = z.object({
  scenarioId: z.string().min(1),
  completedAt: z.string().min(1),
  attempts: z.number().int().nonnegative(),
  retryCount: z.number().int().nonnegative().default(0),
  scores: z.record(skillKeySchema, z.number().int().min(0).max(100)) as z.ZodType<
    Record<SkillKey, number>
  >,
  boundaryCheckPassed: z.boolean(),
  resolvedAfterFeedback: z.boolean().optional(),
})

export const reflectionSchema = z.object({
  id: z.string().min(1),
  scenarioId: z.string().min(1),
  createdAt: z.string().min(1),
  text: z.string(),
})

export const privacyExampleSchema = z.object({
  context: z.string().min(1),
  suggested: z.string().min(1),
  avoid: z.string().min(1),
  why: z.string().min(1),
})

export const consentSignalSchema = z.object({
  id: z.enum(['green', 'yellow', 'red']),
  label: z.string().min(1),
  meaning: z.string().min(1),
  requiredResponse: z.string().min(1),
  icon: z.enum(['check', 'alert', 'stop']),
})

export const privacyTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  principles: z.array(z.string().min(1)).min(1),
  examples: z.array(privacyExampleSchema).min(1),
  stopConditions: z.array(z.string().min(1)).min(1),
  reviewStatus: contentReviewStatusSchema,
})

export const storedDataSchema = z.object({
  schemaVersion: z.number().int().positive(),
  settings: settingsSchema,
  progress: z.array(progressRecordSchema),
  favorites: z.array(z.string()),
  reflections: z.array(reflectionSchema),
})

export type ParsedScenario = z.infer<typeof scenarioSchema>
