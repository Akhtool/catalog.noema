export type ObservabilityEventName =
  | "business_created"
  | "catalog_published"
  | "catalog_opened"
  | "product_added_to_cart"
  | "order_sent"
  | "client_error";

type ObservabilityPayload = Record<string, unknown>;

function shouldWriteObservabilityLog() {
  return process.env.NODE_ENV !== "test";
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Unknown error",
    stack: null,
  };
}

export function trackServerEvent(
  name: ObservabilityEventName,
  payload: ObservabilityPayload = {}
) {
  if (!shouldWriteObservabilityLog()) return;

  console.info(
    JSON.stringify({
      type: "event",
      name,
      payload,
      ts: new Date().toISOString(),
    })
  );
}

export function logServerError(
  scope: string,
  error: unknown,
  context: ObservabilityPayload = {}
) {
  if (!shouldWriteObservabilityLog()) return;

  console.error(
    JSON.stringify({
      type: "error",
      scope,
      error: stringifyError(error),
      context,
      ts: new Date().toISOString(),
    })
  );
}
