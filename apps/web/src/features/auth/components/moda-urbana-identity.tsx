const MODA_URBANA_LOGO = '/moda-urbana-logo.png'

export function ModaUrbanaIdentity() {
  return (
    <>
      <img
        src={MODA_URBANA_LOGO}
        alt="Moda Urbana"
        draggable={false}
        className="login-identity-mark mx-auto mb-3 block h-auto w-[min(14rem,72%)] max-w-full select-none object-contain py-2"
      />
      <p className="mb-16 text-center text-xs font-medium tracking-[0.32em] text-amber-200/80 uppercase">
        Moda Urbana
      </p>
    </>
  )
}
