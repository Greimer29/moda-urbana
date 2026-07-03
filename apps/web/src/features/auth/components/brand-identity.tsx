import { brand } from '@/lib/brand-config'

export function BrandIdentity() {
  return (
    <>
      <img
        src={brand.logoUrl}
        alt={brand.legalName}
        draggable={false}
        className="mx-auto mb-3 size-[200px] rounded-full object-cover"
      />
      <p className="mb-2 text-center text-xs font-medium tracking-[0.32em] text-amber-200/80 uppercase">
        {brand.legalName}
      </p>
      {brand.tagline ? (
        <p className="mb-16 text-center text-xs text-white/60">{brand.tagline}</p>
      ) : (
        <div className="mb-16" />
      )}
    </>
  )
}
