# spreadjam 🥖🍯

`spreadjam` is a command-line interface (CLI) for Google Sheets that allows you to manage spreadsheet data as if they were database tables directly from your terminal.

---

## 📖 What it is

`spreadjam` bridges the gap between terminal productivity and cloud spreadsheets. It allows you to interact with Google Sheets using simple CLI commands to query, insert, and delete rows, columns, and tabs (sheets).

---

## 🛠️ How it Works

`spreadjam` maintains a hidden metadata folder (`.spreadjam`) in your project's working directory containing:
1. **Target Spreadsheet ID**: The ID of the Google Sheet you want to read/write.
2. **Google Service Account Credentials**: Secure private key JSON credentials to authorize API requests.

Every execution searches upwards from your current directory to locate the `.spreadjam` configuration folder and automatically sends authorized requests to the Google Sheets API.

---

## 🚀 How it Helps in Spreadsheet Management

- **Simple Initialization & Configuration**: Initialize a spreadsheet connection using `spreadjam init`, customize credentials with `spreadjam config`, and verify connections with `spreadjam status`.
- **Keyboard-driven workflow**: Avoid leaving the terminal to inspect columns, append logs, or delete sheets.
- **Ultra-minimal Syntax**: Retrieve columns in one line via `spreadjam list columns`, add rows with space-separated positional values, and view data instantly with `spreadjam show data`.
- **Automatic Column Creation**: Enable `--autodate` and `--autotime` flags when adding rows, and `spreadjam` will automatically create `date` and `time` columns if they don't exist and fill them with the current timestamp.
- **Multi-sheet Support**: Target any tab/sheet using the `-s` or `--sheet` flags, or quickly add/delete sheets using `spreadjam add sheet <name>` and `spreadjam delete sheet <name>`.

---

## 📌 Command Reference

For a complete and detailed breakdown of each command with multiple examples, see [sheet_operations.md](sheet_operations.md).

### 1. Repository Connection Commands
- `spreadjam init`: Initialize an empty local spreadjam repository and opens an interactive setup menu.
- `spreadjam config`: Get or update credentials and spreadsheet ID.
- `spreadjam status`: Verify connection with Google Sheets API and show spreadsheet metadata.
- `spreadjam dev`: Opens the developer's GitHub profile in a new browser tab.

### 2. Column Operations
- `spreadjam list columns`: Prints column names in one line, separated by spaces.
- `spreadjam add column <name>`: Appends a new column to the sheet.
- `spreadjam delete column <name>`: Deletes the column and shifts remaining columns left.

### 3. Row Operations
- `spreadjam add row <args...>`: Appends a row using positional values or key-value format (e.g. `col=val`).
  - *Options*: `--autodate` (adds current date) and `--autotime` (adds current time). Creates respective columns if missing.
- `spreadjam delete row <index>`: Deletes a row by its 1-based index below the headers.
- `spreadjam delete data`: Deletes a specific row or column via flags (`--row <index>` or `--column <name>`).
- `spreadjam list rows` / `spreadjam show data`: Displays sheet rows in a formatted table.

### 4. Sheet Operations
- `spreadjam add sheet <name>`: Creates a new sheet (tab) inside the spreadsheet.
- `spreadjam delete sheet <name>`: Deletes a sheet (tab) from the spreadsheet.

---

## 🔑 Setup & API Credentials

To obtain Google Sheets API credentials and configure `spreadjam`, follow the step-by-step instructions in [how_to_add_api.md](how_to_add_api.md).
