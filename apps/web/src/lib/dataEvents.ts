export type DataChangeEvent = {
  method: string;
  path: string;
};

const EVENT_NAME = "openweb:data-changed";

export function emitDataChange(event: DataChangeEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DataChangeEvent>(EVENT_NAME, { detail: event }));
}

export function onDataChange(listener: (event: DataChangeEvent) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<DataChangeEvent>;
    listener(custom.detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

