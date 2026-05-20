import { useCallback, useReducer } from "react";

const MAX_HISTORY = 50;

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

type Action<T> =
  | { type: "push"; state: T }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; state: T };

function reducer<T>(state: HistoryState<T>, action: Action<T>): HistoryState<T> {
  switch (action.type) {
    case "push":
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
        present: action.state,
        future: [],
      };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    case "reset":
      return { past: [], present: action.state, future: [] };
  }
}

export function useUndoRedo<T>(initial: T) {
  const [state, dispatch] = useReducer(reducer<T>, {
    past: [],
    present: initial,
    future: [],
  });

  const push = useCallback((s: T) => dispatch({ type: "push", state: s }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((s: T) => dispatch({ type: "reset", state: s }), []);

  return {
    current: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    push,
    undo,
    redo,
    reset,
  };
}
