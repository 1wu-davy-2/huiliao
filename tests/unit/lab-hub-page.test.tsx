import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LabHubPage from '@/features/lab/LabHubPage'

function renderHub() {
  return render(
    <MemoryRouter>
      <LabHubPage />
    </MemoryRouter>,
  )
}

const ENTRIES = [
  { title: '情境练习', action: '浏览情境', href: '/practice', category: '情境库' },
  { title: '消息诊断', action: '开始诊断', href: '/lab/message', category: '诊断工具' },
  { title: 'AI 情景模拟', action: '选择场景', href: '/lab/ai', category: '实战演练' },
]

describe('训练中心入口页', () => {
  it('标题为训练中心', () => {
    renderHub()
    expect(screen.getByRole('heading', { level: 1, name: '训练中心' })).toBeInTheDocument()
  })

  it('三个入口都渲染标题、分类标签与行内链接', () => {
    renderHub()
    for (const { title, action, category } of ENTRIES) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
      expect(screen.getByText(category)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: action })).toBeInTheDocument()
    }
  })

  it('三个入口指向正确路径', () => {
    renderHub()
    for (const { action, href } of ENTRIES) {
      expect(screen.getByRole('link', { name: action })).toHaveAttribute('href', href)
    }
  })

  it('/practice 排在第一位，避免最大功能面从导航不可达', () => {
    renderHub()
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/practice')
  })

  it('每个入口都有独立的可访问分区名', () => {
    renderHub()
    for (const { title } of ENTRIES) {
      expect(screen.getByRole('region', { name: title })).toBeInTheDocument()
    }
  })

  it('三张插画均为装饰性，不进入可访问性树', () => {
    const { container } = renderHub()
    const images = Array.from(container.querySelectorAll('img'))
    expect(images).toHaveLength(3)
    for (const img of images) {
      expect(img).toHaveAttribute('alt', '')
      expect(img).toHaveAttribute('aria-hidden', 'true')
      // 显式定尺寸：360px 视口下不得撑出横向溢出
      expect(img.getAttribute('width')).toBeTruthy()
      expect(img.getAttribute('height')).toBeTruthy()
    }
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('插画走本地资源，不引用被 CSP 拦截的远端图', () => {
    const { container } = renderHub()
    const sources = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(sources).toEqual([
      '/images/hero-communication.svg',
      '/images/illus-diagnose.svg',
      '/images/illus-simulate.svg',
    ])
  })

  it('宽屏交替左右：第二节加 entry-alt', () => {
    const { container } = renderHub()
    const sections = Array.from(container.querySelectorAll('.entry-section'))
    expect(sections).toHaveLength(3)
    expect(sections[0].classList.contains('entry-alt')).toBe(false)
    expect(sections[1].classList.contains('entry-alt')).toBe(true)
    expect(sections[2].classList.contains('entry-alt')).toBe(false)
  })
})
