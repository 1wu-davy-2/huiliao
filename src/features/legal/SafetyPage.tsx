import { Link } from 'react-router-dom'
import { AlertTriangle, ShieldCheck } from 'lucide-react'

/**
 * 安全提示。
 *
 * 内容与产品定位保持一致：只练自己能控制的表达，不预测他人反应，不提供施压手段。
 * 刻意不写任何具体的求助热线号码——写错的号码比不写更糟，因此只做「找有资质的专业人士 /
 * 当地紧急服务」这类一般性指引。
 *
 * 事实来源：
 * - 五维评分（清晰/真诚/倾听/分寸/边界，0–100）：src/types/index.ts 的 SKILL_LABELS
 * - 硬拦截类别：src/types/index.ts 的 SafetyCategory 与 src/lib/safety/safety.ts
 * - 停止条件与边界表述：src/content/privacy.ts、src/features/onboarding/OnboardingPage.tsx
 */
export default function SafetyPage() {
  return (
    <div className="fade-in">
      <header className="page-head">
        <h1 className="page-title">安全提示</h1>
        <p className="page-sub">
          这一页说明练习的边界在哪里，以及什么时候该停下来。练习工具能帮你把话说得更清楚，但它不替你判断一段关系该不该继续。
        </p>
      </header>

      <section className="section" aria-labelledby="safety-consent-title">
        <h2 className="section-title" id="safety-consent-title">
          同意与边界是底线，不是技巧
        </h2>
        <div className="card mt-16">
          <ul className="stack">
            <li>
              同意需要是清醒、自愿、具体、可以随时撤回的。沉默、犹豫、敷衍、「再看看」都不是同意，不要当成默许。
            </li>
            <li>
              同意是持续的，不是一次性的。之前答应过，不代表现在还答应；一个环节答应了，不代表下一个环节也答应。
            </li>
            <li>
              每一句邀约都要留出轻松拒绝的空间。如果对方要费力才能拒绝你，问题出在你的问法上。
            </li>
            <li>
              收到拒绝或停止信号后就停下，不追问理由、不换个说法再试一次、不用情绪让对方为拒绝感到抱歉。
            </li>
            <li>
              边界是双向的。练习里同样包含说出你自己的上限，以及在对方越界时把话讲明白。
            </li>
          </ul>
          <p className="small muted mt-16">
            关于影像、聊天记录、身份信息和亲密边界的更细讨论，见 <Link to="/privacy">隐私与边界</Link>。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="safety-simulation-title">
        <h2 className="section-title" id="safety-simulation-title">
          模拟对话不预测真实结果
        </h2>
        <div className="card mt-16">
          <p>
            情境里的角色是脚本和模型生成的，不是任何真实的人。它按设定回应，而真实的人有你不知道的经历、状态和当天的心情。
          </p>
          <ul className="stack mt-16">
            <li>模拟里顺利，不等于现实中对方会答应。</li>
            <li>模拟里碰壁，也不等于你在现实中做错了什么。</li>
            <li>
              同一句话在不同的人、不同的时间、不同的关系阶段里，结果可以完全不同。练习给你的是表达的选项，不是可复制的结果。
            </li>
          </ul>
          <p className="mt-16">
            把它当成排练：值得带走的是「我原来可以这样说」，而不是「照这样说就能成」。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="safety-score-title">
        <h2 className="section-title" id="safety-score-title">
          分数只衡量你的表达
        </h2>
        <div className="card mt-16">
          <p>
            练习后的五个维度——清晰、真诚、倾听、分寸、边界——评的是你写下的这段话本身，满分 100。
          </p>
          <hr className="divider" />
          <p className="bold">它不衡量的东西</p>
          <ul className="stack mt-8">
            <li>对方的感受。没有任何分数能替真实的人回答「我被尊重了吗」。</li>
            <li>你作为伴侣或朋友的价值。低分是这一句话的问题，不是对你的评价。</li>
            <li>这段关系的走向。</li>
          </ul>
          <p className="small muted mt-16">
            分数会随规则和内容更新而变化，不适合当成长期指标来比较。真正的反馈来自现实里对方的回应，以及你事后是否问过对方感受如何。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="safety-stop-title">
        <h2 className="section-title" id="safety-stop-title">
          停止信号：该结束对话，而不是优化说法
        </h2>
        <div className="feedback feedback-warning mt-16">
          <p className="bold">出现下面这些情况，正确的下一步是结束，不是换一种措辞再试</p>
          <ul className="stack mt-8">
            <li>对方明确说了不、说了停，或者要求换话题、结束对话。</li>
            <li>对方在回避、长时间不回、只给最短的回应——这通常已经是答案。</li>
            <li>对方喝了酒、用了药，或因为疲惫、生病、情绪崩溃而无法清醒判断。</li>
            <li>对方在哭、在发抖、在道歉，或明显是为了让你满意才答应。</li>
            <li>你们之间存在上下级、师生、医患这类权力差，对方很难自由说不。</li>
            <li>你发现自己开始计算怎么绕过对方的拒绝——这时该停的是你，不是对话。</li>
            <li>你自己也在崩溃或愤怒中。这种状态下发出的消息，事后往往需要收拾更久。</li>
          </ul>
          <p className="mt-16">
            结束对话不是失败。把「我先不打扰了，你想聊再找我」说清楚，通常比再补五条消息更能保住这段关系。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="safety-scope-title">
        <h2 className="section-title" id="safety-scope-title">
          这个工具不做什么
        </h2>
        <div className="card mt-16">
          <p>
            会聊只训练尊重前提下的表达。操控、施压和话术套路不在功能范围内，遇到这类意图，练习会直接拦下并说明原因，而不是给出「更有效」的版本。
          </p>
          <hr className="divider" />
          <p className="bold">明确拦截的意图</p>
          <ul className="stack mt-8">
            <li>操控与情绪胁迫：制造愧疚、贬低对方、忽冷忽热、以分手或自伤作为要挟。</li>
            <li>欺骗：隐瞒关系状态、伪造身份或条件、给出不打算兑现的承诺。</li>
            <li>强迫与施压：在拒绝之后继续推进、反复纠缠、灌酒或利用对方判断力受损的状态。</li>
            <li>骚扰：不受欢迎的持续联系、跨平台追踪、不请自来的露骨内容。</li>
            <li>侵犯隐私：偷拍、私自录音、转发聊天记录、公开对方的可识别信息。</li>
            <li>涉及未成年人的任何情境。</li>
            <li>利用明显权力差获取顺从。</li>
          </ul>
          <p className="small muted mt-16">
            这套判断是自动的、基于文本的，会有漏判和误判。它拦不住的东西不等于是可以做的——判断的责任仍然在你。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="safety-help-title">
        <h2 className="section-title" id="safety-help-title">
          需要的不是练习工具时
        </h2>
        <div className="card mt-16">
          <p>
            如果你正处在人身危险中，或者有伤害自己、伤害他人的想法，请立即联系<span className="bold">当地紧急服务</span>
            ，或者当地的危机干预与心理援助渠道。这类情况需要真人马上介入，练习页面帮不上忙。
          </p>
          <p className="mt-16">
            如果困扰持续存在——反复的关系创伤、长期的焦虑或抑郁、正在承受控制或暴力——找一位有资质的心理专业人士或相应机构，比继续练措辞更有用。
          </p>
          <p className="small muted mt-16">
            本页不提供具体的热线号码：号码会因地区和时间而变，写错反而耽误事。请通过当地官方渠道查询最新信息。
          </p>
        </div>
      </section>

      <p className="small muted mt-24" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <ShieldCheck size={16} className="mt-8" aria-hidden="true" />
        本页为教育内容，不构成医疗、心理或法律建议。你对自己在现实关系中的行为负责。
      </p>
      <p className="small muted mt-8" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <AlertTriangle size={16} className="mt-8" aria-hidden="true" />
        产品实际如何处理数据，见 <Link to="/terms">使用条款</Link> 与 <Link to="/privacy">隐私协议</Link>。
      </p>
    </div>
  )
}
