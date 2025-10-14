/**
 * Shared Test Fixtures for Event Parsers
 *
 * Centralized test data to avoid duplication across parser test suites.
 * Each fixture includes input data, expected output, and success flag.
 */

export interface TestFixture {
  name: string
  input: string
  expected: {
    eventName: string
    properties: Record<string, any>
  }
  shouldSucceed: boolean
  description?: string
}

/**
 * JSON Format Fixtures
 */
export const jsonFixtures: TestFixture[] = [
  {
    name: 'Valid JSON with "event" key',
    input: '{"event": "purchase", "currency": "EUR", "value": 99.99}',
    expected: {
      eventName: 'purchase',
      properties: { currency: 'EUR', value: 99.99 }
    },
    shouldSucceed: true,
    description: 'Standard JSON with event key'
  },
  {
    name: 'Valid JSON with "name" key',
    input: '{"name": "add_to_cart", "product_id": "123", "quantity": 2}',
    expected: {
      eventName: 'add_to_cart',
      properties: { product_id: '123', quantity: 2 }
    },
    shouldSucceed: true,
    description: 'JSON using "name" instead of "event"'
  },
  {
    name: 'Valid JSON with "event_name" key',
    input: '{"event_name": "page_view", "page_path": "/home"}',
    expected: {
      eventName: 'page_view',
      properties: { page_path: '/home' }
    },
    shouldSucceed: true,
    description: 'JSON using "event_name" key'
  },
  {
    name: 'Invalid JSON - missing event name',
    input: '{"currency": "EUR", "value": 99.99}',
    expected: { eventName: '', properties: {} },
    shouldSucceed: false,
    description: 'No event identifier found'
  },
  {
    name: 'Invalid JSON - malformed',
    input: '{"event": "purchase", "currency": EUR}',
    expected: { eventName: '', properties: {} },
    shouldSucceed: false,
    description: 'Missing quotes around EUR value'
  },
  {
    name: 'JSON with nested objects',
    input: '{"event": "purchase", "user": {"id": "123", "name": "John"}, "value": 99}',
    expected: {
      eventName: 'purchase',
      properties: {
        user: { id: '123', name: 'John' },
        value: 99
      }
    },
    shouldSucceed: true,
    description: 'Nested object should be preserved'
  },
  {
    name: 'JSON with boolean values',
    input: '{"event": "form_submit", "validated": true, "errors": false}',
    expected: {
      eventName: 'form_submit',
      properties: { validated: true, errors: false }
    },
    shouldSucceed: true,
    description: 'Boolean values should be preserved'
  }
]

/**
 * Tabular Format Fixtures (CSV/Excel copy-paste)
 */
export const tabularFixtures: TestFixture[] = [
  {
    name: 'Excel tab-separated',
    input: 'event\tpurchase\ncurrency\tEUR\nvalue\t99.99',
    expected: {
      eventName: 'purchase',
      properties: { currency: 'EUR', value: 99.99 }
    },
    shouldSucceed: true,
    description: 'Standard Excel copy-paste with tabs'
  },
  {
    name: 'Excel with headers (2 columns)',
    input: 'Property\tValue\nevent\tpage_view\npage_name\thomepage',
    expected: {
      eventName: 'page_view',
      properties: { page_name: 'homepage' }
    },
    shouldSucceed: true,
    description: 'Excel table with header row'
  },
  {
    name: 'Excel with multiple value parts',
    input: 'event\tbutton click\nbutton_name\tAcheter\tmaintenant',
    expected: {
      eventName: 'button click',
      properties: { button_name: 'Acheter maintenant' }
    },
    shouldSucceed: true,
    description: 'Values with spaces should be joined'
  },
  {
    name: 'Excel with numeric values',
    input: 'event\tpurchase\nvalue\t123.45\nquantity\t3',
    expected: {
      eventName: 'purchase',
      properties: { value: 123.45, quantity: 3 }
    },
    shouldSucceed: true,
    description: 'Numeric values should be parsed as numbers'
  }
]

/**
 * Key-Value Format Fixtures (line by line)
 */
export const keyValueFixtures: TestFixture[] = [
  {
    name: 'Colon-separated',
    input: 'event: purchase\ncurrency: EUR\nvalue: 99.99',
    expected: {
      eventName: 'purchase',
      properties: { currency: 'EUR', value: 99.99 }
    },
    shouldSucceed: true,
    description: 'Standard key: value format'
  },
  {
    name: 'Equals-separated',
    input: 'event = button_click\nbutton_name = checkout\npage = cart',
    expected: {
      eventName: 'button_click',
      properties: { button_name: 'checkout', page: 'cart' }
    },
    shouldSucceed: true,
    description: 'key = value format'
  },
  {
    name: 'Pipe-separated',
    input: 'event | purchase\ncurrency | USD\nvalue | 59.99',
    expected: {
      eventName: 'purchase',
      properties: { currency: 'USD', value: 59.99 }
    },
    shouldSucceed: true,
    description: 'key | value format'
  },
  {
    name: 'Mixed spacing',
    input: 'event:purchase\ncurrency:  EUR  \nvalue:99.99',
    expected: {
      eventName: 'purchase',
      properties: { currency: 'EUR', value: 99.99 }
    },
    shouldSucceed: true,
    description: 'Spacing variations should be handled'
  },
  {
    name: 'Invalid - no separator',
    input: 'event purchase\ncurrency EUR',
    expected: { eventName: '', properties: {} },
    shouldSucceed: false,
    description: 'No valid separator found'
  }
]

/**
 * Jira/Markdown Table Fixtures
 */
export const jiraFixtures: TestFixture[] = [
  {
    name: 'Jira markdown table',
    input: `| Property | Value |
|----------|-------|
| event | purchase |
| currency | EUR |
| value | 99.99 |`,
    expected: {
      eventName: 'purchase',
      properties: { currency: 'EUR', value: 99.99 }
    },
    shouldSucceed: true,
    description: 'Standard Jira markdown table'
  },
  {
    name: 'Jira table without separator row',
    input: `| Property | Value |
| event | page_view |
| page_name | homepage |`,
    expected: {
      eventName: 'page_view',
      properties: { page_name: 'homepage' }
    },
    shouldSucceed: true,
    description: 'Jira table without |---|---| row'
  },
  {
    name: 'Jira table with extra spaces',
    input: `|  Property  |  Value  |
|  event  |  purchase  |
|  currency  |  EUR  |`,
    expected: {
      eventName: 'purchase',
      properties: { currency: 'EUR' }
    },
    shouldSucceed: true,
    description: 'Extra spaces should be trimmed'
  }
]

/**
 * Edge Cases Fixtures
 */
export const edgeCaseFixtures: TestFixture[] = [
  {
    name: 'With French accents',
    input: '{"event": "achat_réussi", "montant": "99,99€"}',
    expected: {
      eventName: 'achat_réussi',
      properties: { montant: '99,99€' }
    },
    shouldSucceed: true,
    description: 'French characters should be preserved'
  },
  {
    name: 'With special characters in event name',
    input: 'event: click_CTA\nbutton_name: "Acheter maintenant"',
    expected: {
      eventName: 'click_CTA',
      properties: { button_name: '"Acheter maintenant"' }
    },
    shouldSucceed: true,
    description: 'Quotes should be preserved'
  },
  {
    name: 'With empty value',
    input: '{"event": "error", "message": "", "code": 404}',
    expected: {
      eventName: 'error',
      properties: { message: '', code: 404 }
    },
    shouldSucceed: true,
    description: 'Empty strings should be allowed'
  },
  {
    name: 'With null value',
    input: '{"event": "test", "optional_field": null}',
    expected: {
      eventName: 'test',
      properties: { optional_field: null }
    },
    shouldSucceed: true,
    description: 'Null values should be preserved'
  },
  {
    name: 'With underscore variations',
    input: 'eventName: page_view\npage-name: homepage\nuser.id: 123',
    expected: {
      eventName: 'page_view',
      properties: { 'page-name': 'homepage', 'user.id': '123' }
    },
    shouldSucceed: true,
    description: 'Various naming conventions should work'
  }
]

/**
 * Export all fixtures as a collection
 */
export const allFixtures = {
  json: jsonFixtures,
  tabular: tabularFixtures,
  keyValue: keyValueFixtures,
  jira: jiraFixtures,
  edgeCases: edgeCaseFixtures
}

/**
 * Get all fixtures as flat array (useful for integration tests)
 */
export const getAllFixturesFlat = (): TestFixture[] => {
  return [
    ...jsonFixtures,
    ...tabularFixtures,
    ...keyValueFixtures,
    ...jiraFixtures,
    ...edgeCaseFixtures
  ]
}
