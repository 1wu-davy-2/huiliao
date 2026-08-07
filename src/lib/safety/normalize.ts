// 输入规范化：统一全角/半角数字与标点、压缩空白。
// 分类器只基于规范化后的文本做匹配，避免同一意图因写法不同而漏检。
export function normalizeInput(text: string): string {
  return text
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/！/g, '!')
    .replace(/？/g, '?')
    .replace(/[，、；：]/g, ',')
    .replace(/[。．]/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}
