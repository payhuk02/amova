/** Register the Amova service worker for background notifications. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return registration;
  } catch (error) {
    console.warn("Service worker registration failed:", error);
    return null;
  }
}

export async function showServiceWorkerNotification(
  title: string,
  options?: NotificationOptions & { url?: string },
): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/icon.png",
      badge: "/icon.png",
      ...options,
      data: { url: options?.url || "/notifications", ...(options?.data as object) },
    });
    return true;
  } catch {
    return false;
  }
}
