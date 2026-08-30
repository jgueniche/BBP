"use client";

import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { useEffect, useRef } from "react";

export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    if (videoRef.current) {
      reader
        .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result && !detectedRef.current && !cancelled) {
            detectedRef.current = true;
            controlsRef.current?.stop();
            onDetected(result.getText());
          }
        })
        .then((controls) => {
          controlsRef.current = controls;
          if (cancelled) controls.stop();
        })
        .catch(() => {
          // Camera unavailable or permission denied; the dialog stays empty.
        });
    }

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <video
      ref={videoRef}
      className="aspect-[4/3] w-full rounded-[16px] border-2 border-ink bg-ink object-cover"
      muted
      playsInline
    />
  );
}
