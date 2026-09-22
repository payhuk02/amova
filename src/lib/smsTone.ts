/** Soft SMS-style notification chime (Web Audio — no asset file). */
export async function playSmsTone(): Promise<void> {
  if (typeof window === "undefined") return;

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  const ctx = new AC();
  try {
    if (ctx.state === "suspended") await ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    // Classic short SMS-like double ping
    const notes = [
      { freq: 1200, start: 0, dur: 0.09 },
      { freq: 1500, start: 0.12, dur: 0.11 },
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + n.start);
      gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + n.start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.start + n.dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + n.start);
      osc.stop(ctx.currentTime + n.start + n.dur + 0.02);
    }

    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 500);
  } catch {
    void ctx.close().catch(() => undefined);
  }
}
