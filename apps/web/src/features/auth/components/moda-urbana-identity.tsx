const MODA_URBANA_LOGO = '/moda-urbana-logo.png'

export function ModaUrbanaIdentity() {
  return (
    <>
      <img
        src={MODA_URBANA_LOGO}
        alt="Moda Urbana"
        draggable={false}
        className="mx-auto mb-3 size-[200px] rounded-full object-cover"
      />
      <p className="mb-16 text-center text-xs font-medium tracking-[0.32em] text-amber-200/80 uppercase">
        Moda Urbana
      </p>
    </>
  )
}
