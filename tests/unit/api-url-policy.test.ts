// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  validateBaseUrlSyntax,
  classifyAddress,
  resolveAndPin,
  joinPath,
  type LookupAll,
} from '../../api/_lib/urlPolicy'

const throwingLookup: LookupAll = async () => {
  throw new Error('lookup should not be called')
}

const staticLookup = (records: Array<{ address: string; family: number }>): LookupAll =>
  async () => records

// Public unicast addresses. NB: 203.0.113.x and 198.51.100.x are TEST-NET
// ranges classified as `reserved` by ipaddr.js; use real public IPs instead.
const PUBLIC_V4_A = '1.1.1.1'
const PUBLIC_V4_B = '1.0.0.1'
const PUBLIC_V6 = '2606:4700:4700::1111'

describe('validateBaseUrlSyntax', () => {
  it('接受合法 HTTPS URL 并保留 /v1 前缀', () => {
    const r = validateBaseUrlSyntax('https://proxy.example.com/v1')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.pathPrefix).toBe('/v1')
      expect(r.hostname).toBe('proxy.example.com')
      expect(r.port).toBe(443)
      expect(r.isIpLiteral).toBe(false)
    }
  })

  it('接受显式端口', () => {
    const r = validateBaseUrlSyntax('https://proxy.example.com:8443/v1')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.port).toBe(8443)
  })

  it.each([
    ['http', 'http://api.example.com/v1'],
    ['file', 'file:///etc/passwd'],
    ['data', 'data:text/plain,hi'],
    ['javascript', 'javascript:alert(1)'],
  ])('拒绝 %s 协议', (_label, url) => {
    expect(validateBaseUrlSyntax(url).ok).toBe(false)
  })

  it('拒绝内嵌凭证', () => {
    expect(validateBaseUrlSyntax('https://user:pass@api.example.com/v1').ok).toBe(false)
    expect(validateBaseUrlSyntax('https://user@api.example.com/v1').ok).toBe(false)
  })

  it('拒绝查询参数或片段', () => {
    expect(validateBaseUrlSyntax('https://api.example.com/v1?k=v').ok).toBe(false)
    expect(validateBaseUrlSyntax('https://api.example.com/v1#frag').ok).toBe(false)
  })

  it('拒绝包含空白或控制字符', () => {
    expect(validateBaseUrlSyntax('https://api.example.com/ v1').ok).toBe(false)
    expect(validateBaseUrlSyntax('https://api.example.com/v1\n').ok).toBe(false)
    expect(validateBaseUrlSyntax('https://api.example.com/\x00').ok).toBe(false)
    expect(validateBaseUrlSyntax('https://api.example.com/\t').ok).toBe(false)
  })

  it('拒绝超长 URL (>2048)', () => {
    const long = 'https://api.example.com/' + 'a'.repeat(2100)
    expect(validateBaseUrlSyntax(long).ok).toBe(false)
  })

  it('拒绝空字符串', () => {
    expect(validateBaseUrlSyntax('').ok).toBe(false)
  })

  it('拒绝单标签主机名', () => {
    expect(validateBaseUrlSyntax('https://intranet/v1').ok).toBe(false)
  })

  it('拒绝尾随点', () => {
    expect(validateBaseUrlSyntax('https://api.example.com./v1').ok).toBe(false)
  })

  it('拒绝 IPv6 zone id', () => {
    // WHATWG decodes %25 → %, leaving a `%` in the hostname for the check to catch.
    expect(validateBaseUrlSyntax('https://[fe80::1%25eth0]/v1').ok).toBe(false)
  })

  it.each(['localhost', 'foo.localhost', 'svc.local', 'svc.internal', 'x.home.arpa'])(
    '拒绝内网名 %s',
    (host) => {
      expect(validateBaseUrlSyntax(`https://${host}/v1`).ok).toBe(false)
    },
  )

  it.each([
    ['%2f traversal', 'https://api.example.com/%2fsecret'],
    ['backslash', 'https://api.example.com/foo\\bar'],
    ['%00 null', 'https://api.example.com/%00'],
    ['../ traversal', 'https://api.example.com/../etc'],
  ])('拒绝不安全路径: %s', (_label, url) => {
    expect(validateBaseUrlSyntax(url).ok).toBe(false)
  })

  it('拒绝端口 0 与 99999', () => {
    // 99999 exceeds 16-bit port range — WHATWG URL constructor throws.
    expect(validateBaseUrlSyntax('https://api.example.com:99999/v1').ok).toBe(false)
    // Port 0 is technically parseable by WHATWG but not a valid connect port.
    expect(validateBaseUrlSyntax('https://api.example.com:0/v1').ok).toBe(false)
  })
})

describe('classifyAddress', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.20.5.5',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '0.0.0.0',
    '224.0.0.1', // multicast
    '100.64.0.1', // CGNAT
    '240.0.0.1', // reserved
    '255.255.255.255',
    '::1',
    'fe80::1',
    'fc00::1',
    'fd00::1',
    'ff00::1',
    '2001:db8::1', // documentation
    '2002::1', // 6to4
    '2001::1', // teredo
    '64:ff9b::1', // NAT64 / rfc6052
  ])('拒绝非公网地址 %s', (addr) => {
    const r = classifyAddress(addr)
    expect(r.ok).toBe(false)
  })

  it('IPv4-mapped IPv6 归一化后被识别为环回并拒绝', () => {
    const r = classifyAddress('::ffff:127.0.0.1')
    expect(r.ok).toBe(false)
  })

  it('接受公网 IPv4', () => {
    const r = classifyAddress(PUBLIC_V4_A)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.family).toBe(4)
      expect(r.normalized).toBe(PUBLIC_V4_A)
    }
  })

  it('接受公网 IPv6', () => {
    const r = classifyAddress(PUBLIC_V6)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.family).toBe(6)
  })

  it('拒绝无效 IP 字符串', () => {
    expect(classifyAddress('not-an-ip').ok).toBe(false)
  })
})

describe('resolveAndPin', () => {
  it('全公网结果通过并钉定第一个地址', async () => {
    const r = await resolveAndPin('https://api.example.com/v1', {
      lookup: staticLookup([
        { address: PUBLIC_V4_A, family: 4 },
        { address: PUBLIC_V4_B, family: 4 },
      ]),
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.pinnedAddress).toBe(PUBLIC_V4_A)
      expect(r.pathPrefix).toBe('/v1')
      expect(r.hostname).toBe('api.example.com')
      expect(r.family).toBe(4)
      expect(r.isIpLiteral).toBe(false)
    }
  })

  it('混合公私集合整体拒绝', async () => {
    const r = await resolveAndPin('https://api.example.com/v1', {
      lookup: staticLookup([
        { address: PUBLIC_V4_A, family: 4 },
        { address: '10.0.0.1', family: 4 },
      ]),
    })
    expect(r.ok).toBe(false)
  })

  it('单条私网结果拒绝', async () => {
    const r = await resolveAndPin('https://api.example.com/v1', {
      lookup: staticLookup([{ address: '192.168.1.1', family: 4 }]),
    })
    expect(r.ok).toBe(false)
  })

  it('空结果拒绝', async () => {
    const r = await resolveAndPin('https://api.example.com/v1', {
      lookup: staticLookup([]),
    })
    expect(r.ok).toBe(false)
  })

  it('结果数超过 8 拒绝', async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      address: `1.1.1.${i + 1}`,
      family: 4,
    }))
    const r = await resolveAndPin('https://api.example.com/v1', { lookup: staticLookup(many) })
    expect(r.ok).toBe(false)
  })

  it('lookup 抛错拒绝', async () => {
    const r = await resolveAndPin('https://api.example.com/v1', {
      lookup: async () => {
        throw new Error('DNS fail')
      },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      // 错误内容不得暴露 lookup 抛出的原始信息或输入主机名
      expect(r.error).not.toMatch(/DNS fail/)
      expect(r.error).not.toMatch(/api\.example\.com/i)
    }
  })

  it('IP 字面量输入跳过 DNS', async () => {
    const r = await resolveAndPin(`https://${PUBLIC_V4_A}/v1`, { lookup: throwingLookup })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.pinnedAddress).toBe(PUBLIC_V4_A)
      expect(r.isIpLiteral).toBe(true)
      expect(r.pathPrefix).toBe('/v1')
    }
  })

  it('IP 字面量为私网时拒绝（仍无需 DNS）', async () => {
    const r = await resolveAndPin('https://10.0.0.1/v1', { lookup: throwingLookup })
    expect(r.ok).toBe(false)
  })

  it.each([
    ['裸主机名', 'huiliao.example.com'],
    ['host:port', 'huiliao.example.com:443'],
    ['带 scheme', 'https://huiliao.example.com'],
  ])('自递归拒绝 (%s)', async (_label, selfHost) => {
    const r = await resolveAndPin('https://huiliao.example.com/v1', {
      lookup: staticLookup([{ address: PUBLIC_V4_A, family: 4 }]),
      selfHosts: [selfHost],
    })
    expect(r.ok).toBe(false)
  })

  it('错误信息不泄漏 URL、主机名或 pinned 地址', async () => {
    const r = await resolveAndPin('https://secret-host.example.com/v1', {
      lookup: staticLookup([{ address: '10.0.0.5', family: 4 }]),
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).not.toMatch(/secret-host/i)
      expect(r.error).not.toMatch(/10\.0\.0\.5/)
    }
  })
})

describe('joinPath (regression guard for dropped /v1)', () => {
  it('拼接 /v1 与 /chat/completions', () => {
    expect(joinPath('/v1', '/chat/completions')).toBe('/v1/chat/completions')
  })

  it('空前缀 + /messages', () => {
    expect(joinPath('', '/messages')).toBe('/messages')
  })

  it('合并重复斜杠', () => {
    expect(joinPath('/v1/', '/chat')).toBe('/v1/chat')
    expect(joinPath('/v1', 'chat')).toBe('/v1/chat')
    expect(joinPath('/v1//', '//chat')).toBe('/v1/chat')
  })

  it('/v1beta + /models/x:generateContent 保留冒号', () => {
    expect(joinPath('/v1beta', '/models/gemini-1.5:generateContent')).toBe(
      '/v1beta/models/gemini-1.5:generateContent',
    )
  })
})
