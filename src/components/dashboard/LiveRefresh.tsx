"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SOUND_KEY = "rio_staff_sound_enabled";

function playBeep() {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.1;

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.22);

  oscillator.onended = () => {
    void context.close();
  };
}

export default function LiveRefresh() {
  const router = useRouter();

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const soundEnabledRef = useRef(false);
  const latestIdRef = useRef<string | null | undefined>(undefined);
  const countRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const saved = window.localStorage.getItem(SOUND_KEY);
    const enabled = saved === "1";

    soundEnabledRef.current = enabled;
    // Hydrate a browser-only preference once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundEnabled(enabled);
  }, []);

  useEffect(() => {
    let stopped = false;

    async function checkRequests() {
      try {
        const response = await fetch("/api/staff/status", {
          cache: "no-store",
        });

        if (!response.ok || stopped) {
          return;
        }

        const result = (await response.json()) as {
          count: number;
          latestId: string | null;
        };

        // Eerste controle: alleen huidige toestand onthouden.
        if (
          latestIdRef.current === undefined ||
          countRef.current === undefined
        ) {
          latestIdRef.current = result.latestId;
          countRef.current = result.count;
          return;
        }

        const newRequest =
          result.latestId !== null &&
          result.latestId !== latestIdRef.current;

        const countChanged = result.count !== countRef.current;

        if (newRequest) {
          setShowAlert(true);

          if (soundEnabledRef.current) {
            playBeep();
          }
        }

        if (newRequest || countChanged) {
          router.refresh();
        }

        latestIdRef.current = result.latestId;
        countRef.current = result.count;
      } catch {
        // Bij een tijdelijke netwerkfout proberen we bij de volgende ronde opnieuw.
      }
    }

    void checkRequests();

    const timer = window.setInterval(() => {
      void checkRequests();
    }, 3000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [router]);

  useEffect(() => {
    if (!showAlert) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowAlert(false);
    }, 8000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [showAlert]);

  function toggleSound() {
    const next = !soundEnabled;

    setSoundEnabled(next);
    soundEnabledRef.current = next;

    window.localStorage.setItem(
      SOUND_KEY,
      next ? "1" : "0"
    );

    if (next) {
      playBeep();
    }
  }

  return (
    <>
      {showAlert && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "#171714",
            color: "#fff",
            padding: "16px 24px",
            borderRadius: "999px",
            fontWeight: 800,
            boxShadow: "0 14px 40px rgba(0,0,0,.20)",
          }}
        >
          🔔 Nieuwe tafelmelding ontvangen
        </div>
      )}

      <button
        type="button"
        onClick={toggleSound}
        style={{
          position: "fixed",
          right: "24px",
          bottom: "24px",
          zIndex: 9999,
          border: 0,
          borderRadius: "999px",
          padding: "13px 20px",
          background: soundEnabled ? "#171714" : "#fff",
          color: soundEnabled ? "#fff" : "#171714",
          boxShadow: "0 10px 30px rgba(0,0,0,.12)",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {soundEnabled ? "🔔 Geluid aan" : "🔕 Geluid uit"}
      </button>
    </>
  );
}
