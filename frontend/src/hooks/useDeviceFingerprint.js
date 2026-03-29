import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFingerprint() {
      const agent = await FingerprintJS.load();
      const result = await agent.get();
      if (!cancelled) {
        setFingerprint(result.visitorId);
      }
    }

    loadFingerprint();

    return () => {
      cancelled = true;
    };
  }, []);

  return fingerprint;
}
