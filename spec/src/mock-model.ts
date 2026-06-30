import type { LanguageModel } from 'ai'
import { MockLanguageModelV1 } from 'ai/test'

/** A model that always returns `text` from a single (non-streaming) call. */
export function textModel(text: string): LanguageModel {
  return new MockLanguageModelV1({
    doGenerate: async () => ({
      text,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }) as unknown as LanguageModel
}

/** A model that returns `obj` as JSON, for `generate(..., { output })`. */
export function objectModel(obj: unknown): LanguageModel {
  return new MockLanguageModelV1({
    defaultObjectGenerationMode: 'json',
    doGenerate: async () => ({
      text: JSON.stringify(obj),
      finishReason: 'stop',
      usage: { promptTokens: 4, completionTokens: 4 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }) as unknown as LanguageModel
}

/** A model that emits `chunks` as a token stream, for `agent.stream()`. */
export function streamingModel(chunks: string[]): LanguageModel {
  return new MockLanguageModelV1({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          for (const textDelta of chunks) {
            controller.enqueue({ type: 'text-delta', textDelta })
          }
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: { promptTokens: 3, completionTokens: chunks.length },
          })
          controller.close()
        },
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }) as unknown as LanguageModel
}
