import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'

/**
 * 使用条款。
 *
 * 本页只陈述可在代码中核实的事实，不编造法律条文：没有适用法律条款、没有仲裁条款、
 * 没有责任上限、没有免责赔偿、没有“我们保留……权利”式表述。为一个真实产品虚构
 * 法律约定会误导使用者，因此正文全部指向已实现的行为，末尾明确标注待法务复核。
 *
 * 事实来源：
 * - 无账号 / 无服务器端用户数据：src/ 内无登录、鉴权或会话代码；src/content/privacy.ts
 * - 本地存储：src/lib/storage/storage.ts（localStorage 键 huiliao:v1）
 *   与 src/lib/ai/trialDb.ts（IndexedDB 库 huiliao-ai-trials，保留 20 次 / 25 MB）
 * - 成年门：src/features/onboarding/OnboardingPage.tsx（isAdultConfirmed）
 * - API Key 只在内存：src/features/lab/AiTrialPage.tsx（useState + ref）
 *   与 src/lib/ai/trialClient.ts（X-Huiliao-Api-Key 请求头）
 * - 许可：仓库根目录 LICENSE（AGPL-3.0）
 * - 无统计：src/ 内无分析或埋点依赖
 */
export default function TermsPage() {
  return (
    <div className="fade-in">
      <header className="page-head">
        <h1 className="page-title">使用条款</h1>
        <p className="page-sub">
          这一页用平实的话说明「会聊」实际是怎么运作的。下面每一条都对应产品里已经成立的行为，没有额外的法律约定。
        </p>
      </header>

      <section className="section" aria-labelledby="terms-what-title">
        <h2 className="section-title" id="terms-what-title">
          这是什么
        </h2>
        <div className="card mt-16">
          <p>
            会聊提供的是<span className="bold">关系沟通练习材料</span>：情境演练、消息诊断，以及可选的 AI
            情景模拟。它训练的是你能控制的部分——怎么把话说清楚、怎么听、怎么表达和接受边界。
          </p>
          <hr className="divider" />
          <p className="bold">它不是什么</p>
          <ul className="stack mt-8">
            <li>不是心理治疗、心理咨询或精神健康诊疗，也不构成医疗建议。</li>
            <li>不是法律建议。</li>
            <li>不承诺任何恋爱、约会或关系结果。练习里的反馈只针对你的表达本身。</li>
          </ul>
          <p className="small muted mt-16">
            如果你正面对的是创伤、成瘾、抑郁、暴力关系或人身安全问题，这类问题需要有资质的专业人士介入，练习工具替代不了。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="terms-adult-title">
        <h2 className="section-title" id="terms-adult-title">
          仅限成年人
        </h2>
        <div className="card mt-16">
          <p>会聊只面向 18 岁以上的成年人。</p>
          <p className="mt-8">
            首次进入时有一道成年确认步骤，不勾选就无法继续到其他页面。这是一次自主声明，产品不做身份核验，也不收集任何证明材料。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="terms-data-title">
        <h2 className="section-title" id="terms-data-title">
          没有账号，数据在你自己的设备上
        </h2>
        <div className="card mt-16">
          <ul className="stack">
            <li>没有注册、没有登录、没有账号，也没有服务器端保存的用户数据。</li>
            <li>
              需要留存的练习数据只写进当前浏览器：localStorage 的 huiliao:v1 键，以及 IndexedDB 库
              huiliao-ai-trials（只存 AI 练习的完整对话，保留最近 20 次或 25 MB，超出后自动清理最旧的）。
            </li>
            <li>没有云同步。换浏览器、换设备或换域名，数据不会跟着走，需要你先导出。</li>
            <li>清除数据、导出数据都在你手里，入口在设置页。</li>
          </ul>
          <p className="small muted mt-16">
            更细的分项说明（哪些内容不落盘、导出文件里有什么、托管平台会处理哪些请求元数据）见{' '}
            <Link to="/privacy">隐私协议</Link>。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="terms-ai-title">
        <h2 className="section-title" id="terms-ai-title">
          AI 练习用你自己的 API Key
        </h2>
        <div className="card mt-16">
          <ul className="stack">
            <li>AI 情景模拟是可选功能，需要你填入自己的模型 API Key，产品不提供共享模型。</li>
            <li>
              这个 Key 只存在于当前页面的内存里，并且只通过一个专用请求头随本次请求发出。它不会写入
              localStorage、IndexedDB、网址、日志或导出文件；刷新页面即消失。
            </li>
            <li>请求经本站的同源中转函数发往你填写的模型服务。中转不记录日志，也不保存提示词或模型回复。</li>
            <li>调用消耗的是你自己账户的额度。练习结束时的模型自评会再调用一次同一模型。</li>
          </ul>
          <p className="small muted mt-16">
            建议用可以随时撤销的最小权限 Key。浏览器扩展和开发者工具仍可能观察到页面内的输入，这不是应用能控制的范围。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="terms-telemetry-title">
        <h2 className="section-title" id="terms-telemetry-title">
          不做统计与追踪
        </h2>
        <div className="card mt-16">
          <p>产品不接入分析、埋点、错误上报、广告或跨站跟踪，也不做用户画像。</p>
          <p className="small muted mt-8">
            访问网站时，托管平台为了送出页面文件仍会处理基础请求元数据（IP、User-Agent、请求路径等），这部分按平台自己的政策处理。
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="terms-license-title">
        <h2 className="section-title" id="terms-license-title">
          许可
        </h2>
        <div className="card mt-16">
          <p>
            本项目的源代码以 <span className="bold">AGPL-3.0</span> 许可发布，完整条文见仓库根目录的 LICENSE 文件。
          </p>
          <p className="small muted mt-8">
            该许可管的是代码的使用、修改与再分发，它本身不是一份面向使用者的服务协议。
          </p>
        </div>
      </section>

      <div className="tip-card mt-24">
        <Info size={18} aria-hidden="true" />
        <span>
          本页是对产品实际行为的平实描述，<span className="bold">尚待专业法务复核</span>
          ，不能当作一份经过审阅的正式协议。正式条款定稿前，请以这里陈述的事实为准。相关的安全边界见{' '}
          <Link to="/safety">安全提示</Link>。
        </span>
      </div>
    </div>
  )
}
