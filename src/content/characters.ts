import type { Character } from '@/types'

export const CHARACTERS: Character[] = [
  {
    id: 'lina',
    name: '林璐',
    age: 26,
    avatar: '/images/avatars/lina.svg',
    tagline: '插画师，刚认识不久，回复礼貌',
  },
  {
    id: 'ran',
    name: '周然',
    age: 28,
    avatar: '/images/avatars/ran.svg',
    tagline: '摄影爱好者，聊起爱好话会变多',
  },
  {
    id: 'yue',
    name: '陈悦',
    age: 27,
    avatar: '/images/avatars/yue.svg',
    tagline: '市场专员，最近项目很忙',
  },
  {
    id: 'yan',
    name: '苏妍',
    age: 29,
    avatar: '/images/avatars/yan.svg',
    tagline: '平面设计师，重视直接和坦诚',
  },
  {
    id: 'qing',
    name: '沈青',
    age: 30,
    avatar: '/images/avatars/qing.svg',
    tagline: '医生，作息规律，喜欢安静咖啡馆',
  },
  {
    id: 'tong',
    name: '吴桐',
    age: 27,
    avatar: '/images/avatars/tong.svg',
    tagline: '图书编辑，回复简洁但直接',
  },
  {
    id: 'zhao',
    name: '赵然',
    age: 28,
    avatar: '/images/avatars/zhao.svg',
    tagline: '画廊工作人员，性格慢热',
  },
  {
    id: 'jie',
    name: '何洁',
    age: 29,
    avatar: '/images/avatars/jie.svg',
    tagline: '新媒体运营，聚会时爱小酌两杯',
  },
]

export function getCharacter(id: string): Character {
  const found = CHARACTERS.find((c) => c.id === id)
  if (!found) throw new Error(`角色不存在：${id}`)
  return found
}
