import type {
  AnalyzeResult,
  LabContext,
  LabScores,
  PurposeKey,
  StatusKey,
} from '@/types'
import { safetyCheck } from '@/lib/safety/safety'

// 文本中出现的明确拒绝/停止/拉黑信号，覆盖用户手动选择的“积极回应”状态
const TEXT_REFUSAL =
  /已经(拒绝|拉黑|说(了)?不)|明确(拒绝|说不)|不想(再见|见面|聊)|不再联系|不要再(联系|找我|发了)|把我拉黑|算了|到此为止|别(找|联系|再发)我/

const QUESTION_STORM = /\?\s*\?|？\s*？/
const QUESTION_MARKS = /[?？]/g
const TIME_PLACE = /明天|周末|周[一二三四五六日天]|几点|晚上|下午|上午|时间|地点|咖啡|公园|电影院|餐厅|饭|散步|哪里|哪家/
const REFUSAL_EXIT = /有空|方便|没关系|没事|看情况|随你|你来定|不方便也没事|拒绝|不勉强/
const DEMAND = /为什么(不|没)回|解释一下|到底什么意思|你给我说清楚/
const GUILT = /为你.*(做了|付出|等了)|你不(领情|珍惜)|我那么(用心|认真)/
const VAGUE = /^在吗[?？]?$|^约吗[?？]?$|^忙吗[?？]?$|^嗨[!！]?$/

// 按沟通目的给出的推荐结构（用于改写原则）
const STRUCTURE_HINTS: Record<PurposeKey, string> = {
  meet: '回应对方的话 + 一个自己的真实细节 + 一个开放问题',
  continue: '先回应对方上次的内容，再自然带出你自己的部分',
  express: '真实感受 + 具体欣赏点 + “你不需要现在回应”',
  invite: '具体时间 + 地点或活动 + “没空也没关系”的出口',
  clarify: '表达自己的感受 + 邀请对方分享 + 接受所有结果',
  conflict: '先表达自己的感受，再倾听对方，不抢话',
  end: '简短接受 + 停止推进 + 表达完整善意',
  intimacy: '直接询问当前行为 + 明确拒绝出口 + 随时可暂停',
}

function countQuestions(text: string): number {
  return (text.match(QUESTION_MARKS) ?? []).length
}

// 倾听判定：需要真正回应对方内容的表达，而不是文本里恰好出现“你”
const REPLY_AWARENESS =
  /你(有|没)(空|时间|事)|你(说|讲|提|觉得|最近|上次|那边|这边|周末)|您(说|觉得|有)|你.{0,4}[吗么呢]|您.{0,4}[吗么呢]|回应|接住/

function hasReplyAwareness(text: string): boolean {
  return REPLY_AWARENESS.test(text)
}

interface ExampleSpec {
  tone: '直接' | '轻松' | '稳重'
  text: string
  why: string
}

const PURPOSE_EXAMPLES: Record<PurposeKey, ExampleSpec[]> = {
  meet: [
    {
      tone: '直接',
      text: '你好，刚才听你聊起爬山，我也常去。如果方便的话，下次活动想叫你一起。',
      why: '一句话说清来意，具体、容易回答，也没有要求立刻答应。',
    },
    {
      tone: '轻松',
      text: '哈喽，刚才你说周末去爬山，是第一次去那条线吗？',
      why: '先接住对方的话题再互动，压力最小，答不答都自然。',
    },
    {
      tone: '稳重',
      text: '你好，我注意到你也喜欢户外。希望之后有机会一起走一条轻松的路线，你安排时间就好。',
      why: '把决定权完全交给对方，语气克制，适合关系还不熟悉的阶段。',
    },
  ],
  continue: [
    {
      tone: '直接',
      text: '你上次说的那家店，我后来去试了，还挺好。你说到的那道菜确实值得点。',
      why: '回应对方上次的具体内容，证明你真的在听，话题自然延续。',
    },
    {
      tone: '轻松',
      text: '哈哈你上次说的那件事，后来有下文吗？我还挺好奇的。',
      why: '用轻松的好奇心接话题，对方愿意说就说，不说也不尴尬。',
    },
    {
      tone: '稳重',
      text: '今天看到你提过的东西，想到你之前聊起过。最近忙吗？',
      why: '点到为止的关心，不追问细节，给对方充分的回应空间。',
    },
  ],
  express: [
    {
      tone: '直接',
      text: '我想直接说：我对你挺有好感，认识你以来聊天很舒服。你不需要现在回应我。',
      why: '表达真实感受，同时明确不给压力，也不需要对方当场答复。',
    },
    {
      tone: '轻松',
      text: '其实我最近在想，和你聊天比我想象中舒服，所以想让你知道。',
      why: '用轻松的口气说出真实感受，可进可退，不制造严肃场面。',
    },
    {
      tone: '稳重',
      text: '有些话我想认真说一次：我欣赏你这个人。你怎么想都可以，我都会尊重。',
      why: '郑重但不索取，明确把回应权完全交给对方。',
    },
  ],
  invite: [
    {
      tone: '直接',
      text: '周六下午那家咖啡店有不错的手冲，想去的话我们约 3 点见？没空的话完全没关系。',
      why: '时间、地点、活动都具体，还留了轻松的拒绝出口。',
    },
    {
      tone: '轻松',
      text: '周末天气不错，听说公园的花开了。你有空的话可以一起走走，没空就下次。',
      why: '邀请轻描淡写，去不去都没有压力。',
    },
    {
      tone: '稳重',
      text: '下周如果方便，想请你吃顿饭，地点你来定。以你的时间为准，不用勉强。',
      why: '把选择权交给对方，并明确表达不勉强。',
    },
  ],
  clarify: [
    {
      tone: '直接',
      text: '我想和你确认一下我们对彼此的看法，避免我误会。你可以直接告诉我你的想法。',
      why: '目的明确、语气平静，把澄清变成安全的对话而非逼问。',
    },
    {
      tone: '轻松',
      text: '最近我在想我们的关系状态，有点拿不准，想听听你的感觉。',
      why: '从自己的感受出发，邀请对方分享，不预设答案。',
    },
    {
      tone: '稳重',
      text: '如果我们对这段关系的期待不一样，我可以接受，也想听你亲口说。',
      why: '提前接受所有可能结果，让对方不需要顾虑你的反应。',
    },
  ],
  conflict: [
    {
      tone: '直接',
      text: '上次的事我想聊聊。我说说我的感受，然后听你说说你的。',
      why: '给出清晰结构：先表达自己，再倾听对方，不抢话。',
    },
    {
      tone: '轻松',
      text: '这两天我想了一下，那天我可能反应过头了。我们聊聊？',
      why: '先承认自己可能的问题，降低对方的防御。',
    },
    {
      tone: '稳重',
      text: '你愿意的话，我们找个安静的时间把那天的事说清楚。你怎么安排都行。',
      why: '尊重对方的节奏，把时间和方式的选择交给她。',
    },
  ],
  end: [
    {
      tone: '直接',
      text: '明白了，我尊重你的决定。我不会再联系你，祝你以后顺利。',
      why: '简短接受、停止推进，表达完整善意后收尾。',
    },
    {
      tone: '轻松',
      text: '好，收到。谢谢你之前坦诚告诉我，那就到这里，祝好。',
      why: '感谢对方的坦诚，平静地结束，不带情绪纠缠。',
    },
    {
      tone: '稳重',
      text: '我接受你的选择。你的联系方式我会删掉，不会再来打扰你。',
      why: '明确承诺停止联系，给对方确定性，也让自己收心。',
    },
  ],
  intimacy: [
    {
      tone: '直接',
      text: '我想确认一下，如果我们有进一步亲密接触，你希望怎么沟通安全和舒适的事？',
      why: '在行动之前把安全和舒适放到台面上，是成年人负责的做法。',
    },
    {
      tone: '轻松',
      text: '聊点认真的：亲密之前，你对避孕和节奏有什么习惯或想法吗？',
      why: '用轻松但不含糊的方式确认双方意愿和安排。',
    },
    {
      tone: '稳重',
      text: '我想先和你确认：我们都清醒、自愿，随时可以说停。你有什么底线或安排要先聊吗？',
      why: '主动确认同意条件并邀请对方设置边界，迟疑或沉默都按暂停处理。',
    },
  ],
}

export function analyzeMessage(context: LabContext, text: string): AnalyzeResult {
  const safety = safetyCheck(text)

  if (safety.level === 'blocked') {
    return {
      status: 'blocked',
      strengths: [],
      concerns: [safety.explanation],
      scores: { clarity: 0, authenticity: 0, listening: 0, pace: 0, boundaries: 0 },
      rewritePrinciple: '该内容不会提供改写建议。',
      examples: [],
      stopCondition: safety.safeAlternative,
    }
  }

  const concerns: string[] = []
  const strengths: string[] = []
  const scores: LabScores = { clarity: 78, authenticity: 78, listening: 78, pace: 78, boundaries: 78 }

  if (QUESTION_STORM.test(text) || countQuestions(text) >= 3) {
    concerns.push('连续提问或问号过密，读起来像盘问，对方容易越来越不想回答。')
    scores.clarity -= 16
    scores.listening -= 14
  }
  if (text.length > 100 && !hasReplyAwareness(text) && countQuestions(text) === 0) {
    concerns.push('大段自我输出，没有回应对方的内容或话题，对方感受不到被倾听。')
    scores.listening -= 22
    scores.authenticity -= 6
  }
  if (DEMAND.test(text)) {
    concerns.push('索取解释会放大对峙感。对方不回复本身就是信息，追问通常换来更远的距离。')
    scores.pace -= 16
    scores.boundaries -= 14
  }
  if (GUILT.test(text)) {
    concerns.push('强调付出、要求回应，会让对方感到亏欠和压力。')
    scores.boundaries -= 18
    scores.pace -= 10
  }
  if (VAGUE.test(text) || text.trim().length < 8) {
    concerns.push('内容过于简短模糊，对方不知道你想表达什么，也难以接话。')
    scores.clarity -= 14
    scores.authenticity -= 6
  }
  if (context.purpose === 'invite') {
    if (!TIME_PLACE.test(text)) {
      concerns.push('邀约缺少具体时间或地点，对方不知道是否可行，也很难给出明确答复。')
      scores.clarity -= 14
    }
    if (!REFUSAL_EXIT.test(text)) {
      concerns.push('邀约没有留出轻松的拒绝出口，对方答应会压力大，拒绝会难开口。')
      scores.pace -= 10
      scores.boundaries -= 10
    }
  }

  if (text.length <= 80) strengths.push('表达简短，不拖沓。')
  if (hasReplyAwareness(text)) strengths.push('有回应对方、与对方互动的意识。')
  if (TIME_PLACE.test(text)) strengths.push('内容具体，包含可操作的细节。')
  if (/^我/.test(text.trim())) strengths.push('从自己的真实感受出发，不编造对方。')
  if (countQuestions(text) === 1) strengths.push('提问克制，给对方留了表达空间。')
  if (REFUSAL_EXIT.test(text)) strengths.push('给对方留了容易拒绝的出口。')

  const hasAnyConcern = concerns.length > 0
  const scoreList = Object.values(scores)
  for (const key of Object.keys(scores) as (keyof LabScores)[]) {
    scores[key] = Math.max(20, Math.min(96, scores[key]))
  }

  const topConcern = hasAnyConcern ? concerns[0] : '整体表达自然，注意保持真实语气。'
  const rewritePrinciple = hasAnyConcern
    ? `优先修改：${topConcern}；推荐结构：${STRUCTURE_HINTS[context.purpose]}。`
    : `保留：${strengths.length > 0 ? strengths.slice(0, 2).join('、') : '整体自然'}；然后换成你自己的真实语气，不要照抄示例。`

  // 文本中出现明确拒绝信号时，覆盖用户可能误选的“积极回应”状态
  const effectiveStatus: StatusKey = TEXT_REFUSAL.test(text) ? 'rejection' : context.responseStatus

  // 对方已明确拒绝或要求停止时，不输出任何推进关系的示例，只给接受与停止的表达
  const rejectionExamples: ExampleSpec[] = PURPOSE_EXAMPLES.end.map((e) => ({
    ...e,
    why: `对方已拒绝或要求停止，不再推进任何安排。${e.why}`,
  }))

  const examples: ExampleSpec[] = effectiveStatus === 'rejection'
    ? rejectionExamples
    : safety.level === 'caution'
      ? PURPOSE_EXAMPLES[context.purpose].slice(0, 2).map((e) => ({
          ...e,
          why: `${e.why}（当前草稿存在边界风险，先参考这一版本）`,
        }))
      : [...PURPOSE_EXAMPLES[context.purpose]]

  const isRejection = effectiveStatus === 'rejection'

  return {
    status: isRejection ? 'caution' : safety.level === 'caution' ? 'caution' : hasAnyConcern ? 'caution' : 'ok',
    strengths: strengths.length > 0 ? strengths.slice(0, 4) : ['内容完整，没有明显问题。'],
    concerns: concerns.slice(0, 4),
    scores,
    rewritePrinciple,
    examples,
    stopCondition: stopConditionFor(effectiveStatus, scoreList),
  }
}

function stopConditionFor(status: StatusKey, _scores: number[]): string {
  switch (status) {
    case 'rejection':
      return '对方已表达拒绝或要求停止时，不再发送任何内容，这条消息就是最后一条。'
    case 'cooling':
      return '连续两条没有实质回复时，停止发送，先把注意力放回自己的事情上。'
    case 'insufficient':
      return '对方只回简短回应且不再提供新信息时，自然结束对话，不追问原因。'
    case 'positive':
      return '对方明确提出边界、改变主意或表示不适时，立即尊重并停止推进。'
  }
}
