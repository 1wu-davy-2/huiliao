import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/**
 * 训练中心入口页（设计稿 _2）。
 *
 * 版式：1/3 文案 + 2/3 插画（宽屏 300px 高），逐节交替左右，节间 1px 分隔线。
 * 入口做 3 项而非设计稿的 2 项：见批次计划 B9，`/practice` 是最大功能面，
 * 收进「训练中心」后必须在此有一级入口，否则从导航不可达。
 *
 * 插画全部走本地 SVG：设计稿用 lh3.googleusercontent.com 远端图，
 * 被 CSP `img-src 'self' data:` 拦截，不能照抄。
 */

const CANVAS_MAX = 1000

interface Entry {
  /** 目的地 */
  to: string
  /** 分类标签（设计稿 category pill） */
  category: string
  title: string
  desc: string
  /** 行内链接文案 */
  action: string
  art: string
  /** SVG 固有尺寸，显式写死以免 CSS 未生效时撑出横向溢出 */
  artWidth: number
  artHeight: number
  /** 插画上的抽象进度条装饰，仅设计稿「消息诊断」一节有 */
  overlay?: boolean
}

const ENTRIES: Entry[] = [
  {
    to: '/practice',
    category: '情境库',
    title: '情境练习',
    desc: '12 个已审校情境，按分支推进对话。每个风险选项都标注了边界提示，走错也能看清代价。',
    action: '浏览情境',
    art: '/images/hero-communication.svg',
    artWidth: 800,
    artHeight: 400,
  },
  {
    to: '/lab/message',
    category: '诊断工具',
    title: '消息诊断',
    desc: '粘贴一条已经写好的草稿，看它的清晰、真诚、倾听、分寸与边界分数。诊断只跑本地规则，不上传，也不预测对方反应。',
    action: '开始诊断',
    art: '/images/illus-diagnose.svg',
    artWidth: 480,
    artHeight: 300,
    overlay: true,
  },
  {
    to: '/lab/ai',
    category: '实战演练',
    title: 'AI 情景模拟',
    desc: '自带 API Key 的多轮模拟练习，在没有真实代价的环境里应对难谈的话题。Key 只留在内存，不写入本地存储。',
    action: '选择场景',
    art: '/images/illus-simulate.svg',
    artWidth: 480,
    artHeight: 300,
  },
]

// 设计稿的训练画布：内容居中、上限 1000px
const canvasStyle: CSSProperties = {
  maxWidth: CANVAS_MAX,
  margin: '0 auto',
}

// 设计稿 header 下留 64px 呼吸（.page-head 基线 20px 偏紧）
const headStyle: CSSProperties = {
  marginBottom: 'var(--section-gap)',
}

const sectionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--section-gap)',
}

const entryTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--text-headline-lg)',
  lineHeight: 'var(--leading-headline-lg)',
  letterSpacing: 'var(--tracking-headline-lg)',
  fontWeight: 600,
}

const artImgStyle: CSSProperties = { maxWidth: '100%' }

export default function LabHubPage() {
  return (
    <div className="fade-in" style={canvasStyle}>
      <header className="page-head" style={headStyle}>
        <h1 className="page-title">训练中心</h1>
        <p className="page-sub">
          选一个环境开始练。三条路都不需要账号，练习记录只留在这台设备上。
        </p>
      </header>

      <div style={sectionsStyle}>
        {ENTRIES.map((entry, index) => {
          // 由路由派生，不用中文标题：标题含空格（"AI 情景模拟"），做 id 非法
          const headingId = `entry${entry.to.replace(/\//g, '-')}`
          return (
            <section
              key={entry.to}
              aria-labelledby={headingId}
              // 交替左右：第 2 项（偶数序）把插画放到左侧
              className={index % 2 === 1 ? 'entry-section entry-alt' : 'entry-section'}
            >
              <div className="entry-body">
                <div>
                  <span className="category-pill">{entry.category}</span>
                  <h2 className="mt-24" id={headingId} style={entryTitleStyle}>
                    {entry.title}
                  </h2>
                  <p className="muted mt-16">{entry.desc}</p>
                </div>
                <Link to={entry.to} className="entry-link press-scale mt-24">
                  {entry.action}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>

              <div className="entry-art">
                {/* 纯装饰：语义由相邻标题与链接承载 */}
                <img
                  src={entry.art}
                  alt=""
                  aria-hidden="true"
                  width={entry.artWidth}
                  height={entry.artHeight}
                  style={artImgStyle}
                />
                {entry.overlay && (
                  <div className="art-overlay" aria-hidden="true">
                    <div className="art-bar">
                      <span style={{ width: '66%' }} />
                    </div>
                    <div className="art-bar" style={{ width: 96 }}>
                      <span style={{ width: '50%', background: 'var(--tertiary-container)' }} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
