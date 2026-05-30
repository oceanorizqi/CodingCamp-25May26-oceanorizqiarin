# Implementation Plan: Expense and Budget Visualizer

## Overview

Implement a single-page, client-side expense tracker using plain HTML, CSS, and vanilla JavaScript. The app is structured as one HTML file, one CSS file (`css/styles.css`), and one JavaScript file (`js/app.js`). All state lives in memory and is persisted to `localStorage`. The implementation follows a bottom-up approach: file structure → data layer → core services → rendering → event wiring → tests.

## Tasks

- [x] 1. Set up project file structure and HTML skeleton
  - Create `index.html` with semantic markup: `#transaction-form`, `#category-form`, `#sort-select`, `#month-select`, `#theme-toggle`, `<canvas>` for chart, transaction list container, balance display, and monthly summary section
  - Create `css/styles.css` with CSS custom properties for light/dark theming via `data-theme` attribute on `<html>`
  - Create `js/app.js` with top-level section comments: Constants, State, StorageService, TransactionService, ChartRenderer, UIRenderer, EventHandlers, init
  - _Requirements: 11.4, 11.5_

- [x] 2. Implement Constants and State
  - [x] 2.1 Define constants and initial state object
    - Define localStorage key constants: `ebv_transactions`, `ebv_categories`, `ebv_theme`
    - Define default categories array: `["Food", "Transport", "Fun"]`
    - Define validation limits (name max 100, amount min 0.01 / max 999999999.99, category max 50)
    - Define the `state` object with fields: `transactions`, `categories`, `sortOrder`, `activeMonth`, `theme`
    - _Requirements: 1.1, 1.2, 2.1_

- [x] 3. Implement StorageService
  - [x] 3.1 Implement StorageService read/write helpers
    - Implement `loadTransactions()` — JSON parse from `ebv_transactions`, return `[]` on error
    - Implement `saveTransactions(transactions)` — JSON stringify to `ebv_transactions`, catch and surface error
    - Implement `loadCategories()` — JSON parse from `ebv_categories`, merge with defaults, return defaults on error
    - Implement `saveCategories(categories)` — JSON stringify to `ebv_categories`, catch and surface error
    - Implement `loadTheme()` — read `ebv_theme`, return `'light'` on error or missing
    - Implement `saveTheme(theme)` — write `ebv_theme`, silent on error
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 8.3, 8.4, 8.5_

- [x] 4. Implement TransactionService
  - [x] 4.1 Implement validation logic
    - Implement `validate(name, amount, category)` returning `{ valid, errors[] }`
    - Enforce: name required and 1–100 chars after trim; amount numeric and 0.01–999,999,999.99; category non-empty string
    - _Requirements: 1.1, 1.4, 1.5_

  - [ ]\* 4.2 Write property test for invalid input rejection (Properties 2 & 3)
    - **Property 2: Invalid Input Rejection — Empty Fields**
    - **Validates: Requirements 1.4**
    - **Property 3: Invalid Amount Rejection**
    - **Validates: Requirements 1.5**

  - [x] 4.3 Implement add, delete, and query methods
    - Implement `add(name, amount, category)` — generate UUID via `crypto.randomUUID()` (fallback `Date.now().toString()`), record ISO 8601 date, push to `state.transactions`, call `StorageService.saveTransactions`
    - Implement `delete(id)` — filter out transaction by id, update `state.transactions`, call `StorageService.saveTransactions`
    - Implement `getTotalBalance(transactions)` — sum all amounts
    - Implement `getMonthlyTotal(transactions, month)` — sum amounts for matching month/year
    - Implement `getCategoryTotals(transactions)` — return `Map<string, number>`
    - _Requirements: 1.3, 4.2, 5.1, 7.1, 9.3, 9.5, 10.1, 10.2_

  - [ ]\* 4.4 Write property test for valid transaction add round-trip (Property 1)
    - **Property 1: Valid Transaction Add Round-Trip**
    - **Validates: Requirements 1.3, 10.1**

  - [ ]\* 4.5 Write property test for transaction delete round-trip (Property 10)
    - **Property 10: Transaction Delete Round-Trip**
    - **Validates: Requirements 4.2, 10.2**

  - [ ]\* 4.6 Write property test for transaction date is ISO 8601 (Property 16)
    - **Property 16: Transaction Date Is a Valid ISO 8601 Date String**
    - **Validates: Requirements 9.5**

  - [x] 4.7 Implement getSorted and getFiltered methods
    - Implement `getSorted(transactions, order)` — support `'amount-asc'`, `'amount-desc'`, `'category-az'`, `'none'` (reverse insertion order)
    - Implement `getFiltered(transactions, month)` — filter by `{ year, month }` or return all if `null`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.2_

  - [ ]\* 4.8 Write property test for sort ordering correctness (Property 12)
    - **Property 12: Sort Ordering Correctness**
    - **Validates: Requirements 6.4, 6.5**

  - [ ]\* 4.9 Write property test for default insertion order (Property 8)
    - **Property 8: Default Insertion Order**
    - **Validates: Requirements 3.5, 6.6**

  - [ ]\* 4.10 Write property test for monthly filter correctness (Property 14)
    - **Property 14: Monthly Filter Correctness**
    - **Validates: Requirements 9.2**

  - [ ]\* 4.11 Write property test for monthly total correctness (Property 15)
    - **Property 15: Monthly Total Correctness**
    - **Validates: Requirements 9.3**

  - [ ]\* 4.12 Write property test for chart category proportions (Property 13)
    - **Property 13: Chart Category Proportions Correctness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 9.6**

  - [ ]\* 4.13 Write property test for balance equals global sum (Property 11)
    - **Property 11: Balance Equals Global Sum Regardless of Active Filter**
    - **Validates: Requirements 5.1, 5.4**

- [ ] 5. Checkpoint — Ensure all service-layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement custom category management in TransactionService
  - [x] 6.1 Implement category add and duplicate detection
    - Implement `addCategory(name)` — trim, enforce 1–50 chars, case-insensitive uniqueness check against `state.categories`, push to `state.categories`, call `StorageService.saveCategories`
    - Return `{ success, error }` to allow caller to surface validation or storage errors
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]\* 6.2 Write property test for custom category add round-trip (Property 5)
    - **Property 5: Custom Category Add Round-Trip**
    - **Validates: Requirements 2.2, 2.5**

  - [ ]\* 6.3 Write property test for duplicate and empty category rejection (Property 6)
    - **Property 6: Duplicate and Empty Category Rejection**
    - **Validates: Requirements 2.4**

- [ ] 7. Implement ChartRenderer
  - [~] 7.1 Implement pie chart drawing on canvas
    - Implement `ChartRenderer.draw(canvas, categoryTotals)` using the 2D Context API
    - Draw proportional slices from a fixed palette of ≥12 distinct colors (cycling if needed)
    - Draw labels inside or adjacent to each slice showing category name and percentage
    - Show centered placeholder text "No data to display" when `categoryTotals` is empty
    - Render a full-circle slice labeled with category name and "100%" for a single category
    - _Requirements: 7.1, 7.4, 7.5_

- [ ] 8. Implement UIRenderer
  - [~] 8.1 Implement transaction list and balance rendering
    - Implement `renderTransactionList(transactions)` — clear and rebuild list DOM; show empty state message when list is empty; each entry shows name, amount (2 decimal places), category, and a delete button with class `delete-btn`
    - Implement `renderBalance(total)` — update balance text formatted as `$X.XX`
    - _Requirements: 3.1, 3.2, 3.4, 4.1, 5.1, 5.6_

  - [ ]\* 8.2 Write property test for transaction list rendering completeness (Property 7)
    - **Property 7: Transaction List Rendering Completeness**
    - **Validates: Requirements 3.1**

  - [ ]\* 8.3 Write property test for every transaction entry has a delete control (Property 9)
    - **Property 9: Every Transaction Entry Has a Delete Control**
    - **Validates: Requirements 4.1**

  - [~] 8.4 Implement monthly summary, category selector, chart, and theme rendering
    - Implement `renderMonthlySummary(transactions, month)` — display monthly total and filtered list; show empty state when no transactions match
    - Implement `renderCategorySelector(categories)` — rebuild `<select>` options from `state.categories`
    - Implement `renderChart(transactions)` — compute `getCategoryTotals`, call `ChartRenderer.draw`
    - Implement `applyTheme(theme)` — set `data-theme` attribute on `<html>`
    - _Requirements: 7.2, 7.3, 8.2, 9.3, 9.4, 9.6_

  - [~] 8.5 Implement error and notification rendering
    - Implement `showError(field, message)` — display inline validation error adjacent to the field
    - Implement `clearErrors()` — remove all inline error elements
    - Implement `showToast(message, type)` — render non-blocking toast notification (`'warning'` | `'error'`); auto-dismiss after a short delay
    - _Requirements: 1.4, 1.5, 2.3, 2.4, 10.4, 10.5, 10.6_

- [ ] 9. Implement StorageService load-from-storage round-trip and error paths
  - [~] 9.1 Write property test for load from storage round-trip (Property 18)
    - **Property 18: Load From Storage Round-Trip**
    - **Validates: Requirements 3.3, 10.3**

  - [ ]\* 9.2 Write unit tests for storage unavailability and parse error paths
    - Test: storage unavailable on page load → empty state + warning shown, form enabled (Req 10.4)
    - Test: storage parse error on page load → empty state + warning shown, form enabled (Req 10.5)
    - Test: storage unavailable on add → in-memory update + toast shown (Req 10.6)
    - Test: storage unavailable on delete → in-memory removal + toast shown (Req 4.4)

- [ ] 10. Implement EventHandlers and init
  - [~] 10.1 Wire all event handlers and bootstrap the app
    - Register `submit` on `#transaction-form`: call `clearErrors`, `validate`, show errors or call `add`, then `renderTransactionList`, `renderBalance`, `renderChart`, reset form (Req 1.3, 1.4, 1.5, 1.6)
    - Register `submit` on `#category-form`: call `addCategory`, show error or call `renderCategorySelector` (Req 2.2, 2.3, 2.4)
    - Register delegated `click` on transaction list for `.delete-btn`: call `delete`, then `renderTransactionList`, `renderBalance`, `renderChart` (Req 4.2, 4.3)
    - Register `change` on `#sort-select`: update `state.sortOrder`, call `renderTransactionList` (Req 6.4)
    - Register `change` on `#month-select`: update `state.activeMonth`, call `renderTransactionList`, `renderChart`, `renderMonthlySummary`; clear filter when reset (Req 9.2, 9.6, 9.7)
    - Register `click` on `#theme-toggle`: toggle `state.theme`, call `StorageService.saveTheme`, `UIRenderer.applyTheme` (Req 8.2)
    - Implement `init()`: load state from storage, apply theme, render all UI regions, register all event handlers; attach to `DOMContentLoaded` (Req 3.3, 8.3, 8.4, 10.3)
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.2, 2.3, 2.4, 4.2, 4.3, 6.4, 8.2, 8.3, 8.4, 9.2, 9.6, 9.7, 10.3_

  - [ ]\* 10.2 Write property test for form reset after successful add (Property 4)
    - **Property 4: Form Reset After Successful Add**
    - **Validates: Requirements 1.6**

  - [ ]\* 10.3 Write unit tests for theme toggle and load behavior
    - Test: theme toggle light→dark — DOM attribute updated + storage written (Req 8.2)
    - Test: theme toggle dark→light — DOM attribute updated + storage written (Req 8.2)
    - Test: stored theme 'dark' on load → dark theme applied (Req 8.3)
    - Test: stored theme 'light' on load → light theme applied (Req 8.3)
    - Test: no stored theme on load → light mode default (Req 8.4)
    - Test: storage unavailable on load → light mode default (Req 8.5)

- [ ] 11. Implement CSS theming and responsive layout
  - [~] 11.1 Implement dark/light theme via CSS custom properties
    - Define `[data-theme="light"]` and `[data-theme="dark"]` variable sets in `styles.css`
    - Style all UI regions (form, list, balance, chart container, summary, toggle) using only the custom properties
    - Ensure the transaction list container has `overflow-y: auto` for scrollability
    - _Requirements: 3.2, 8.1, 8.2, 11.1, 11.3_

- [~] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property-based tests use **fast-check** (≥100 iterations each); each test must include the comment tag `// Feature: expense-budget-visualizer, Property N: <property text>`
- Pure logic functions (TransactionService, StorageService helpers, ChartRenderer data computation) are tested directly; `localStorage` is mocked with an in-memory stub
- Checkpoints ensure incremental validation before moving to the next phase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1", "4.3", "4.7"] },
    {
      "id": 2,
      "tasks": [
        "4.2",
        "4.4",
        "4.5",
        "4.6",
        "4.8",
        "4.9",
        "4.10",
        "4.11",
        "4.12",
        "4.13",
        "6.1"
      ]
    },
    { "id": 3, "tasks": ["6.2", "6.3", "7.1", "9.1", "9.2"] },
    { "id": 4, "tasks": ["8.1", "8.4", "8.5"] },
    { "id": 5, "tasks": ["8.2", "8.3", "10.1"] },
    { "id": 6, "tasks": ["10.2", "10.3", "11.1"] }
  ]
}
```
