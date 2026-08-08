import { NavLink } from 'react-router-dom'

export default function LabTabs() {
  return (
    <nav className="lab-tabs" aria-label="实验室功能">
      <NavLink to="/lab" end className="lab-tab">
        消息诊断
      </NavLink>
      <NavLink to="/lab/ai" className="lab-tab">
        AI 试炼场
      </NavLink>
    </nav>
  )
}
