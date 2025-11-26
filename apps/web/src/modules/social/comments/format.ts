export function formatRelativeTime(iso: string, locale: string): string {
  const date = new Date(iso)
  const rawDiff = Math.floor((Date.now() - date.getTime()) / 1000)
  const diffSeconds = Math.min(Math.max(rawDiff, -2_592_000), 2_592_000)

  const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, 'seconds'],
    [60, 'minutes'],
    [24, 'hours'],
    [7, 'days'],
    [4.34524, 'weeks'],
    [12, 'months'],
    [Number.POSITIVE_INFINITY, 'years'],
  ]

  let unit: Intl.RelativeTimeFormatUnit = 'seconds'
  let value = diffSeconds

  for (const [amount, nextUnit] of divisions) {
    if (Math.abs(value) < amount) {
      unit = nextUnit
      break
    }
    value /= amount
  }

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  return formatter.format(Math.round(-value), unit)
}
