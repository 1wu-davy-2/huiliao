import { NavLink } from 'react-router-dom'

/**
 * 两页签导航。`/lab` 现在是训练中心入口页，消息诊断已移到 `/lab/message`。
 *
 * 仍被 `AiTrialPage` 使用，故保持默认导出、无 props 的签名不变；
 * `MessageLabPage` 已改用返回训练中心的面包屑。
 */
export default function LabTabs() {
  return (
    <nav className="lab-tabs" aria-label="实验室功能">
      <NavLink to="/lab/message" end className="lab-tab">
        消息诊断
      </NavLink>
      <NavLink to="/lab/ai" className="lab-tab">
        AI 试炼场
      </NavLink>
    </nav>
  )
}
