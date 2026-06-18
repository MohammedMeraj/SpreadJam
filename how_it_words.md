# How it Works - spreadjam

`spreadjam` is a command-line interface that allows you to manage Google Sheets as if they were tables in a git-like structure directly from your terminal.

## Key Concepts

Like Git, `spreadjam` stores its configuration locally in a `.spreadjam/` folder within your project directory:
- `.spreadjam/config.json`: Contains your target Spreadsheet ID and your Google Service Account credentials.
- All commands look for the `.spreadjam/` directory in the current working directory, traversing upwards if not found.

---

## Command Reference

### 1. Initialize Repository
Before using `spreadjam` in any folder, run the initialization command:
```bash
spreadjam init
```
This creates an empty `.spreadjam/` folder in your current directory.

### 2. Configure credentials
Connect `spreadjam` to your Google Sheets API and target spreadsheet:
```bash
# Set both credentials and spreadsheet ID
spreadjam config --credentials path/to/google-credentials.json --spreadsheet your_spreadsheet_id_here
```
To view the current configurations, simply run:
```bash
spreadjam config
```

### 3. Check Status
Verify your connection to Google Sheets and list available sheets (tabs):
```bash
spreadjam status
```

---

## Sheet Operations

Most operations default to the **first sheet (tab)** in your Google Spreadsheet. To target a specific sheet, use the `-s` or `--sheet` option.

### Column Operations (`spreadjam col`)

Columns correspond to the headers in the first row of your sheet.

*   **List Columns:** Lists headers and their corresponding column letter (A, B, C...).
    ```bash
    spreadjam col list [-s sheet_name]
    ```
*   **Add Column:** Appends a new column header to the first empty column.
    ```bash
    spreadjam col add <column_name> [-s sheet_name]
    ```
*   **Delete Column:** Deletes the specified column, removing its dimension from Google Sheets and shifting all columns to the right of it left (exactly like a column drop).
    ```bash
    spreadjam col delete <column_name> [-s sheet_name]
    ```

### Row Operations (`spreadjam row`)

Rows correspond to records under the header row.

*   **List Rows:** Fetches all data and presents it formatted as a table in your terminal.
    ```bash
    spreadjam row list [-s sheet_name]
    ```
*   **Add Row (Positional):** Appends a row of values in order of the columns.
    ```bash
    spreadjam row add "John Doe" "30" "Engineer" [-s sheet_name]
    ```
*   **Add Row (Key-Value):** Appends a row mapping values to matching columns. This is highly useful when writing specific column data out-of-order.
    ```bash
    spreadjam row add name="Jane Doe" role="Designer" age="28" [-s sheet_name]
    ```
