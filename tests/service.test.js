/**
 * Property-based tests for the Expense and Budget Visualizer service layer.
 * Uses fast-check (>= 100 iterations each).
 *
 * Pure logic is extracted directly from app.js by re-implementing the
 * getCategoryTotals and getSorted functions here so they can be tested
 * without a browser DOM.
 */

const fc = require("fast-check");

// ---------------------------------------------------------------------------
// Unit under test — getSorted (mirrors the implementation in app.js)
// ---------------------------------------------------------------------------

/**
 * Returns a new array of transactions sorted by the given order.
 * Does NOT mutate the input array.
 *
 * @param {Array}  transactions - Array of Transaction objects
 * @param {string} order        - 'none' | 'amount-asc' | 'amount-desc' | 'category-az'
 * @returns {Array} Sorted copy of the transactions array
 */
function getSorted(transactions, order) {
  const copy = transactions.slice();

  switch (order) {
    case "amount-asc":
      return copy.sort((a, b) => a.amount - b.amount);

    case "amount-desc":
      return copy.sort((a, b) => b.amount - a.amount);

    case "category-az":
      return copy.sort((a, b) =>
        a.category.localeCompare(b.category, undefined, {
          sensitivity: "base",
        }),
      );

    case "none":
    default:
      return copy.reverse();
  }
}

// ---------------------------------------------------------------------------
// Unit under test — getCategoryTotals (mirrors the implementation in app.js)
// ---------------------------------------------------------------------------

/**
 * Compute per-category spending totals.
 *
 * @param {Array<{category: string, amount: number}>} transactions
 * @returns {Map<string, number>}
 */
function getCategoryTotals(transactions) {
  const totals = new Map();
  for (const t of transactions) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FLOAT_TOLERANCE = 0.001;

function approxEqual(a, b, tol = FLOAT_TOLERANCE) {
  return Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------------------------
// Property 13: Chart Category Proportions Correctness
// ---------------------------------------------------------------------------

// Feature: expense-budget-visualizer, Property 13: Chart Category Proportions Correctness

describe("Property 13: Chart Category Proportions Correctness", () => {
  /**
   * Validates: Requirements 7.1, 7.2, 7.3, 9.6
   *
   * For any non-empty set of transactions:
   *   (a) sum of all category totals === sum of all transaction amounts
   *   (b) each category's total === sum of amounts of transactions in that category
   */

  const CATEGORIES = ["Food", "Transport", "Fun", "Other"];

  /** Arbitrary for a single transaction with a random amount and category */
  const transactionArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    // Amounts between 0.01 and 9999.99 with at most 2 decimal places
    amount: fc
      .integer({ min: 1, max: 999999 })
      .map((cents) => Math.round(cents) / 100),
    category: fc.constantFrom(...CATEGORIES),
    date: fc.constant("2025-01-01"),
  });

  /** Arbitrary for a non-empty array of transactions (1–50 items) */
  const transactionsArb = fc.array(transactionArb, {
    minLength: 1,
    maxLength: 50,
  });

  test("(a) sum of category totals equals sum of all transaction amounts", () => {
    // Feature: expense-budget-visualizer, Property 13: Chart Category Proportions Correctness
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const totals = getCategoryTotals(transactions);

        const sumOfTotals = Array.from(totals.values()).reduce(
          (acc, v) => acc + v,
          0,
        );
        const sumOfAmounts = transactions.reduce((acc, t) => acc + t.amount, 0);

        return approxEqual(sumOfTotals, sumOfAmounts);
      }),
      { numRuns: 100 },
    );
  });

  test("(b) each category total equals sum of amounts for that category", () => {
    // Feature: expense-budget-visualizer, Property 13: Chart Category Proportions Correctness
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const totals = getCategoryTotals(transactions);

        for (const [category, total] of totals.entries()) {
          const expectedTotal = transactions
            .filter((t) => t.category === category)
            .reduce((acc, t) => acc + t.amount, 0);

          if (!approxEqual(total, expectedTotal)) {
            return false;
          }
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit under test — getFiltered (mirrors the implementation in app.js)
// ---------------------------------------------------------------------------

/**
 * Returns a new array of transactions filtered to the given month/year.
 * Returns all transactions when month is null.
 *
 * @param {Array<{date: string}>} transactions - Array of Transaction objects
 * @param {{ year: number, month: number } | null} month - 1-indexed month or null
 * @returns {Array}
 */
function getFiltered(transactions, month) {
  if (month === null || month === undefined) {
    return transactions.slice();
  }

  const { year, month: targetMonth } = month;

  return transactions.filter((tx) => {
    // tx.date is an ISO 8601 string like "2025-05-26"
    // Parse year and month directly from the string to avoid timezone issues
    const [txYear, txMonth] = tx.date.split("-").map(Number);
    return txYear === year && txMonth === targetMonth;
  });
}

// ---------------------------------------------------------------------------
// Property 14: Monthly Filter Correctness
// ---------------------------------------------------------------------------

// Feature: expense-budget-visualizer, Property 14: Monthly Filter Correctness

describe("Property 14: Monthly Filter Correctness", () => {
  /**
   * Validates: Requirements 9.2
   *
   * For any set of transactions and any selected month/year,
   * getFiltered(transactions, month) should return exactly those transactions
   * whose stored date falls within that calendar month and year.
   *   - No transactions from other months should appear
   *   - No matching transactions should be omitted
   */

  const CATEGORIES = ["Food", "Transport", "Fun", "Other"];

  /**
   * Arbitrary for a date string in YYYY-MM-DD format.
   * Year: 2020–2030, Month: 1–12, Day: 1–28 (safe for all months).
   */
  const dateArb = fc
    .record({
      year: fc.integer({ min: 2020, max: 2030 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 28 }),
    })
    .map(({ year, month, day }) => {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    });

  /** Arbitrary for a single transaction with a random date */
  const transactionArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc
      .integer({ min: 1, max: 999999 })
      .map((cents) => Math.round(cents) / 100),
    category: fc.constantFrom(...CATEGORIES),
    date: dateArb,
  });

  /** Arbitrary for an array of transactions (0–50 items) */
  const transactionsArb = fc.array(transactionArb, {
    minLength: 0,
    maxLength: 50,
  });

  /** Arbitrary for a target month/year */
  const targetMonthArb = fc.record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  });

  test("every result item has a date matching the target year/month", () => {
    // Feature: expense-budget-visualizer, Property 14: Monthly Filter Correctness
    fc.assert(
      fc.property(transactionsArb, targetMonthArb, (transactions, target) => {
        const result = getFiltered(transactions, target);

        // Every returned transaction must belong to the target month/year
        return result.every((tx) => {
          const [txYear, txMonth] = tx.date.split("-").map(Number);
          return txYear === target.year && txMonth === target.month;
        });
      }),
      { numRuns: 100 },
    );
  });

  test("every transaction with a matching date is included in the result", () => {
    // Feature: expense-budget-visualizer, Property 14: Monthly Filter Correctness
    fc.assert(
      fc.property(transactionsArb, targetMonthArb, (transactions, target) => {
        const result = getFiltered(transactions, target);
        const resultIds = new Set(result.map((tx) => tx.id));

        // Every transaction whose date matches the target must appear in the result
        const matchingTransactions = transactions.filter((tx) => {
          const [txYear, txMonth] = tx.date.split("-").map(Number);
          return txYear === target.year && txMonth === target.month;
        });

        return matchingTransactions.every((tx) => resultIds.has(tx.id));
      }),
      { numRuns: 100 },
    );
  });

  test("result count equals the number of transactions matching the target month", () => {
    // Feature: expense-budget-visualizer, Property 14: Monthly Filter Correctness
    fc.assert(
      fc.property(transactionsArb, targetMonthArb, (transactions, target) => {
        const result = getFiltered(transactions, target);

        const expectedCount = transactions.filter((tx) => {
          const [txYear, txMonth] = tx.date.split("-").map(Number);
          return txYear === target.year && txMonth === target.month;
        }).length;

        return result.length === expectedCount;
      }),
      { numRuns: 100 },
    );
  });

  test("passing null as month returns all transactions", () => {
    // Feature: expense-budget-visualizer, Property 14: Monthly Filter Correctness
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const result = getFiltered(transactions, null);
        return result.length === transactions.length;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Sort Ordering Correctness
// ---------------------------------------------------------------------------

// Feature: expense-budget-visualizer, Property 12: Sort Ordering Correctness

describe("Property 12: Sort Ordering Correctness", () => {
  /**
   * Validates: Requirements 6.4, 6.5
   *
   * For any non-empty set of transactions and any sort option
   * (amount-asc, amount-desc, category-az, none), getSorted() must return
   * the transactions in the correct order for that option.
   */

  const CATEGORIES = ["Food", "Transport", "Fun", "Other", "Health", "Bills"];

  /** Arbitrary for a single transaction with a random amount and category */
  const transactionArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    // Amounts between 0.01 and 9999.99 with at most 2 decimal places
    amount: fc
      .integer({ min: 1, max: 999999 })
      .map((cents) => Math.round(cents) / 100),
    category: fc.constantFrom(...CATEGORIES),
    date: fc.constant("2025-01-01"),
  });

  /** Arbitrary for a non-empty array of transactions (1–50 items) */
  const transactionsArb = fc.array(transactionArb, {
    minLength: 1,
    maxLength: 50,
  });

  test("amount-asc: each consecutive pair satisfies a[i].amount <= a[i+1].amount", () => {
    // Feature: expense-budget-visualizer, Property 12: Sort Ordering Correctness
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const sorted = getSorted(transactions, "amount-asc");

        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].amount > sorted[i + 1].amount) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  test("amount-desc: each consecutive pair satisfies a[i].amount >= a[i+1].amount", () => {
    // Feature: expense-budget-visualizer, Property 12: Sort Ordering Correctness
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const sorted = getSorted(transactions, "amount-desc");

        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].amount < sorted[i + 1].amount) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  test("category-az: each consecutive pair satisfies localeCompare(a[i].category, a[i+1].category) <= 0", () => {
    // Feature: expense-budget-visualizer, Property 12: Sort Ordering Correctness
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const sorted = getSorted(transactions, "category-az");

        for (let i = 0; i < sorted.length - 1; i++) {
          const cmp = sorted[i].category.localeCompare(
            sorted[i + 1].category,
            undefined,
            { sensitivity: "base" },
          );
          if (cmp > 0) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  test("none: result is the reverse of the input array", () => {
    // Feature: expense-budget-visualizer, Property 12: Sort Ordering Correctness
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const sorted = getSorted(transactions, "none");
        const expected = transactions.slice().reverse();

        if (sorted.length !== expected.length) return false;

        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i].id !== expected[i].id) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit under test — getMonthlyTotal (mirrors the implementation in app.js)
// ---------------------------------------------------------------------------

/**
 * Compute the total spending for a specific month/year.
 *
 * @param {object[]} transactions
 * @param {{ year: number, month: number }} month  — month is 1-indexed
 * @returns {number}
 */
function getMonthlyTotal(transactions, month) {
  return transactions
    .filter((t) => {
      const [tYear, tMonth] = t.date.split("-").map(Number);
      return tYear === month.year && tMonth === month.month;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

// ---------------------------------------------------------------------------
// Property 15: Monthly Total Correctness
// ---------------------------------------------------------------------------

// Feature: expense-budget-visualizer, Property 15: Monthly Total Correctness

describe("Property 15: Monthly Total Correctness", () => {
  /**
   * Validates: Requirements 9.3
   *
   * For any set of transactions and any selected month/year,
   * getMonthlyTotal(transactions, month) should equal the sum of the amount
   * values of all transactions whose date falls within that month and year.
   */

  const CATEGORIES = ["Food", "Transport", "Fun", "Other"];

  /**
   * Arbitrary for a date string in YYYY-MM-DD format.
   * Year: 2020–2030, Month: 1–12, Day: 1–28 (safe for all months).
   */
  const dateArb = fc
    .record({
      year: fc.integer({ min: 2020, max: 2030 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 28 }),
    })
    .map(({ year, month, day }) => {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    });

  /** Arbitrary for a single transaction with a random date and amount */
  const transactionArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    // Amounts between 0.01 and 9999.99 with at most 2 decimal places
    amount: fc
      .integer({ min: 1, max: 999999 })
      .map((cents) => Math.round(cents) / 100),
    category: fc.constantFrom(...CATEGORIES),
    date: dateArb,
  });

  /** Arbitrary for an array of transactions (0–50 items) */
  const transactionsArb = fc.array(transactionArb, {
    minLength: 0,
    maxLength: 50,
  });

  /** Arbitrary for a target month/year */
  const targetMonthArb = fc.record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  });

  test("monthly total equals the sum of amounts of matching transactions", () => {
    // Feature: expense-budget-visualizer, Property 15: Monthly Total Correctness
    fc.assert(
      fc.property(transactionsArb, targetMonthArb, (transactions, target) => {
        const result = getMonthlyTotal(transactions, target);

        // Compute expected: sum of amounts of transactions matching the target month/year
        const expected = transactions
          .filter((t) => {
            const [tYear, tMonth] = t.date.split("-").map(Number);
            return tYear === target.year && tMonth === target.month;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        return Math.abs(result - expected) < 0.001;
      }),
      { numRuns: 100 },
    );
  });

  test("monthly total is 0 when no transactions match the target month", () => {
    // Feature: expense-budget-visualizer, Property 15: Monthly Total Correctness
    fc.assert(
      fc.property(transactionsArb, targetMonthArb, (transactions, target) => {
        // Filter out any transactions that happen to match the target month
        const nonMatchingTransactions = transactions.filter((t) => {
          const [tYear, tMonth] = t.date.split("-").map(Number);
          return !(tYear === target.year && tMonth === target.month);
        });

        const result = getMonthlyTotal(nonMatchingTransactions, target);
        return result === 0;
      }),
      { numRuns: 100 },
    );
  });

  test("monthly total equals sum of all amounts when all transactions are in the target month", () => {
    // Feature: expense-budget-visualizer, Property 15: Monthly Total Correctness

    /** Arbitrary for a target month/year */
    const fixedTargetArb = fc.record({
      year: fc.integer({ min: 2020, max: 2030 }),
      month: fc.integer({ min: 1, max: 12 }),
    });

    fc.assert(
      fc.property(
        fixedTargetArb,
        fc.integer({ min: 1, max: 50 }),
        (target, count) => {
          // Build transactions all in the target month
          const mm = String(target.month).padStart(2, "0");
          const transactions = Array.from({ length: count }, (_, i) => ({
            id: String(i),
            name: "Item",
            amount: Math.round((i + 1) * 100) / 100, // 1.00, 2.00, ...
            category: "Food",
            date: `${target.year}-${mm}-01`,
          }));

          const result = getMonthlyTotal(transactions, target);
          const expected = transactions.reduce((sum, t) => sum + t.amount, 0);

          return Math.abs(result - expected) < 0.001;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit under test — validate (mirrors the implementation in app.js)
// ---------------------------------------------------------------------------

/** Validation limits (mirrors VALIDATION constants in app.js) */
const VALIDATION = {
  NAME_MAX_LENGTH: 100,
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 999999999.99,
  CATEGORY_MAX_LENGTH: 50,
};

/**
 * Validates transaction input fields.
 *
 * @param {string} name     - Item name (must be 1–100 chars after trim)
 * @param {*}      amount   - Amount value (must be numeric, 0.01–999,999,999.99)
 * @param {string} category - Category (must be a non-empty string)
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validate(name, amount, category) {
  const errors = [];

  // Validate name: required, 1–100 chars after trim
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (trimmedName.length === 0) {
    errors.push("Item name is required.");
  } else if (trimmedName.length > VALIDATION.NAME_MAX_LENGTH) {
    errors.push(
      `Item name must be ${VALIDATION.NAME_MAX_LENGTH} characters or fewer.`,
    );
  }

  // Validate amount: required, numeric, within range
  const parsedAmount = parseFloat(amount);
  if (amount === "" || amount === null || amount === undefined) {
    errors.push("Amount is required.");
  } else if (isNaN(parsedAmount)) {
    errors.push("Amount must be a valid number.");
  } else if (parsedAmount < VALIDATION.AMOUNT_MIN) {
    errors.push(`Amount must be at least ${VALIDATION.AMOUNT_MIN.toFixed(2)}.`);
  } else if (parsedAmount > VALIDATION.AMOUNT_MAX) {
    errors.push(
      `Amount must be no more than ${VALIDATION.AMOUNT_MAX.toFixed(2)}.`,
    );
  }

  // Validate category: required, non-empty string
  const trimmedCategory = typeof category === "string" ? category.trim() : "";
  if (trimmedCategory.length === 0) {
    errors.push("Category is required.");
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Property 2: Invalid Input Rejection — Empty Fields
// ---------------------------------------------------------------------------

// Feature: expense-budget-visualizer, Property 2: Invalid Input Rejection — Empty Fields

describe("Property 2: Invalid Input Rejection — Empty Fields", () => {
  /**
   * Validates: Requirements 1.4
   *
   * For any form submission where at least one of item name, amount, or
   * category is empty or blank, validate() should return { valid: false }
   * and errors array should be non-empty.
   */

  /** Arbitrary for a valid name (1–100 non-blank chars) */
  const validNameArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

  /** Arbitrary for a valid amount (0.01–999,999,999.99) */
  const validAmountArb = fc
    .integer({ min: 1, max: 99999999999 })
    .map((cents) => (cents / 100).toFixed(2));

  /** Arbitrary for a valid category (non-empty string) */
  const validCategoryArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

  /** Arbitrary for an empty or whitespace-only name */
  const emptyNameArb = fc.oneof(
    fc.constant(""),
    fc.stringOf(fc.constantFrom(" ", "\t", "\n"), {
      minLength: 1,
      maxLength: 20,
    }),
  );

  /** Arbitrary for an empty/null/undefined amount */
  const emptyAmountArb = fc.oneof(
    fc.constant(""),
    fc.constant(null),
    fc.constant(undefined),
  );

  /** Arbitrary for an empty category */
  const emptyCategoryArb = fc.oneof(
    fc.constant(""),
    fc.stringOf(fc.constantFrom(" ", "\t"), { minLength: 1, maxLength: 10 }),
  );

  test("empty/blank name → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 2: Invalid Input Rejection — Empty Fields
    fc.assert(
      fc.property(
        emptyNameArb,
        validAmountArb,
        validCategoryArb,
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("empty/null/undefined amount → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 2: Invalid Input Rejection — Empty Fields
    fc.assert(
      fc.property(
        validNameArb,
        emptyAmountArb,
        validCategoryArb,
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("empty/blank category → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 2: Invalid Input Rejection — Empty Fields
    fc.assert(
      fc.property(
        validNameArb,
        validAmountArb,
        emptyCategoryArb,
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("all three fields empty → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 2: Invalid Input Rejection — Empty Fields
    fc.assert(
      fc.property(
        emptyNameArb,
        emptyAmountArb,
        emptyCategoryArb,
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Invalid Amount Rejection
// ---------------------------------------------------------------------------

// Feature: expense-budget-visualizer, Property 3: Invalid Amount Rejection

describe("Property 3: Invalid Amount Rejection", () => {
  /**
   * Validates: Requirements 1.5
   *
   * For any amount value that is zero, negative, or non-numeric,
   * validate() should return { valid: false } with errors.
   */

  /** Arbitrary for a valid name */
  const validNameArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

  /** Arbitrary for a valid category */
  const validCategoryArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

  /** Arbitrary for zero */
  const zeroArb = fc.constant(0);

  /** Arbitrary for negative numbers */
  const negativeArb = fc.oneof(
    fc.integer({ min: -1000000, max: -1 }).map((n) => n),
    fc.float({ min: -1000000, max: -0.001 }),
  );

  /** Arbitrary for non-numeric strings (not parseable as a valid number) */
  const nonNumericStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => isNaN(parseFloat(s)) || s.trim() === "");

  /** Arbitrary for NaN */
  const nanArb = fc.constant(NaN);

  test("zero amount → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 3: Invalid Amount Rejection
    fc.assert(
      fc.property(validNameArb, validCategoryArb, (name, category) => {
        const result = validate(name, 0, category);
        return result.valid === false && result.errors.length > 0;
      }),
      { numRuns: 100 },
    );
  });

  test("negative amount → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 3: Invalid Amount Rejection
    fc.assert(
      fc.property(
        validNameArb,
        negativeArb,
        validCategoryArb,
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("NaN amount → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 3: Invalid Amount Rejection
    fc.assert(
      fc.property(validNameArb, validCategoryArb, (name, category) => {
        const result = validate(name, NaN, category);
        return result.valid === false && result.errors.length > 0;
      }),
      { numRuns: 100 },
    );
  });

  test("non-numeric string amount → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 3: Invalid Amount Rejection
    fc.assert(
      fc.property(
        validNameArb,
        nonNumericStringArb,
        validCategoryArb,
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("amount of exactly 0.00 (string) → valid: false with non-empty errors", () => {
    // Feature: expense-budget-visualizer, Property 3: Invalid Amount Rejection
    fc.assert(
      fc.property(validNameArb, validCategoryArb, (name, category) => {
        const result = validate(name, "0.00", category);
        return result.valid === false && result.errors.length > 0;
      }),
      { numRuns: 100 },
    );
  });
});
