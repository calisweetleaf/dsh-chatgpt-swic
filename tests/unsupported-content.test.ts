import { describe, expect, it, vi } from 'vitest'
import { MessageId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, GenerateOptions, Message } from '@deepseek-ai/dsh-llm'
import { ChatGptSiwcAdapter } from '../src/adapter.ts'
import { serializeRequest } from '../src/serialize.ts'
import { signedInStore } from './store-fixture.ts'

const imageBlock = {
  type: 'image',
  attachment: {
    attachmentId: 'sha256:synthetic-image-fixture',
    mediaType: 'image/png',
    bytes: 12,
    width: 2,
    height: 2,
    name: 'fixture.png',
  },
} as ContentBlock

const fileBlock = {
  type: 'file',
  attachment: {
    attachmentId: 'sha256:synthetic-file-fixture',
    name: 'fixture.txt',
    bytes: 12,
  },
} as ContentBlock

function userMessage(content: readonly ContentBlock[]): Message {
  return {
    id: MessageId('unsupported-content-fixture'),
    role: 'user',
    content,
    source: { kind: 'user' },
  }
}

const baseOptions: GenerateOptions = {
  provider: 'siwc-dsh-core',
  model: 'gpt-fixture',
  messages: [userMessage([{ type: 'text', text: 'inspect this' }, imageBlock])],
}

describe('SIWC unsupported attachment boundary', () => {
  it.each([
    ['image', imageBlock],
    ['file', fileBlock],
  ] as const)('rejects %s content locally with UNSUPPORTED_CONTENT', (_kind, block) => {
    expect(() => serializeRequest({
      ...baseOptions,
      messages: [userMessage([{ type: 'text', text: 'inspect this' }, block])],
    })).toThrow(expect.objectContaining({
      code: 'UNSUPPORTED_CONTENT',
    }))
  })

  it('rejects nested image content inside a tool result', () => {
    const nested: ContentBlock = {
      type: 'tool-result',
      toolCallId: 'fixture-call' as never,
      content: [imageBlock],
    }
    expect(() => serializeRequest({
      ...baseOptions,
      messages: [userMessage([nested])],
    })).toThrow(expect.objectContaining({
      code: 'UNSUPPORTED_CONTENT',
    }))
  })

  it.each([
    ['image', imageBlock],
    ['file', fileBlock],
  ] as const)('does not dispatch a provider request for %s input', async (_kind, block) => {
    const fetchFn = vi.fn<typeof fetch>()
    const adapter = new ChatGptSiwcAdapter({
      store: await signedInStore(),
      fetchFn,
    })
    const stream = adapter.stream({
      ...baseOptions,
      messages: [userMessage([{ type: 'text', text: 'inspect this' }, block])],
    })

    await expect(async () => {
      for await (const _chunk of stream) {
        // Unsupported input must fail before the response stream can yield.
      }
    }).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT' })
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
