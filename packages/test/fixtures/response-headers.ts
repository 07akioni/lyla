export type HeaderFixture = {
  name: string
  fields: Array<[string, string]>
  expected: Record<string, string>
}

export const headerFixtures: HeaderFixture[] = [
  { name: 'empty header list', fields: [], expected: {} },
  {
    name: 'mixed-case names',
    fields: [['X-MiXeD', 'value'], ['X_Underscore', 'under'], ['X-Number-123', '123']],
    expected: { 'x-mixed': 'value', x_underscore: 'under', 'x-number-123': '123' }
  },
  {
    name: 'colons in dates and URLs',
    fields: [
      ['Date', 'Fri, 30 Oct 2026 08:00:00 GMT'],
      ['Location', 'https://example.com:8443/path?next=https://other.example/'],
      ['X-Time', '12:34:56']
    ],
    expected: {
      date: 'Fri, 30 Oct 2026 08:00:00 GMT',
      location: 'https://example.com:8443/path?next=https://other.example/',
      'x-time': '12:34:56'
    }
  },
  {
    name: 'empty values and HTTP whitespace',
    fields: [['X-Empty', ''], ['X-Padded', ' \tvalue\t '], ['X-Internal', 'a  b\tc']],
    expected: { 'x-empty': '', 'x-padded': 'value', 'x-internal': 'a  b\tc' }
  },
  {
    name: 'Latin-1 and non-HTTP whitespace',
    fields: [['X-Latin', 'caf\u00e9'], ['X-Nbsp', '\u00a0value\u00a0']],
    expected: { 'x-latin': 'caf\u00e9', 'x-nbsp': '\u00a0value\u00a0' }
  },
  {
    name: 'repeated case-insensitive names',
    fields: [['X-Multi', 'first'], ['x-multi', 'second'], ['X-MULTI', 'third']],
    expected: { 'x-multi': 'first, second, third' }
  },
  {
    name: 'repeated headers with empty values',
    fields: [['X-Multi', ''], ['x-multi', 'value'], ['X-Multi', '']],
    expected: { 'x-multi': ', value, ' }
  },
  {
    name: 'quoted commas, semicolons and equals signs',
    fields: [
      ['Content-Disposition', 'attachment; filename="a,b=c.txt"'],
      ['Link', '<https://example.com/a>; rel="next", <https://example.com/b>; rel="last"']
    ],
    expected: {
      'content-disposition': 'attachment; filename="a,b=c.txt"',
      link: '<https://example.com/a>; rel="next", <https://example.com/b>; rel="last"'
    }
  },
  {
    name: 'long values',
    fields: [['X-Long', 'value:'.repeat(300)]],
    expected: { 'x-long': 'value:'.repeat(300) }
  },
  {
    name: 'names shared with Object.prototype',
    fields: [['Constructor', 'ctor-value'], ['toString', 'string-value']],
    expected: { constructor: 'ctor-value', tostring: 'string-value' }
  }
]
