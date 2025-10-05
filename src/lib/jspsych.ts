import { initJsPsych } from "jspsych";

type JsPsychInstance = ReturnType<typeof initJsPsych>;

export type JsPsychRunResult = {
  data: Record<string, unknown>[];
  startedAt: number;
  finishedAt: number;
  taskName: string;
};

export type RunJsPsychOptions = {
  taskName: string;
};

export type JsPsychInitializer = (
  jsPsych: JsPsychInstance,
  container: HTMLElement
) => Promise<void> | void;

export async function runJsPsych(
  init: JsPsychInitializer,
  container: HTMLElement,
  options: RunJsPsychOptions
): Promise<JsPsychRunResult> {
  if (!(container instanceof HTMLElement)) {
    throw new Error("A valid container HTMLElement must be provided to runJsPsych");
  }

  const { taskName } = options;
  if (!taskName) {
    throw new Error("runJsPsych requires a non-empty taskName option");
  }
  container.replaceChildren();

  const startedAt = Date.now();
  let finishedAt = startedAt;

  let resolveFinish: (() => void) | undefined;
  const finished = new Promise<void>((resolve) => {
    resolveFinish = resolve;
  });

  const jsPsych = initJsPsych({
    display_element: container,
    on_finish: () => {
      finishedAt = Date.now();
      resolveFinish?.();
    },
  });

  jsPsych.data.addProperties({ taskName, startedAt });

  await init(jsPsych, container);

  await finished;

  const data = jsPsych
    .data
    .get()
    .values()
    .map((entry) => ({
      ...entry,
      taskName,
      startedAt,
      finishedAt,
    }));

  container.replaceChildren();

  const destroy = (jsPsych as { destroy?: () => void }).destroy;
  if (typeof destroy === "function") {
    destroy.call(jsPsych);
  }

  return {
    data,
    startedAt,
    finishedAt,
    taskName,
  };
}
