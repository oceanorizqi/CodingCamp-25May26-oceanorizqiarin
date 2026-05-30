// =============================================================================
// Constants
// =============================================================================

/** localStorage key for persisting the transaction list */
const STORAGE_KEY_TRANSACTIONS = "ebv_transactions";

/** localStorage key for persisting custom categories */
const STORAGE_KEY_CATEGORIES = "ebv_categories";

/** localStorage key for persisting the theme preference */
const STORAGE_KEY_THEME = "ebv_theme";

/** Default categories always available in the category selector */
const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];

/** Validation limits */
const VALIDATION = {
  NAME_MAX_LENGTH: 100,
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 999999999.99,
  CATEGORY_MAX_LENGTH: 50,
};

// =============================================================================
// State
// =============================================================================

/**
 * Single in-memory source of truth for the application.
 *
 * @property {Array}        transactions  - All recorded Transaction objects
 * @property {string[]}     categories    - Default + custom category names
 * @property {string}       sortOrder     - 'none' | 'amount-asc' | 'amount-desc' | 'category-az'
 * @property {object|null}  activeMonth   - null | { year: number, month: number } (1-indexed)
 * @property {string}       theme         - 'light' | 'dark'
 */
const state = {
  transactions: [],
  categories: [],
  sortOrder: "none",
  activeMonth: null,
  theme: "light",
};

// =============================================================================
// StorageService
// =============================================================================

const StorageService = {
  /**
   * Load transactions from localStorage.
   * Returns an empty array on any error (unavailable, parse failure, etc.).
   * @returns {Array} Parsed transaction array, or [] on error.
   */
  loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      if (raw === null) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  /**
   * Persist the transaction list to localStorage.
   * Throws on failure so callers can surface a warning to the user.
   * @param {Array} transactions
   */
  saveTransactions(transactions) {
    try {
      localStorage.setItem(
        STORAGE_KEY_TRANSACTIONS,
        JSON.stringify(transactions),
      );
    } catch (err) {
      throw new Error("Could not save transactions: " + err.message);
    }
  },

  /**
   * Load categories from localStorage and merge with DEFAULT_CATEGORIES.
   * Deduplication is case-insensitive; defaults always appear first.
   * Returns DEFAULT_CATEGORIES on any error.
   * @returns {string[]}
   */
  loadCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (raw === null) return [...DEFAULT_CATEGORIES];
      const stored = JSON.parse(raw);
      // Merge: start with defaults, then append stored entries not already present
      const merged = [...DEFAULT_CATEGORIES];
      const lowerMerged = merged.map((c) => c.toLowerCase());
      for (const cat of stored) {
        if (!lowerMerged.includes(cat.toLowerCase())) {
          merged.push(cat);
          lowerMerged.push(cat.toLowerCase());
        }
      }
      return merged;
    } catch {
      return [...DEFAULT_CATEGORIES];
    }
  },

  /**
   * Persist the category list to localStorage.
   * Throws on failure so callers can surface a warning to the user.
   * @param {string[]} categories
   */
  saveCategories(categories) {
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    } catch (err) {
      throw new Error("Could not save categories: " + err.message);
    }
  },

  /**
   * Load the theme preference from localStorage.
   * Returns 'light' when the key is missing or any error occurs.
   * @returns {'light'|'dark'}
   */
  loadTheme() {
    try {
      const theme = localStorage.getItem(STORAGE_KEY_THEME);
      if (theme === "dark") return "dark";
      return "light";
    } catch {
      return "light";
    }
  },

  /**
   * Persist the theme preference to localStorage.
   * Silent on error — theme is still applied to the DOM for the current session.
   * @param {'light'|'dark'} theme
   */
  saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // intentionally silent
    }
  },
};

// =============================================================================
// TransactionService
// =============================================================================

const TransactionService = {
  /**
   * Validates transaction input fields.
   *
   * @param {string} name     - Item name (must be 1–100 chars after trim)
   * @param {*}      amount   - Amount value (must be numeric, 0.01–999,999,999.99)
   * @param {string} category - Category (must be a non-empty string)
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(name, amount, category) {
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
      errors.push(
        `Amount must be at least ${VALIDATION.AMOUNT_MIN.toFixed(2)}.`,
      );
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
  },

  /**
   * Returns a new array of transactions sorted by the given order.
   * Does NOT mutate the input array.
   *
   * @param {Array}  transactions - Array of Transaction objects
   * @param {string} order        - 'none' | 'amount-asc' | 'amount-desc' | 'category-az'
   * @returns {Array} Sorted copy of the transactions array
   */
  getSorted(transactions, order) {
    // Always work on a shallow copy to avoid mutating the original
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
        // Reverse insertion order: most recently added (last in array) appears first
        return copy.reverse();
    }
  },

  /**
   * Returns a new array of transactions filtered to the given month/year.
   * Returns all transactions when month is null.
   *
   * @param {Array}        transactions - Array of Transaction objects
   * @param {object|null}  month        - { year: number, month: number } (1-indexed) or null
   * @returns {Array} Filtered array of transactions
   */
  getFiltered(transactions, month) {
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
  },

  /**
   * Add a new transaction to state and persist to storage.
   * Generates a UUID via crypto.randomUUID() with a Date.now() fallback.
   * Records the current local calendar date as an ISO 8601 "YYYY-MM-DD" string.
   *
   * @param {string} name
   * @param {number} amount
   * @param {string} category
   * @returns {object} The newly created Transaction object.
   */
  add(name, amount, category) {
    // Generate a unique ID
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Date.now().toString();

    // Record the current local date as ISO 8601 "YYYY-MM-DD"
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    const transaction = {
      id,
      name: name.trim(),
      amount: Number(amount),
      category,
      date,
    };

    state.transactions.push(transaction);

    // May throw — caller is responsible for surfacing the error to the user
    StorageService.saveTransactions(state.transactions);

    return transaction;
  },

  /**
   * Delete a transaction by id from state and persist to storage.
   *
   * @param {string} id
   */
  delete(id) {
    state.transactions = state.transactions.filter((t) => t.id !== id);

    // May throw — caller is responsible for surfacing the error to the user
    StorageService.saveTransactions(state.transactions);
  },

  /**
   * Compute the sum of all transaction amounts.
   *
   * @param {object[]} transactions
   * @returns {number}
   */
  getTotalBalance(transactions) {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  },

  /**
   * Compute the total spending for a specific month/year.
   *
   * @param {object[]} transactions
   * @param {{ year: number, month: number }} month  — month is 1-indexed
   * @returns {number}
   */
  getMonthlyTotal(transactions, month) {
    return transactions
      .filter((t) => {
        const [tYear, tMonth] = t.date.split("-").map(Number);
        return tYear === month.year && tMonth === month.month;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  },

  /**
   * Compute per-category spending totals.
   *
   * @param {object[]} transactions
   * @returns {Map<string, number>}
   */
  getCategoryTotals(transactions) {
    const totals = new Map();
    for (const t of transactions) {
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return totals;
  },

  /**
   * Add a new custom category to state and persist to storage.
   *
   * Validation rules:
   *  - Name is trimmed before all checks.
   *  - Trimmed name must be 1–50 characters.
   *  - Trimmed name must not match any existing category (case-insensitive).
   *
   * @param {string} name - The category name to add.
   * @returns {{ success: boolean, error?: string }}
   */
  addCategory(name) {
    const trimmed = typeof name === "string" ? name.trim() : "";

    // Validate: non-empty
    if (trimmed.length === 0) {
      return { success: false, error: "Category name is required." };
    }

    // Validate: max length
    if (trimmed.length > VALIDATION.CATEGORY_MAX_LENGTH) {
      return {
        success: false,
        error: `Category name must be ${VALIDATION.CATEGORY_MAX_LENGTH} characters or fewer.`,
      };
    }

    // Validate: case-insensitive uniqueness
    const lowerTrimmed = trimmed.toLowerCase();
    const isDuplicate = state.categories.some(
      (cat) => cat.toLowerCase() === lowerTrimmed,
    );
    if (isDuplicate) {
      return {
        success: false,
        error: "This category already exists.",
      };
    }

    // Persist to storage — surface any storage error to the caller
    try {
      state.categories.push(trimmed);
      StorageService.saveCategories(state.categories);
    } catch {
      // Roll back the in-memory push on storage failure
      state.categories.pop();
      return { success: false, error: "The category could not be saved." };
    }

    return { success: true };
  },
};

// =============================================================================
// ChartRenderer
// =============================================================================

// TODO: implement ChartRenderer

// =============================================================================
// UIRenderer
// =============================================================================

// TODO: implement UIRenderer

// =============================================================================
// EventHandlers
// =============================================================================

// TODO: implement EventHandlers

// =============================================================================
// init
// =============================================================================

// TODO: implement init
