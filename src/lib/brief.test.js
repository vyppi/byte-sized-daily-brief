import { describe, expect, it } from 'vitest'
import { filterItems, readingTime } from './brief.js'

const items = [
  { title: 'Runtime design', track: 'engineering', section: 'brief', source: 'A' },
  { title: 'Team design', track: 'management', section: 'brief', source: 'B' },
  { title: 'Shared update', track: 'both', section: 'brief', source: 'C' }
]

describe('filterItems', () => {
  it('includes shared items in either track', () => {
    expect(filterItems(items, { track: 'engineering' })).toHaveLength(2)
  })

  it('matches search text across item metadata', () => {
    expect(filterItems(items, { query: 'team' })).toEqual([items[1]])
  })
})

describe('readingTime', () => {
  it('keeps estimates within the product range', () => {
    expect(readingTime({ readingMinutes: 1 })).toBe(3)
    expect(readingTime({ readingMinutes: 20 })).toBe(12)
  })
})
