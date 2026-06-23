import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { POST } from '@/app/api/chat/route'
import { createEmptyDiagram } from '@/lib/model/diagram'

// These tests exercise the offline branches of the chat route (cleanup,
// generate fallback, explain fallback) so CI never needs an OpenAI key and no
// live request is ever made.
let savedKey: string | undefined

beforeAll(() => {
  savedKey = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY
})

afterAll(() => {
  if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey
})

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function diagramWithTwoNodes() {
  const diagram = createEmptyDiagram()
  diagram.nodes.push(
    { id: 'a', type: 'rect', x: 0, y: 0, w: 120, h: 60, text: 'A' },
    { id: 'b', type: 'rect', x: 300, y: 300, w: 120, h: 60, text: 'B' }
  )
  diagram.edges.push({ id: 'e1', from: { nodeId: 'a' }, to: { nodeId: 'b' } })
  return diagram
}

const userMessage = { id: '1', role: 'user', parts: [{ type: 'text', text: 'do it' }] }

describe('POST /api/chat', () => {
  it('rejects an invalid diagram payload with 400', async () => {
    const res = await POST(buildRequest({ messages: [], diagram: { nope: true }, action: 'cleanup' }))
    expect(res.status).toBe(400)
  })

  it('cleanup streams a layout diff without an API key', async () => {
    const res = await POST(
      buildRequest({ messages: [userMessage], diagram: diagramWithTwoNodes(), action: 'cleanup' })
    )
    const text = await res.text()
    expect(text).toContain('data-diff')
    expect(text).toContain('updateNode')
  })

  it('generate falls back to a local draft diff without an API key', async () => {
    const res = await POST(
      buildRequest({
        messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'login then dashboard' }] }],
        diagram: createEmptyDiagram(),
        action: 'generate',
      })
    )
    const text = await res.text()
    expect(text).toContain('data-diff')
    expect(text).toContain('addNode')
  })

  it('explain returns guidance text without an API key', async () => {
    const res = await POST(
      buildRequest({ messages: [userMessage], diagram: diagramWithTwoNodes(), action: 'explain' })
    )
    const text = await res.text()
    expect(text.toLowerCase()).toContain('openai_api_key')
  })
})
