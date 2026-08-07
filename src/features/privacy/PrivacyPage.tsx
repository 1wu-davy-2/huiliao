import { useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { PRIVACY_TOPICS } from '@/content/privacy'
import { ConsentSignals } from '@/components/ui/ConsentSignals'

export default function PrivacyPage() {
  const [activeIndex, setActiveIndex] = useState(0)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const topics = PRIVACY_TOPICS

  const onKeyDown = (event: React.KeyboardEvent) => {
    const dir =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (dir === 0) return
    event.preventDefault()
    const next = (activeIndex + dir + topics.length) % topics.length
    setActiveIndex(next)
    tabRefs.current[next]?.focus()
  }

  const active = topics[activeIndex]

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">隐私与边界</h1>
        <p className="page-sub">
          这里同时覆盖两件事：这个产品如何处理你的数据，以及成年人的关系里如何协商隐私与边界。
        </p>
      </header>

      <div role="tablist" aria-label="隐私主题" className="segmented" onKeyDown={onKeyDown}>
        {topics.map((topic, i) => (
          <button
            key={topic.id}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`tab-${topic.id}`}
            aria-selected={i === activeIndex}
            aria-controls={`panel-${topic.id}`}
            tabIndex={i === activeIndex ? 0 : -1}
            className="seg-btn"
            onClick={() => setActiveIndex(i)}
          >
            {topic.title}
          </button>
        ))}
      </div>

      <section
        key={active.id}
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="section fade-in"
        aria-label={active.title}
      >
        <div className="card">
          <p className="bold">{active.summary}</p>
        </div>

        <div className="card mt-16">
          <p className="bold">原则</p>
          <ul className="stack mt-8">
            {active.principles.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="card mt-16">
          <p className="bold">对话示例</p>
          <div className="stack mt-16">
            {active.examples.map((example) => (
              <div className="feedback" key={example.context}>
                <p>
                  <span className="bold">情境：</span>
                  {example.context}
                </p>
                <p className="mt-8">
                  <span className="bold">建议：</span>
                  {example.suggested}
                </p>
                <p className="mt-8" style={{ color: 'var(--warning)' }}>
                  <span className="bold">避免：</span>
                  {example.avoid}
                </p>
                <p className="small muted mt-8">为什么：{example.why}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card mt-16">
          <p className="bold">停止条件</p>
          <ul className="stack mt-8">
            {active.stopConditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        {active.id === 'kink-boundary' && (
          <div className="card mt-16">
            <p className="bold">绿黄红信号体系</p>
            <p className="small muted mt-8">
              这是项目内预先约定的辅助沟通协议，不是普遍默认规则，也不能取代持续同意。
            </p>
            <div className="mt-16">
              <ConsentSignals />
            </div>
          </div>
        )}
      </section>

      <p className="small muted mt-16" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <ShieldCheck size={16} className="mt-8" aria-hidden="true" />
        本页为教育内容，不构成法律或医疗建议。正式上线前，法律、性健康和成年人情趣相关内容需由具备资质的专业人士审校。
      </p>
    </>
  )
}
