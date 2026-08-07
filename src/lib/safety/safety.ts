import type { SafetyCategory, SafetyLevel, SafetyResult } from '@/types'
import { normalizeInput } from './normalize'

/**
 * 安全分类器。
 *
 * 判定流程（优先级从高到低）：
 * 1. 空输入 → safe
 * 2. 硬拦截：未成年人、意识受影响、拒绝后继续、隐私侵犯、强迫、操控、欺骗、
 *    纠缠、权力差——任一命中即 blocked，返回风险解释与停止方向，不回显或补全危险步骤。
 * 3. 教育性讨论：仅当不存在执行意图时放行。
 * 4. caution 规则（单条提示，不拦截）。
 * 5. 其余 → safe。
 *
 * 所有判定基于“风险对象/状态 + 推进行为”的组合，不只依赖单个敏感词。
 */

interface DetectResult {
  category: SafetyCategory
  explanation: string
  safeAlternative: string
}

interface SafetyRule {
  category: SafetyCategory
  level: Exclude<SafetyLevel, 'safe'>
  patterns: RegExp[]
  explanation: string
  safeAlternative: string
}

const EDUCATIONAL_PATTERN =
  /为什么不能|为什么不该|为什么算|是否构成|是否违法|法律规定|法律上|如何避免|怎么识别|如何识别|这是不是|有什么需要注意|需要怎么处理|需要注意什么|怎样(和|与)|该不该|应不应该|应该(怎么|如何)|是否应该|为什么.{0,8}(违法|不允许|不行)/

// 教育性提问之外的执行意图：一旦出现，教育性检查不再放行
const EXECUTION_INTENT =
  /具体(怎么|如何)|怎么(做|灌|拍|录|说)|教我|教教我|隐蔽|不被发现|别被发现|才不会被发现|试一下|试试|马上|立刻|现在|今晚|带走|继续(推进|尝试|约|发|要)?$|想办法|找个机会|趁机|明天(再|就)去|我(想|要)(把|让|带|灌|拍|录|偷|约|试试|继续)|我(想|要).{0,4}(拍|录|灌|带走|约)/

// ---------- 状态与行为组合（硬拦截） ----------

const MINOR_AGE = /(1[0-7]|十三|十四|十五|十六|十七)岁/
const MINOR_HINT =
  /未成年|还没成年|没成年|未满\s*(18|十八)|不满\s*(18|十八)|没满\s*(18|十八)|没到\s*(18|十八)|不到\s*(1[78]|十七|十八)|高中生|初中生|小学生|未成年的/
const DATING_INTENT =
  /睡|开房|上床|发生关系|做爱|约炮|脱衣|发生亲密|亲她|摸她|想约|约她|约出去|约吗|表白|追她|谈恋爱|带她|喜欢她|在一起|处对象/

export function detectMinorContext(text: string): DetectResult | null {
  const minor = MINOR_AGE.test(text) || MINOR_HINT.test(text)
  if (!minor || !DATING_INTENT.test(text)) return null
  return {
    category: 'minor',
    explanation:
      '你描述的对象可能是未成年人。产品只服务 18 岁以上的成年人，不提供与未成年人有关的约会或亲密建议。',
    safeAlternative: '停止推进这段关系，不要把未成年人当作恋爱或亲密目标。',
  }
}

const IMPAIRED_STATE = /醉|喝多|不清醒|意识模糊|神志不清|昏沉|站不稳|摇晃|胡言乱语|重复说话|无法(清晰|清楚)?(表达|回应|说话)/
const ADVANCE_INTENT = /带(她|去)|带走|继续|推进|去(他|她|你)?(那|这)里|酒店|开房|上楼|趁|扶|睡|发生|亲(她|吻|一下)|吻(她)?|抱(她|一下)/
const FORCED_ALCOHOL = /灌(酒|醉|她)|把她灌/

export function detectImpairedConsent(text: string): DetectResult | null {
  const impaired = IMPAIRED_STATE.test(text) || FORCED_ALCOHOL.test(text)
  const advancing = ADVANCE_INTENT.test(text) || FORCED_ALCOHOL.test(text)
  if (!impaired || !advancing) return null
  return {
    category: 'intoxication',
    explanation:
      '对方饮酒、意识不清或无法清晰回应时，无法确认清醒、自主和明确同意。此时推进约会或亲密安排一律暂停。',
    safeAlternative: '停止推进。等对方清醒、能清晰表达意愿后再沟通；无法确认意愿时一律暂停。',
  }
}

const REFUSAL_WORDS = /不要|别(碰|动|来|再)|停(下|止)?|拒绝|回家|不舒服|不愿意|算了|到此为止|不想要|慢一点|不行|不愿意了/
const PUSH_AFTER_REFUSAL =
  /还是想|非要|硬要|强行|不死心|再试|坚持|也得|非得|带(她|去)|继续(推进|尝试|约|发|要)?$|等她(冷静|改变|答应)|追问|逼/

export function detectRefusalOverride(text: string): DetectResult | null {
  if (!REFUSAL_WORDS.test(text) || !PUSH_AFTER_REFUSAL.test(text)) return null
  return {
    category: 'harassment',
    explanation:
      '对方已表达拒绝、停止或离开的意愿，继续推进属于无视边界。普通语言中的“不要”“停”“回家”始终有效。',
    safeAlternative: '立即停止一切推进，接受对方的选择，把注意力放回自己的日常生活。',
  }
}

const PRIVACY_ACT =
  /偷拍|偷录|录音|录像|录屏|截图|拍照(然后|发给)?|转(给|发)|转发|传播|发给(朋友|同事|群|别人|大家)|告诉大家|告诉(同事|朋友|别人)|公开|上传|定位|查(她)?(手机|住址|定位)|开房记录|人肉|发到(群里|网上|社交)/
const HIDE_INTENT = /不被发现|别被发现|隐蔽|偷偷|不让她知道|规避|删掉记录|清空记录/

export function detectPrivacyViolation(text: string): DetectResult | null {
  const act = PRIVACY_ACT.test(text)
  const hiddenCapture = HIDE_INTENT.test(text) && /拍|录|转|发/.test(text)
  if (!act && !hiddenCapture) return null
  return {
    category: 'privacyViolation',
    explanation:
      '偷拍、录音录像、截图转发、传播私密内容或获取他人隐私信息，侵犯他人权利，产品不会提供相关做法。',
    safeAlternative: '删除已获取或企图获取的他人隐私，不传播任何内容，向对方说明并停止这类行为。',
  }
}

const POWER_ROLE = /下属|实习生|我(带|管)的|导师|学生|学员|上下级|扣绩效|考核|辞退|威胁她工作/
const PURSUIT_INTENT = /追|约|表白|喜欢|谈恋爱|要微信|带出去|在一起/

export function detectPowerImbalance(text: string): DetectResult | null {
  if (!POWER_ROLE.test(text) || !PURSUIT_INTENT.test(text)) return null
  return {
    category: 'powerImbalance',
    explanation:
      '存在明显权力差的双方（如上下级、师生、考核关系）中，对方难以自由拒绝，这类追求建立在不对等基础上。',
    safeAlternative: '先退出权力关系的影响范围，或在双方不再存在考核、评价关系后再考虑表达。',
  }
}

const COERCION_PATTERNS = [
  /不答应(就|的话)|否则就|威胁|要挟|曝光|堵门|强迫|必须陪我|你不来我就|敢拒绝我就|不跟我(谈|好)就/,
]
const MANIPULATION_PATTERNS = [/打压|贬低|让她自卑|损她|制造嫉妒|让她吃醋|忽冷忽热|冷暴力|玩消失|道德绑架|让她内疚|让她亏欠|PUA|服从性测试/]
const DECEPTION_PATTERNS = [/谎称|伪装|装成|假身份|编个理由|骗她说|隐瞒.*(已婚|有对象|真实|收入)|装单身|假装单身/]
const HARASSMENT_PATTERNS = [
  /跟踪|蹲点|堵(她|她家|她公司)|监视|查岗/,
  /(天天|反复|一直|连环)(发|打|找|约)/,
  /换(个|小)?号|小号(加|继续|试探)|换账号|换个平台继续|跨平台(找|加|发)/,
  /让(她)?朋友(去|帮)说|找她朋友(施压|说情)/,
  /拒绝.*(小号|换号|继续找|朋友)|不回(应)?就.*(继续|换|打)/,
]

function ruleCheck(
  text: string,
  category: SafetyCategory,
  patterns: RegExp[],
  explanation: string,
  safeAlternative: string,
): DetectResult | null {
  if (!patterns.some((p) => p.test(text))) return null
  return { category, explanation, safeAlternative }
}

// ---------- 谨慎提示（不拦截） ----------

export const SAFETY_RULES: SafetyRule[] = [
  {
    category: 'intoxication',
    level: 'caution',
    patterns: [/喝(酒|多了)|微醺|有点醉/],
    explanation: '提到饮酒状态。如果涉及约会或亲密安排，请先确认对方清醒、自主且意愿明确，否则暂停。',
    safeAlternative: '先关心对方是否需要休息，不提出任何推进关系的安排。',
  },
  {
    category: 'harassment',
    level: 'caution',
    patterns: [/在吗\s*在吗|还不回|怎么还不回|快点回|到底回不/],
    explanation: '连续催促会让对方感到压力和不安。给对方回复的空间，是尊重的一部分。',
    safeAlternative: '只发一条信息，然后等待；把注意力放回自己的事情上。',
  },
  {
    category: 'manipulation',
    level: 'caution',
    patterns: [/为你.*(做了|付出|等了)|你不(领情|珍惜)|我那么(用心|认真).*(你|却)/],
    explanation: '强调付出并要求回报，会让对方感到亏欠和压力，好感不能靠“记人情”换取。',
    safeAlternative: '收回“付出-回报”的框架，只表达自己的感受，不要求对方回应。',
  },
  {
    category: 'harassment',
    level: 'caution',
    patterns: [/为什么(不|没)回|解释一下|到底什么意思|你给我说清楚/],
    explanation: '追问解释会把普通沉默升级成对峙。对方不回复本身就是信息，不需要一个理由才能结束。',
    safeAlternative: '把“需要解释”改成“先收住”：不再追问，接受现状，照顾好自己。',
  },
  {
    category: 'coercion',
    level: 'caution',
    patterns: [/你必须(来|答应|出来)|一定要(见|答应)|非见不可/],
    explanation: '强制的语气会让邀约失去“可以拒绝”的出口，变成压力。',
    safeAlternative: '给出具体安排，并明确说“你有空再说，没空完全没关系”。',
  },
  {
    category: 'deception',
    level: 'caution',
    patterns: [/先(答应|见面|见面再说)|见了面再说/],
    explanation: '先答应再说明的隐藏条件会削弱对方的知情选择，属于边界模糊的沟通。',
    safeAlternative: '把真实意图放在开头讲清楚，让对方在信息完整的前提下决定。',
  },
  {
    category: 'privacyViolation',
    level: 'caution',
    patterns: [/要(她)?住址|要(她)?电话|加个微信.*(随便|敷衍)|发定位/],
    explanation: '过早索取联系方式或位置信息会让人不安，尤其在没有足够熟悉度时。',
    safeAlternative: '先在当下场合把对话进行好，联系方式等对方自然愿意给的时候再说。',
  },
  {
    category: 'healthRisk',
    level: 'caution',
    patterns: [/不(用|使用)(戴)?(安全套|避孕|保护措施)|不戴(套|避孕)|体外|安全期|吃药就行/],
    explanation:
      '放弃保护措施涉及双方的健康与安全。是否使用、如何使用的决定必须双方清醒、明确地沟通，不能单方面默认。',
    safeAlternative: '把避孕与性健康作为事前沟通的一部分，双方共同决定，不要单方面跳过。',
  },
]

const EMPTY_SAFE: SafetyResult = { level: 'safe', categories: [], explanation: '', safeAlternative: '' }

function blocked(result: DetectResult): SafetyResult {
  return {
    level: 'blocked',
    categories: [result.category],
    explanation: result.explanation,
    safeAlternative: result.safeAlternative,
  }
}

export function safetyCheck(text: string): SafetyResult {
  const normalized = normalizeInput(text)
  if (!normalized) return EMPTY_SAFE

  // 1. 教育性讨论：仅当不存在执行意图时放行（如“未成年人谈恋爱有什么需要注意的”）
  const educational =
    EDUCATIONAL_PATTERN.test(normalized) &&
    (normalized.includes('酒') || normalized.includes('未成年') || normalized.includes('偷拍') || normalized.includes('保护措施') || normalized.includes('保存') || normalized.includes('照片'))

  if (educational && !EXECUTION_INTENT.test(normalized)) {
    return {
      level: 'safe',
      categories: [],
      explanation: '这是对规则本身的讨论，不属于寻求执行建议。',
      safeAlternative: '',
    }
  }

  // 2. 硬拦截（优先级从高到低：威胁强迫优先，再未成年人、意识、拒绝、隐私、操控等）
  const hardChecks: Array<(t: string) => DetectResult | null> = [
    (t) =>
      ruleCheck(t, 'coercion', COERCION_PATTERNS, '威胁、强迫或以曝光、纠缠相要挟的做法会造成严重伤害，产品不会提供任何执行帮助。', '放弃施压，直接、明确地接受对方的选择，停止推进。'),
    detectMinorContext,
    detectImpairedConsent,
    detectRefusalOverride,
    detectPrivacyViolation,
    (t) =>
      ruleCheck(t, 'manipulation', MANIPULATION_PATTERNS, '通过贬低、嫉妒、冷热交替或制造亏欠感来影响对方，属于操控行为，产品不会提供这类建议。', '直接、真诚地表达你的想法和感受，尊重对方自己的判断。'),
    (t) =>
      ruleCheck(t, 'deception', DECEPTION_PATTERNS, '虚构或隐瞒身份、收入和关系状态属于欺骗，关系建立在虚假信息上会对双方都造成伤害。', '以真实信息表达自己；如果无法做到，说明目前不适合推进这段关系。'),
    (t) =>
      ruleCheck(t, 'harassment', HARASSMENT_PATTERNS, '反复联系、换账号或跨平台继续联系属于纠缠行为，对方不回应或拒绝后继续联系会造成持续骚扰。', '停止所有渠道的联系尝试。接受对方的回应，把注意力放回自己的日常生活。'),
    detectPowerImbalance,
  ]

  for (const check of hardChecks) {
    const result = check(normalized)
    if (result) return blocked(result)
  }

  // 3. caution 规则
  const matches = SAFETY_RULES.filter((rule) => rule.patterns.some((p) => p.test(normalized)))
  if (matches.length > 0) {
    const primary = matches[0]
    return {
      level: 'caution',
      categories: [...new Set(matches.map((r) => r.category))],
      explanation: primary.explanation,
      safeAlternative: primary.safeAlternative,
    }
  }

  return EMPTY_SAFE
}
