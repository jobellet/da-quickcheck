declare module 'jspsych' {
  type JsPsychTimelineData = Record<string, unknown>

  type JsPsychInitOptions = Record<string, unknown> & {
    display_element?: HTMLElement | null
    on_finish?: () => void
  }

  interface JsPsychPluginAPI {
    getKeyboardResponse: (...args: unknown[]) => unknown
    cancelKeyboardResponse: (...args: unknown[]) => void
    clearAllTimeouts: () => void
    setTimeout: (callback: () => void, delay?: number) => number
  }

  interface JsPsychDataModule {
    addProperties: (properties: Record<string, unknown>) => void
    get: () => {
      values: () => JsPsychTimelineData[]
    }
  }

  interface JsPsychInstance {
    data: JsPsychDataModule
    pluginAPI: JsPsychPluginAPI
    finishTrial: (data?: Record<string, unknown>) => void
    run: (timeline: unknown[]) => Promise<void>
    destroy?: () => void
    [key: string]: unknown
  }

  export function initJsPsych(options?: JsPsychInitOptions): JsPsychInstance

  export const ParameterType: {
    STRING: string
    INT: string
    [key: string]: string
  }
}
