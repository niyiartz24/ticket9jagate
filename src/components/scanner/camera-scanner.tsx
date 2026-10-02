"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Flashlight, FlashlightOff, SwitchCamera, Keyboard } from "lucide-react";

interface Props {
  /** Called once per distinct scan; the component debounces rapid repeats internally. */
  onScan: (rawValue: string) => void;
  onManualEntry: () => void;
  /** Pause camera decoding while a result is being shown/acknowledged. */
  paused: boolean;
}

const SUPPORTED_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];

export function CameraScanner({ onScan, onManualEntry, paused }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const handleDetected = useCallback(
    (rawValue: string) => {
      const now = Date.now();
      // Debounce: ignore the same value re-detected within 2s (rapid repeat
      // frames from a camera pointed at a static code).
      if (lastScanRef.current.value === rawValue && now - lastScanRef.current.at < 2000) {
        return;
      }
      lastScanRef.current = { value: rawValue, at: now };
      onScan(rawValue);
    },
    [onScan]
  );

  useEffect(() => {
    if (paused) {
      controlsRef.current?.stop();
      return;
    }

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode } },
        videoRef.current!,
        (result) => {
          if (result && !cancelled) handleDetected(result.getText());
        }
      )
      .then((controls) => {
        controlsRef.current = controls;
        const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setTorchSupported(!!capabilities?.torch);
      })
      .catch(() => {
        setPermissionError(
          "Camera access is required to scan tickets. Please enable camera permission in your browser settings."
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [paused, facingMode, handleDetected]);

  async function toggleTorch() {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(!torchOn);
    } catch {
      // Torch toggle isn't universally supported — fail silently, the
      // button simply has no effect on unsupported devices.
    }
  }

  if (permissionError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-gate-border bg-gate-surface p-8 text-center">
        <p className="text-gate-text">{permissionError}</p>
        <button
          onClick={onManualEntry}
          className="rounded-lg border border-gate-border px-4 py-2 text-sm text-gate-text hover:bg-gate-surfaceRaised"
        >
          Enter ticket code manually
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

      {/* Scanning frame overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-56 w-56 rounded-2xl border-2 border-white/70" />
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
        {torchSupported && (
          <button
            onClick={toggleTorch}
            aria-label={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
            className="rounded-full bg-black/60 p-3 text-white backdrop-blur"
          >
            {torchOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
          </button>
        )}
        <button
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          aria-label="Switch camera"
          className="rounded-full bg-black/60 p-3 text-white backdrop-blur"
        >
          <SwitchCamera size={20} />
        </button>
        <button
          onClick={onManualEntry}
          aria-label="Enter ticket code manually"
          className="rounded-full bg-black/60 p-3 text-white backdrop-blur"
        >
          <Keyboard size={20} />
        </button>
      </div>
    </div>
  );
}
