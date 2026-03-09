import type { ObservabilityEventName } from "@/lib/observability";

type ClientEventName = Extract<
  ObservabilityEventName,
  "catalog_opened" | "product_added_to_cart" | "order_sent" | "client_error"
>;

export function trackClientEvent(
  name: ClientEventName,
  payload: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    name,
    payload,
    pathname: window.location.pathname,
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/events", blob);
    return;
  }

  void fetch("/api/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Ignore telemetry transport failures.
  });
}
