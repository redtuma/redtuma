import { trace, SpanStatusCode } from '@opentelemetry/api'
import type { Span, Tracer, TracerProvider } from '@opentelemetry/api'
import type { Agent } from '@chituma/core'

/** Attribute values accepted by Chituma spans. */
export type SpanAttributes = Record<string, string | number | boolean>

/** Default instrumentation scope name for Chituma tracers. */
export const TRACER_NAME = '@chituma/observability'

/**
 * Register the global OpenTelemetry {@link TracerProvider}. Until a provider is
 * registered the API serves a no-op tracer, so instrumentation is inert by
 * default and only emits spans once the host application opts in.
 */
export function setTracerProvider(provider: TracerProvider): boolean {
  return trace.setGlobalTracerProvider(provider)
}

/**
 * Get a {@link Tracer} from the global API. Returns a no-op tracer until a
 * provider has been registered via {@link setTracerProvider}.
 */
export function getTracer(name: string = TRACER_NAME): Tracer {
  return trace.getTracer(name)
}

/**
 * Run `fn` inside a span. The span is created on the global tracer, gets the
 * supplied attributes, records exceptions and an ERROR status when `fn` throws
 * (rethrowing), is marked OK on success, and is always ended.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T> | T,
  opts: { attributes?: SpanAttributes; tracer?: Tracer } = {},
): Promise<T> {
  const tracer = opts.tracer ?? getTracer()
  const span = tracer.startSpan(name)
  if (opts.attributes) span.setAttributes(opts.attributes)
  try {
    const result = await fn(span)
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (err) {
    span.recordException(err as Error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    })
    throw err
  } finally {
    span.end()
  }
}

/**
 * Thin wrapper around a {@link Tracer} offering convenience helpers for tracing
 * work. Defaults to the global tracer, so it is a no-op until a provider is
 * registered.
 */
export class Telemetry {
  readonly tracer: Tracer

  constructor(tracer: Tracer = getTracer()) {
    this.tracer = tracer
  }

  /** Trace `fn` in a span named `name` with optional attributes. */
  trace<T>(name: string, fn: (span: Span) => Promise<T> | T, attributes?: SpanAttributes): Promise<T> {
    return withSpan(name, fn, { attributes, tracer: this.tracer })
  }
}

/**
 * Wrap an {@link Agent} so its `generate`/`stream` calls are traced. Returns a
 * proxy that delegates every member to the real agent, intercepting only
 * `generate` and `stream` to run them inside an `agent.generate`/`agent.stream`
 * span tagged with `agent.id`. Return types are preserved.
 */
export function instrumentAgent<A extends Agent>(agent: A): A {
  return new Proxy(agent, {
    get(target, prop, receiver) {
      if (prop === 'generate') {
        const original = target.generate
        return function instrumentedGenerate(
          ...args: Parameters<Agent['generate']>
        ): ReturnType<Agent['generate']> {
          return withSpan('agent.generate', () => Reflect.apply(original, target, args), {
            attributes: { 'agent.id': target.id },
          })
        }
      }
      if (prop === 'stream') {
        const original = target.stream
        return function instrumentedStream(
          ...args: Parameters<Agent['stream']>
        ): ReturnType<Agent['stream']> {
          return withSpan('agent.stream', () => Reflect.apply(original, target, args), {
            attributes: { 'agent.id': target.id },
          })
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

/**
 * A minimal {@link Span}-shaped logger that prints each finished span to the
 * console. Useful for local debugging without wiring a full SDK exporter; pass
 * the corresponding processor/exporter from `@opentelemetry/sdk-trace-base`.
 */
export class ConsoleSpanLogger {
  constructor(private readonly log: (message: string) => void = console.log) {}

  record(name: string, attributes?: SpanAttributes): void {
    this.log(`[span] ${name}${attributes ? ` ${JSON.stringify(attributes)}` : ''}`)
  }
}
