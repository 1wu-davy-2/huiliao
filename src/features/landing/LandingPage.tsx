import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeartHandshake, ShieldCheck, MessageCircleOff } from 'lucide-react'
import { useAppData } from '@/lib/settings/AppDataContext'
import './landing.css'

export default function LandingPage() {
  const { data } = useAppData()
  const navigate = useNavigate()

  // 策略 A：已完成 onboarding 的老用户直接跳过封面进主界面
  useEffect(() => {
    if (data.settings.onboardingCompleted && data.settings.isAdultConfirmed) {
      navigate('/home', { replace: true })
    }
  }, [data.settings.onboardingCompleted, data.settings.isAdultConfirmed, navigate])

  if (data.settings.onboardingCompleted && data.settings.isAdultConfirmed) return null

  return (
    <div className="lp">
      {/* 固定顶栏 */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand">
            <img src="/images/brand-mark.svg" alt="" aria-hidden="true" width={32} height={32} />
            <span className="lp-brand-name">会聊</span>
          </div>
          <nav className="lp-nav" aria-label="落地页导航">
            <a href="#philosophy" className="lp-nav-link">产品理念</a>
            <a href="#features" className="lp-nav-link">训练内容</a>
          </nav>
          <Link to="/onboarding" className="lp-btn lp-btn-soft">开始体验</Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="lp-hero">
          <h1 className="lp-headline">
            把话说清楚，<br className="lp-br-mobile" />是成年人最顶级的修养
          </h1>
          <p className="lp-sub">
            面向缺少约会沟通经验的成年人，练习尊重、真诚、有边界的关系沟通。<br />
            不教「拿下」的话术，不承诺任何恋爱结果。
          </p>
          <div className="lp-hero-actions">
            <Link to="/onboarding" className="lp-btn lp-btn-soft lp-btn-lg">立即开始训练</Link>
            <a href="#philosophy" className="lp-btn lp-btn-outline lp-btn-lg">了解更多</a>
          </div>
          <p className="lp-local-note">本地优先 · 无账号 · 无云同步 · 仅限 18 岁以上</p>
        </section>

        {/* 产品界面 HTML Mockup */}
        <section className="lp-preview-section" aria-label="产品界面预览">
          <p className="lp-mock-caption" aria-hidden="true">以下为界面示意，数据为示例</p>
          <div className="lp-mockup" aria-hidden="true">
            {/* 侧边栏 */}
            <aside className="lp-mock-sidebar">
              <div className="lp-mock-brand">
                <span className="lp-mock-brand-dot" />
                <span className="lp-mock-brand-name">会聊</span>
              </div>
              <div className="lp-mock-cta">＋ 开始新对话</div>
              <nav className="lp-mock-nav">
                {[
                  { label: '首页', active: true },
                  { label: '训练中心', active: false },
                  { label: '进度统计', active: false },
                  { label: '设置', active: false },
                ].map(({ label, active }) => (
                  <div key={label} className={`lp-mock-nav-item${active ? ' active' : ''}`}>{label}</div>
                ))}
              </nav>
            </aside>

            {/* 主区域 */}
            <div className="lp-mock-main">
              <div className="lp-mock-topbar">
                <span className="lp-mock-topbar-title">会聊</span>
                <span className="lp-mock-topbar-ctx">/ 训练工作台</span>
              </div>

              <div className="lp-mock-body">
                {/* 左侧内容 */}
                <div className="lp-mock-content">
                  <h2 className="lp-mock-h2">今天练哪一场？</h2>
                  <p className="lp-mock-p">下一步不是取悦对方，而是把话说清楚。</p>

                  {/* 推荐卡片 */}
                  <div className="lp-mock-rec">
                    <div className="lp-mock-rec-top">
                      <span className="lp-mock-badge">今日推荐</span>
                      <span className="lp-mock-rec-meta">约 8 分钟 · 入门</span>
                    </div>
                    <div className="lp-mock-rec-title">初次聊天：怎么开口不尴尬</div>
                    <div className="lp-mock-rec-tags">
                      <span>开口</span><span>续聊</span><span>邀约</span>
                    </div>
                    <div className="lp-mock-rec-btn">继续训练 →</div>
                  </div>

                  {/* 快捷入口 */}
                  <div className="lp-mock-quick">
                    {['不知道怎么开口', '对方回复变短', '想发出邀约', '刚被拒绝', '不确定边界'].map((t) => (
                      <div key={t} className="lp-mock-chip">{t}</div>
                    ))}
                  </div>
                </div>

                {/* 右侧能力概况 */}
                <div className="lp-mock-aside">
                  <div className="lp-mock-aside-title">能力概况</div>
                  {([['清晰', 62], ['真诚', 78], ['倾听', 48], ['分寸', 55], ['边界', 71]] as const).map(
                    ([name, val]) => (
                      <div key={name} className="lp-mock-skill">
                        <span className="lp-mock-skill-name">{name}</span>
                        <div className="lp-mock-bar">
                          <div className="lp-mock-fill" style={{ width: `${val}%` }} />
                        </div>
                        <span className="lp-mock-skill-val">{val}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 三大价值支柱 */}
        <section className="lp-section" id="features" aria-labelledby="features-heading">
          <h2 id="features-heading" className="lp-section-heading">三个核心训练方向</h2>
          <div className="lp-pillars">
            <div className="lp-pillar">
              <div className="lp-pillar-icon" aria-hidden="true"><HeartHandshake size={22} /></div>
              <h3 className="lp-pillar-title">自然开口</h3>
              <p className="lp-pillar-desc">从搭话到续聊，不靠套路。练习在真实语境中自然开口，表达真实的兴趣，而不是背台词。</p>
            </div>
            <div className="lp-pillar">
              <div className="lp-pillar-icon" aria-hidden="true"><ShieldCheck size={22} /></div>
              <h3 className="lp-pillar-title">同意与边界</h3>
              <p className="lp-pillar-desc">迟疑、拒绝、撤回都要接住。学会在关系里识别对方的信号，在任何阶段停止推进都是正确的选择。</p>
            </div>
            <div className="lp-pillar">
              <div className="lp-pillar-icon" aria-hidden="true"><MessageCircleOff size={22} /></div>
              <h3 className="lp-pillar-title">体面收尾</h3>
              <p className="lp-pillar-desc">被拒绝后如何停止推进，说清楚而不纠缠。拒绝不需要破解，收到就接受，这本身就是一种成熟。</p>
            </div>
          </div>
        </section>

        {/* 产品理念 */}
        <section className="lp-philosophy" id="philosophy" aria-labelledby="philosophy-heading">
          <h2 id="philosophy-heading" className="lp-philosophy-title">练的是你能控制的，不是对方的反应</h2>
          <p className="lp-philosophy-body">
            会聊不教你怎么「拿下」，也不承诺提升回复率或脱单率。它是一个安静的私人练习室：你在分支情境里开口，看对方如何回应，理解一句表达为什么合适——而不是只得到一句可以照抄的台词。建议只用可随时撤销的最小权限 Key。
          </p>
        </section>

        {/* 底部 CTA */}
        <section className="lp-cta-wrap">
          <div className="lp-cta-card">
            <div className="lp-deco lp-deco-tr" aria-hidden="true" />
            <div className="lp-deco lp-deco-bl" aria-hidden="true" />
            <div className="lp-cta-inner">
              <h2 className="lp-cta-title">准备好开口了吗？</h2>
              <p className="lp-cta-sub">加入会聊，开启你的第一次专项沟通训练。本应用仅面向 18 岁以上成年人。</p>
              <Link to="/onboarding" className="lp-btn lp-btn-primary lp-btn-lg">免费体验</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-footer-copy">© 2026 会聊 | 约会与关系沟通练习场</span>
          <nav className="lp-footer-nav" aria-label="页脚导航">
            <Link to="/privacy" className="lp-footer-link">隐私协议</Link>
            <Link to="/terms" className="lp-footer-link">服务条款</Link>
            <Link to="/safety" className="lp-footer-link">安全提示</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
