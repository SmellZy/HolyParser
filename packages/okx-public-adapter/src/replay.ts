import type { OkxSessionOutcome } from "./book-session.js";
import { OkxBookSession } from "./book-session.js";
import type { OkxObservationTimes } from "./mapping.js";

export type OkxFault =
  | { readonly at: number; readonly type: "DROP" }
  | { readonly at: number; readonly type: "DUPLICATE" }
  | { readonly at: number; readonly type: "REPLACE"; readonly text: string };

export interface OkxReplayResult {
  readonly outcomes: ReadonlyArray<OkxSessionOutcome>;
  readonly executableBook?: {
    readonly bids: ReadonlyArray<readonly [string, string]>;
    readonly asks: ReadonlyArray<readonly [string, string]>;
    readonly lastUpdateId?: string;
  };
}

export function replayOkxFrames(
  session: OkxBookSession,
  frames: ReadonlyArray<string>,
  times: (index: number) => OkxObservationTimes,
  faults: ReadonlyArray<OkxFault> = [],
): OkxReplayResult {
  const faultByIndex = new Map(faults.map((fault) => [fault.at, fault]));
  const outcomes: OkxSessionOutcome[] = [];

  frames.forEach((original, index) => {
    const fault = faultByIndex.get(index);
    if (fault?.type === "DROP") {
      return;
    }
    const text = fault?.type === "REPLACE" ? fault.text : original;
    const repetitions = fault?.type === "DUPLICATE" ? 2 : 1;
    for (let attempt = 0; attempt < repetitions; attempt += 1) {
      outcomes.push(...session.processText(text, times(index)));
    }
  });

  const view = session.executableView();
  return Object.freeze({
    outcomes,
    ...(view === undefined
      ? {}
      : {
          executableBook: {
            bids: view.bids.map(
              (level) =>
                [level.price.toString(), level.quantity.toString()] as const,
            ),
            asks: view.asks.map(
              (level) =>
                [level.price.toString(), level.quantity.toString()] as const,
            ),
            ...(view.lastUpdateId === undefined
              ? {}
              : { lastUpdateId: view.lastUpdateId.toString() }),
          },
        }),
  });
}
