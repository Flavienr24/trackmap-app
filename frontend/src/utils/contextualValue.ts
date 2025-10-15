/**
 * Utility functions for detecting contextual/dynamic values
 * Used to identify values containing variable patterns
 */

/**
 * Detects if a value is contextual/dynamic based on variable patterns
 * A value is contextual if it contains a variable pattern:
 * - $variable format: $page_name, $user_id
 * - {{variable}} format: {{page_name}}, {{user_id}}
 * - ${variable} format: ${page_name}, ${user_id}
 * This prevents false positives from legitimate $ symbols (currency, prices, etc.)
 *
 * @param value - String value to check
 * @returns true if the value contains a variable pattern
 *
 * @example
 * isContextualValue('$page-name') // true - $variable format
 * isContextualValue('category:$name') // true - $variable in middle
 * isContextualValue('{{page_name}}') // true - {{}} template format
 * isContextualValue('${user_id}') // true - ${} template format
 * isContextualValue('Promo $19') // false - $ followed by digit
 * isContextualValue('Price: $0') // false - $ followed by digit
 * isContextualValue('homepage') // false - no variable pattern
 */
export const isContextualValue = (value: string): boolean => {
  // Regex pattern: matches $variable, {{variable}}, or ${variable} formats
  // $[a-zA-Z_] matches: $page-name, $user_id, $_temp, but NOT $19, $0
  // \{\{.*\}\} matches: {{variable}}, {{page_name}}
  // \$\{.*\} matches: ${variable}, ${user_id}
  return /\$[a-zA-Z_]|\{\{.*\}\}|\$\{.*\}/.test(value);
};
