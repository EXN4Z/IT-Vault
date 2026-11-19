import { api } from './api'; // sesuaikan path ke axios instance-mu

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

export type EnablePushResult = 'ok' | 'denied' | 'unsupported';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// subscription yang sedang aktif di browser ini (null kalau belum ada)
export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function enablePush(): Promise<EnablePushResult> {
  if (!isPushSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await api.post('/push-subscriptions', sub.toJSON());
  return 'ok';
}

export async function disablePush() {
  const sub = await getPushSubscription();
  if (!sub) return;

  // hapus di backend dulu, baru unsubscribe di browser
  await api.delete('/push-subscriptions', { data: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}