"use client";

export function playNotificationSound() {
  if (typeof window === "undefined") return;

  const audio = new Audio("/sounds/notification.mp3");
  audio.volume = 0.6; // Not too loud

  // Attempt to play the audio file
  audio.play().catch((error) => {
    // If the file doesn't exist (404) or autoplay is blocked by the browser without interaction,
    // fallback to a soft Web Audio API synth "pop" which sometimes bypasses restrictions 
    // or at least doesn't require an external file.
    console.warn("[Audio] Could not play notification.mp3, falling back to synth.", error.message);
    playSynthPop();
  });
}

function playSynthPop() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = "sine";
    // Create a pleasant, soft, high-pitched "pop/ding" sound
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime); // Low volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Ignore audio context errors (e.g., if strictly blocked by browser)
  }
}
