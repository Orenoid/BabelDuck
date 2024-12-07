'use client'

import { useEffect } from "react";
import { TTSTokenManager } from "./chat/lib/tts-token-manager";

export function ClientInit() {
  useEffect(() => {
    const initClient = async () => {
      console.log('Client initialization started');
      await TTSTokenManager.getInstance().getToken();
      console.log('Client initialization completed');
    };

    initClient();
  }, []);

  return <></>;
}