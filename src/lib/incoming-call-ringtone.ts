/**
 * Programmatic incoming-call ringtone (no audio asset required).
 * Uses Web Audio API with a classic dual-tone pattern.
 */
export function createIncomingCallRingtone() {
  let audioContext: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let oscillators: OscillatorNode[] = [];
  let gainNode: GainNode | null = null;

  const stopOscillators = () => {
    oscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* already stopped */
      }
    });
    oscillators = [];
  };

  const playBurst = () => {
    if (!audioContext || !gainNode) return;

    stopOscillators();

    const freqs = [440, 480];
    freqs.forEach((freq) => {
      const osc = audioContext!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gainNode!);
      osc.start();
      oscillators.push(osc);
    });

    setTimeout(() => stopOscillators(), 1000);
  };

  const start = async () => {
    if (intervalId) return;

    audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    gainNode = audioContext.createGain();
    gainNode.gain.value = 0.15;
    gainNode.connect(audioContext.destination);

    playBurst();
    intervalId = setInterval(playBurst, 2000);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    stopOscillators();
    gainNode?.disconnect();
    gainNode = null;
    void audioContext?.close();
    audioContext = null;
  };

  return { start, stop };
}
