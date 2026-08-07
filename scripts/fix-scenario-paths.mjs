// 一次性脚本：按计划阶段 B 修正场景图——risky 选项不得续走至正向结局。
// 修改项：(文件, 场景id, 选项id, {quality?, goesTo?, boundaryNote?})
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const EDITS = [
  // s02：追问/玩笑/过早邀约 → 冷却结局（不再续走至 end-good）
  ['scenarios-a.ts', 's02', 'n1c', { goesTo: 'end-cooling' }],
  ['scenarios-a.ts', 's02', 'n2c', { goesTo: 'end-cooling' }],
  ['scenarios-a.ts', 's02', 'n3c', { goesTo: 'end-cooling' }],
  // s03：打探经济/顺势约单独见面 → 冷却结局
  ['scenarios-a.ts', 's03', 'n1c', { goesTo: 'end-cooling' }],
  ['scenarios-a.ts', 's03', 'n2c', { goesTo: 'end-cooling' }],
  // s04：质问 → 冷却；焦虑压迫 → 停止
  ['scenarios-a.ts', 's04', 'n1c', { goesTo: 'end-cooling' }],
  ['scenarios-a.ts', 's04', 'n2c', { goesTo: 'end-cooling' }],
  ['scenarios-a.ts', 's04', 'n3c', { goesTo: 'end-stop' }],
  // s05：情感绑架/逼问 → 中性结局
  ['scenarios-b.ts', 's05', 'n1c', { goesTo: 'end-neutral' }],
  ['scenarios-b.ts', 's05', 'n2c', { goesTo: 'end-neutral' }],
  // s06：无出口邀约/替对方安排 → 中性结局
  ['scenarios-b.ts', 's06', 'n2c', { goesTo: 'end-neutral' }],
  ['scenarios-b.ts', 's06', 'n3c', { goesTo: 'end-neutral' }],
  // s07：追问原因纠缠 → 拒绝结局
  ['scenarios-b.ts', 's07', 'n1c', { goesTo: 'end-rejection' }],
  // s09：回避沟通/推卸责任/贬低重视 → 拒绝结局
  ['scenarios-c.ts', 's09', 'n1c', { goesTo: 'end-rejection' }],
  ['scenarios-c.ts', 's09', 'n2c', { goesTo: 'end-rejection' }],
  ['scenarios-c.ts', 's09', 'n3c', { goesTo: 'end-rejection' }],
  // s10：醉酒带往私人住处 → 降级为 risky 并进入中性结局
  ['scenarios-c.ts', 's10', 'n1b', {
    quality: 'risky',
    goesTo: 'end-neutral',
    boundaryNote: '醉酒状态下带对方去私人空间，即使声称“只喝茶”，也属于推进安排。',
  }],
  // s10：对方明确回家仍往自己住处走 → risky 并进入拒绝结局
  ['scenarios-c.ts', 's10', 'n2b', {
    quality: 'risky',
    goesTo: 'end-rejection',
    boundaryNote: '对方明确表达要回家，任何方向相反的安排都必须立即停止。',
  }],
]

for (const [file, scenarioId, choiceId, patch] of EDITS) {
  const path = join(ROOT, 'src', 'content', file)
  let src = readFileSync(path, 'utf8')

  // 定位到场景块
  const scenarioStart = src.indexOf(`    id: '${scenarioId}',`)
  if (scenarioStart < 0) throw new Error(`找不到场景 ${scenarioId} 于 ${file}`)
  const scenarioBlock = src.slice(scenarioStart)

  // 定位选项块（选项 id 后到 goesTo 行）
  const choiceStart = scenarioBlock.indexOf(`            id: '${choiceId}',`)
  if (choiceStart < 0) throw new Error(`找不到选项 ${scenarioId}/${choiceId}`)
  const choiceBlock = scenarioBlock.slice(choiceStart)
  const choiceEnd = choiceBlock.indexOf('          },')
  if (choiceEnd < 0) throw new Error(`选项块未结束 ${scenarioId}/${choiceId}`)
  const blockText = choiceBlock.slice(0, choiceEnd)

  let next = blockText
  if (patch.quality) {
    next = next.replace(/(quality: ')(ok|good|risky)(')/, `$1${patch.quality}$3`)
  }
  if (patch.goesTo) {
    next = next.replace(/(goesTo: ')([^']+)(')/, `$1${patch.goesTo}$3`)
  }
  if (patch.boundaryNote) {
    next = next.replace(/(boundaryNote: ')([^']*)(')/, `$1${patch.boundaryNote}$3`)
  }
  if (next === blockText) throw new Error(`未产生修改 ${scenarioId}/${choiceId}`)

  src = src.slice(0, scenarioStart) + scenarioBlock.replace(blockText, next)
  writeFileSync(path, src)
  console.log(`已修改 ${scenarioId}/${choiceId} → ${JSON.stringify(patch)}`)
}
