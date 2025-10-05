import type { JsPsychInitializer } from '../../lib/jspsych'
import { ParameterType } from 'jspsych'
import type { Resp, Stim } from './types'

export const N_TRIALS = 30
export const P_GO = 0.7
export const RWD_CORRECT = 0.9
export const PUN_INCORRECT = 0.9

const KEY_TO_RESP: Record<string, Resp> = {
  ' ': 'PRESS',
  space: 'PRESS',
  Spacebar: 'PRESS',
  Space: 'PRESS',
  n: 'NONE',
  N: 'NONE',
}

const BUTTONS: { resp: Resp; label: string }[] = [
  { resp: 'PRESS', label: 'PRESS' },
  { resp: 'NONE', label: 'NO PRESS' },
]

function generateStimuli(): Stim[] {
  return Array.from({ length: N_TRIALS }, () => (Math.random() < P_GO ? 'GO' : 'NOGO'))
}

type TrialDataPayload = {
  cue: Stim
  resp: Resp
  correct: 0 | 1
  reward: 0 | 1
  rt: number
  trial_index: number
}

export function createGoNoGoInitializer(): JsPsychInitializer {
  return (jsPsych) => {
    const stimuli = generateStimuli()

    const info = {
      name: 'gonogo-trial',
      parameters: {
        cue: {
          type: ParameterType.STRING,
          pretty_name: 'Cue',
        },
        trial_index: {
          type: ParameterType.INT,
          pretty_name: 'Trial index',
        },
      },
    } as const

    const goNoGoTrial = {
      info,
      trial(display_element: HTMLElement, trial: { cue: Stim; trial_index: number }) {
        display_element.innerHTML = ''

        const container = document.createElement('div')
        container.className = 'gonogo-jspsych-stage'

        const cueEl = document.createElement('div')
        cueEl.className = 'gonogo-jspsych-cue'
        cueEl.textContent = trial.cue

        const helper = document.createElement('p')
        helper.className = 'gonogo-jspsych-helper'
        helper.innerHTML =
          'Keyboard: <kbd>Space</kbd> = PRESS, <kbd>N</kbd> = NO PRESS. You can also use the buttons below.'

        const buttonsWrap = document.createElement('div')
        buttonsWrap.className = 'gonogo-jspsych-buttons'

        container.appendChild(cueEl)
        container.appendChild(helper)
        container.appendChild(buttonsWrap)
        display_element.appendChild(container)

        let responded = false
        let keyboardListener: ReturnType<typeof jsPsych.pluginAPI.getKeyboardResponse> | null = null
        const startTime = performance.now()

        const finishTrial = (resp: Resp, responseTime?: number) => {
          if (responded) return
          responded = true

          if (keyboardListener !== null) {
            jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener)
          }
          jsPsych.pluginAPI.clearAllTimeouts()

          const correct =
            (trial.cue === 'GO' && resp === 'PRESS') || (trial.cue === 'NOGO' && resp === 'NONE')
          const base = correct ? RWD_CORRECT : 1 - PUN_INCORRECT
          const reward = Math.random() < base ? 1 : 0
          const rt =
            typeof responseTime === 'number'
              ? Math.max(0, Math.round(responseTime))
              : Math.round(performance.now() - startTime)

          const payload: TrialDataPayload = {
            cue: trial.cue,
            resp,
            correct: correct ? 1 : 0,
            reward: reward ? 1 : 0,
            rt,
            trial_index: trial.trial_index,
          }

          display_element.innerHTML = ''
          jsPsych.finishTrial(payload)
        }

        const handleButton = (resp: Resp) => () => {
          const elapsed = performance.now() - startTime
          finishTrial(resp, elapsed)
        }

        BUTTONS.forEach(({ resp, label }) => {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = resp === 'PRESS' ? 'btn primary' : 'btn'
          btn.dataset.resp = resp
          btn.textContent = label
          btn.addEventListener('click', handleButton(resp))
          buttonsWrap.appendChild(btn)
        })

        keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: (info: { key: string; rt: number }) => {
            const key = info.key in KEY_TO_RESP ? KEY_TO_RESP[info.key] : KEY_TO_RESP[info.key.toLowerCase()]
            if (!key) return
            finishTrial(key, info.rt)
          },
          valid_responses: [' ', 'space', 'Space', 'Spacebar', 'n', 'N'],
          rt_method: 'performance',
          persist: false,
          allow_held_key: false,
        })

        jsPsych.pluginAPI.setTimeout(() => {
          cueEl.classList.add('gonogo-jspsych-cue--dim')
        }, 700)

        jsPsych.pluginAPI.setTimeout(() => {
          finishTrial('NONE')
        }, 1500)
      },
    }

    const timeline = stimuli.map((cue, index) => ({
      type: goNoGoTrial,
      cue,
      trial_index: index,
      data: {
        scheduled_cue: cue,
      },
    }))

    return jsPsych.run(timeline)
  }
}

export type { TrialDataPayload }
