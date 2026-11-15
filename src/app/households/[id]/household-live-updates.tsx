"use client";
// Real-time balances (#11): refreshes the household page when another member changes it. With the
// Pusher env vars it subscribes to private-household-<id> over the browser WebSocket (Pusher protocol 7,
// auth from /api/pusher/auth); without them, or if the socket drops, it polls /version every 2 s.
// Renders nothing.
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_MS = 2000;

function pollVersion(householdId: string, onVersion: (version: number) => void): () => void {
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`/api/v1/households/${householdId}/version`, { cache: "no-store" });
      if (res.ok) onVersion((await res.json()).version);
    } catch {
      // Offline for a moment: the next tick tries again.
    }
  }, POLL_MS);
  return () => clearInterval(timer);
}

function subscribePusher(
  key: string,
  cluster: string,
  householdId: string,
  onUpdate: () => void,
  onDrop: () => void,
): () => void {
  const channel = `private-household-${householdId}`;
  const ws = new WebSocket(`wss://ws-${cluster}.pusher.com/app/${key}?protocol=7&client=slashsplit`);
  let closedByUs = false;
  ws.onmessage = async (message) => {
    const { event, data, channel: from } = JSON.parse(message.data);
    if (event === "pusher:connection_established") {
      const res = await fetch("/api/pusher/auth", {
        method: "POST",
        body: new URLSearchParams({ socket_id: JSON.parse(data).socket_id, channel_name: channel }),
      });
      if (!res.ok) return ws.close();
      const { auth } = await res.json();
      ws.send(JSON.stringify({ event: "pusher:subscribe", data: { channel, auth } }));
    } else if (event === "pusher:ping") {
      ws.send(JSON.stringify({ event: "pusher:pong", data: {} }));
    } else if (event === "household-updated" && from === channel) {
      onUpdate();
    }
  };
  ws.onclose = () => {
    if (!closedByUs) onDrop();
  };
  return () => {
    closedByUs = true;
    ws.close();
  };
}

export function HouseholdLiveUpdates(props: { householdId: string; version: number }) {
  const router = useRouter();
  const seenVersion = useRef(props.version);

  // A refresh (ours or a server action's) brings the latest version with it.
  useEffect(() => {
    seenVersion.current = props.version;
  }, [props.version]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    let stop = () => {};
    const startPolling = () => {
      stop = pollVersion(props.householdId, (version) => {
        if (version === seenVersion.current) return;
        seenVersion.current = version;
        router.refresh();
      });
    };
    if (key && cluster) {
      stop = subscribePusher(key, cluster, props.householdId, () => router.refresh(), startPolling);
    } else {
      startPolling();
    }
    return () => stop();
  }, [props.householdId, router]);

  return null;
}
