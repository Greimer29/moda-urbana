const MODA_URBANA_LOGO = '/moda-urbana-logo.png'

export function ModaUrbanaIdentity() {
  return (
    <>
      <div className="login-identity-mark-wrap mx-auto mb-3 w-[min(14rem,72%)]">
        <img
          src={MODA_URBANA_LOGO}
          alt="Moda Urbana"
          draggable={false}
          className="login-identity-mark block h-auto w-full select-none object-contain py-2"
        />
      </div>
      <p className="mb-16 text-center text-xs font-medium tracking-[0.32em] text-amber-200/80 uppercase">
        Moda Urbana
      </p>
    </>
  )
}
