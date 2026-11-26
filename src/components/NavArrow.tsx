import nextArrow from '../resources/images/assets/Next.svg'

/**
 * Previous/next puzzle arrow, flanking the header's number/date box: the
 * designer's yellow triangle, pointing right, mirrored for "prev". With no
 * `onClick` (no puzzle that way) it keeps its space but hides, so the date
 * box never shifts between days.
 */
export function NavArrow({
  direction,
  onClick,
}: {
  direction: 'prev' | 'next'
  onClick?: () => void
}) {
  const label = direction === 'prev' ? 'Previous puzzle' : 'Next puzzle'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-8 shrink-0 items-center justify-center transition-transform duration-75 hover:scale-110 active:scale-95 disabled:invisible lg:h-12 lg:w-11"
    >
      <img
        src={nextArrow}
        alt=""
        aria-hidden
        draggable={false}
        className={`arrow-outline h-7 w-7 object-contain lg:h-8 lg:w-8 ${
          direction === 'prev' ? '-scale-x-100' : ''
        }`}
      />
    </button>
  )
}
