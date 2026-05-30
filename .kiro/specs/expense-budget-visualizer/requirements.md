# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application built with HTML, CSS, and vanilla JavaScript. It allows users to track personal expenses by adding transactions with a name, amount, and category. The app stores all data in the browser's Local Storage, requires no backend, and provides visual feedback through a pie chart, summary views, and a responsive UI with dark/light mode support.

## Glossary

- **App**: The Expense and Budget Visualizer web application
- **Transaction**: A single expense entry consisting of a name, amount, and category
- **Category**: A label grouping transactions (e.g., Food, Transport, Fun, or a user-defined custom category)
- **Balance**: The running total of all transaction amounts
- **Chart**: The pie chart displaying spending distribution by category
- **Transaction_List**: The scrollable UI component displaying all recorded transactions
- **Input_Form**: The UI form used to enter new transaction data
- **Storage**: The browser's Local Storage API used to persist transaction data
- **Monthly_Summary**: A filtered view showing transactions and totals for a selected month
- **Theme**: The visual color scheme of the App, either dark or light mode

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly and accurately.

#### Acceptance Criteria

1. THE Input_Form SHALL include fields for Item Name (text, max 100 characters), Amount (numeric, range 0.01–999,999,999.99), and Category (selectable).
2. THE Input_Form SHALL provide a Category selector with at least the following default options: Food, Transport, Fun.
3. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add a new Transaction to the Transaction_List.
4. WHEN the user submits the Input_Form with one or more empty fields, THE App SHALL display a validation error message identifying the specific empty field(s) and SHALL NOT add a Transaction.
5. WHEN the user submits the Input_Form with a non-numeric, zero, or negative value in the Amount field, THE App SHALL display a validation error message identifying the Amount field as invalid and SHALL NOT add a Transaction.
6. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the Item Name and Amount fields to empty and reset the Category selector to its default first option.

### Requirement 2: Custom Categories

**User Story:** As a user, I want to add my own expense categories, so that I can organize transactions in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text input and submit control for the user to enter and submit a custom category name (max 50 characters).
2. WHEN the user submits a non-empty custom category name that does not already exist (case-insensitive comparison), THE App SHALL add it to the Category selector as a selectable option.
3. IF an unexpected error occurs while adding a valid category, THEN THE App SHALL display an error message stating that the category could not be saved.
4. WHEN the user submits an empty custom category name or a name that already exists (case-insensitive), THE App SHALL display a validation error and SHALL NOT add the category.
5. THE App SHALL persist custom categories in Storage so that they remain available after the page is reloaded. WHEN a custom category is successfully added, THE App SHALL write the updated category list to Storage immediately.

### Requirement 3: Transaction List Display

**User Story:** As a user, I want to see all my recorded transactions in a list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored transactions, each showing the Item Name, Amount (formatted to 2 decimal places), and Category.
2. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible area.
3. WHEN the page is loaded, THE App SHALL read all transactions from Storage and render them in the Transaction_List.
4. WHEN there are no transactions, THE Transaction_List SHALL display an empty state message indicating no transactions have been recorded.
5. THE Transaction_List SHALL display transactions in insertion order (most recently added first) by default, before any sort option is applied.

### Requirement 4: Delete Transactions

**User Story:** As a user, I want to remove individual transactions, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. EACH transaction entry in the Transaction_List SHALL include a delete control.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and from Storage.
3. WHEN a transaction is deleted, THE App SHALL recalculate and update the Balance and re-render the Chart without requiring a page reload.
4. IF Storage is unavailable when the user deletes a transaction, THEN THE App SHALL display a non-blocking error message and SHALL still remove the transaction from the in-memory Transaction_List and update the Balance and Chart.

### Requirement 5: Total Balance Display

**User Story:** As a user, I want to see my total spending at a glance, so that I can quickly understand how much I have spent overall.

#### Acceptance Criteria

1. THE App SHALL display the total Balance above the Transaction_List, formatted to two decimal places with a currency symbol (e.g., $0.00).
2. WHEN a Transaction is added, THE App SHALL recalculate and update the Balance within 100 milliseconds.
3. WHEN a Transaction is deleted, THE App SHALL recalculate and update the Balance within 100 milliseconds.
4. THE Balance SHALL equal the sum of the Amount values of all transactions currently in Storage, regardless of any active monthly filter.
5. WHEN the page is loaded, THE App SHALL calculate and display the Balance from all transactions read from Storage.
6. WHEN there are no transactions, THE App SHALL display the Balance as 0.00.

### Requirement 6: Sort Transactions

**User Story:** As a user, I want to sort my transaction list, so that I can find and compare entries more easily.

#### Acceptance Criteria

1. THE App SHALL provide a sort control that allows the user to sort transactions by Amount ascending (lowest first) or Amount descending (highest first).
2. THE App SHALL provide a sort control that allows the user to sort transactions by Category in ascending alphabetical order (A→Z).
3. THE App SHALL provide a "None" sort option that displays transactions in their default insertion order (most recently added first), and this option SHALL be selected by default on page load.
4. WHEN the user selects a sort option, THE Transaction_List SHALL re-render in the selected order within 100 milliseconds.
5. WHEN a new Transaction is added and a sort option other than "None" is active, THE Transaction_List SHALL re-render with the new transaction placed in its correct position according to the active sort order within 100 milliseconds.
6. WHEN a new Transaction is added and the "None" sort option is active, THE Transaction_List SHALL insert the new transaction at the top of the list (most recently added first) within 100 milliseconds.

### Requirement 7: Spending Distribution Chart

**User Story:** As a user, I want to see a visual breakdown of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a pie chart where each slice represents a Category, labeled with the category name and its percentage of total spending, sized proportionally to that category's share of total spending.
2. WHEN a Transaction is added, THE Chart SHALL recalculate and re-render to reflect the new spending distribution without requiring a page reload.
3. WHEN a Transaction is deleted, THE Chart SHALL recalculate and re-render to reflect the revised spending distribution without requiring a page reload.
4. WHEN there are no transactions, THE Chart SHALL display a visible placeholder text message indicating there is no data to display.
5. WHEN all transactions belong to a single Category, THE Chart SHALL render a single full-circle slice labeled with that category name and 100%.

### Requirement 8: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light visual themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control to switch between dark mode and light mode.
2. WHEN the user activates the theme toggle, THE App SHALL apply the selected Theme to all visible UI elements within 100 milliseconds, and SHALL write the new Theme preference to Storage.
3. WHEN the page is loaded and a Theme preference exists in Storage, THE App SHALL apply that stored Theme before rendering any UI elements.
4. IF no Theme preference is stored when the page is loaded, THEN THE App SHALL apply light mode as the default Theme.
5. IF Storage is unavailable when the page is loaded, THEN THE App SHALL apply light mode as the default Theme and continue operating without Theme persistence.

### Requirement 9: Monthly Summary View

**User Story:** As a user, I want to view a summary of my expenses for a specific month, so that I can track my spending patterns over time.

#### Acceptance Criteria

1. THE App SHALL provide a month selector control that allows the user to choose a specific year and month (e.g., a month/year picker or dropdown).
2. WHEN the user selects a month, THE App SHALL display only the transactions whose recorded date (ISO 8601 date string, stored with each transaction) falls within that calendar month and year.
3. WHEN the user selects a month, THE App SHALL display the total spending amount for that month, formatted to two decimal places with a currency symbol.
4. WHEN there are no transactions for the selected month, THE App SHALL display an empty state message in the Monthly_Summary view.
5. WHEN a Transaction is added, THE App SHALL record the current local date (year, month, day) as an ISO 8601 date string with the transaction in Storage.
6. WHEN the user selects a month, THE App SHALL update the Chart to reflect only the spending distribution for transactions within that month.
7. WHEN the user clears or resets the month selector, THE App SHALL revert the Transaction_List and Chart to show all transactions across all months.

### Requirement 10: Data Persistence

**User Story:** As a user, I want my data to be saved automatically, so that I do not lose my transaction history when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the updated transaction list to Storage within 100 milliseconds.
2. WHEN a Transaction is deleted, THE App SHALL write the updated transaction list to Storage within 100 milliseconds.
3. WHEN the page is loaded, THE App SHALL read all transactions from Storage and render them in the Transaction_List.
4. IF Storage is unavailable on page load, THEN THE App SHALL initialize with an empty transaction list and display a warning message that does not disable the Input_Form or Transaction_List.
5. IF Storage returns a parse error on page load, THEN THE App SHALL initialize with an empty transaction list and display a warning message that does not disable the Input_Form or Transaction_List.
6. IF Storage is unavailable when the user adds or deletes a transaction, THEN THE App SHALL display a non-blocking error message and SHALL still update the in-memory transaction list and re-render the Transaction_List, Balance, and Chart.

### Requirement 11: Performance and Compatibility

**User Story:** As a user, I want the app to load and respond quickly across modern browsers, so that I have a smooth and frustration-free experience.

#### Acceptance Criteria

1. THE App SHALL load and become interactive (all UI controls responsive) within 3 seconds on a connection of at least 10 Mbps.
2. WHEN the user adds or deletes a transaction, THE App SHALL update the UI within 100 milliseconds.
3. THE App SHALL function correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari, meaning all features render and operate without JavaScript errors.
4. THE App SHALL use only HTML, CSS, and vanilla JavaScript, with no server-side dependencies.
5. THE App SHALL consist of exactly one CSS file inside the `css/` directory and exactly one JavaScript file inside the `js/` directory.
