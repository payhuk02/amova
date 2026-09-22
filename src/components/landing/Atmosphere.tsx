/** Fixed cinematic atmosphere — grain, light wells, vignette (landing / auth). */
export default function Atmosphere() {
  return (
    <div className="amova-atmosphere" aria-hidden>
      <div className="amova-atmosphere__wells" />
      <div className="amova-atmosphere__vignette" />
      <div className="amova-atmosphere__grain" />
    </div>
  );
}
