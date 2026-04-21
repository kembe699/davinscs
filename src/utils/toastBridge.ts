/** Fire a toast notification from anywhere — even outside React context. */
export function showGlobalToast(
  message: string,
  type: "success" | "error" | "warning" | "info" = "info",
  title?: string,
) {
  window.dispatchEvent(
    new CustomEvent("global-toast", { detail: { message, type, title } }),
  );
}
