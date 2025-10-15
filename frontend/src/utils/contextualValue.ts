/**
 * Utility functions for detecting contextual/dynamic values
 * Used to identify values containing variable patterns like $variable_name
 */

/**
 * Detects if a value is contextual/dynamic based on variable patterns
 * A value is contextual if it contains a variable pattern like $variable_name
 * This prevents false positives from legitimate $ symbols (currency, prices, etc.)
 *
 * @param value - String value to check
 * @returns true if the value contains a variable pattern ($letter or $_)
 *
 * @example
 * isContextualValue('$page-name') // true - starts with $letter
 * isContextualValue('category:$name') // true - contains $letter
 * isContextualValue('user_$id') // true - contains $_letter
 * isContextualValue('Promo $19') // false - $ followed by digit
 * isContextualValue('Price: $0') // false - $ followed by digit
 * isContextualValue('homepage') // false - no $ at all
 */
export const isContextualValue = (value: string): boolean => {
  // Regex pattern: $ followed by a letter or underscore
  // This matches: $page-name, $user_id, $_temp, but NOT $19, $0, $123
  return /\$[a-zA-Z_]/.test(value);
};
