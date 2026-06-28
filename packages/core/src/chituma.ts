import { Agent, type AgentMemory } from './agent'
import type { Workflow } from './workflows'
import type { AnyToolAction } from './tools'
import type { Store } from './store'
import { ConsoleLogger } from './logger'
import type { Logger } from './types'

export interface ChitumaConfig {
  agents?: Record<string, Agent>
  workflows?: Record<string, Workflow>
  tools?: Record<string, AnyToolAction>
  storage?: Store
  memory?: AgentMemory
  logger?: Logger
}

/**
 * Central registry and orchestrator. Wires shared dependencies (logger, memory,
 * storage) into every registered component.
 */
export class Chituma {
  #agents: Record<string, Agent>
  #workflows: Record<string, Workflow>
  #tools: Record<string, AnyToolAction>
  #storage?: Store
  #memory?: AgentMemory
  #logger: Logger

  constructor(config: ChitumaConfig = {}) {
    this.#agents = config.agents ?? {}
    this.#workflows = config.workflows ?? {}
    this.#tools = config.tools ?? {}
    this.#storage = config.storage
    this.#memory = config.memory
    this.#logger = config.logger ?? new ConsoleLogger('info')

    for (const agent of Object.values(this.#agents)) {
      agent.__register({ logger: this.#logger, memory: this.#memory })
    }
    for (const wf of Object.values(this.#workflows)) {
      wf.logger = this.#logger
    }
  }

  getAgent(key: string): Agent {
    const agent = this.#agents[key]
    if (!agent) throw new Error(`Agent "${key}" is not registered.`)
    return agent
  }

  /** Look up an agent by its `id` property (may differ from the registry key). */
  getAgentById(id: string): Agent {
    const found = Object.values(this.#agents).find((a) => a.id === id)
    if (!found) throw new Error(`Agent with id "${id}" is not registered.`)
    return found
  }

  getAgents(): Record<string, Agent> {
    return { ...this.#agents }
  }

  getWorkflow(key: string): Workflow {
    const wf = this.#workflows[key]
    if (!wf) throw new Error(`Workflow "${key}" is not registered.`)
    return wf
  }

  getWorkflows(): Record<string, Workflow> {
    return { ...this.#workflows }
  }

  getTool(key: string): AnyToolAction {
    const tool = this.#tools[key]
    if (!tool) throw new Error(`Tool "${key}" is not registered.`)
    return tool
  }

  getStorage(): Store | undefined {
    return this.#storage
  }

  getLogger(): Logger {
    return this.#logger
  }
}
