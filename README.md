# spreadjam

`spreadjam` is a command-line interface (CLI) for Google Sheets that allows you to manage spreadsheet data as if they were database tables directly from your terminal.

---

## What it is

`spreadjam` bridges the gap between terminal productivity and cloud spreadsheets. It allows you to interact with Google Sheets using simple CLI commands to query, insert, and delete rows, columns, and tabs (sheets).

---

## How it Works

`spreadjam` maintains a hidden metadata folder (`.spreadjam`) in your project's working directory containing:
1. **Target Spreadsheet ID**: The ID of the Google Sheet you want to read/write.
2. **Google Service Account Credentials**: Secure private key JSON credentials to authorize API requests.

<img width="1423" height="799" alt="Screenshot 2026-06-19 at 10 23 13 AM" src="https://github.com/user-attachments/assets/9623fbb1-5361-4aee-bbd6-b190f3d15155" />
<img width="1423" height="799" alt="Screenshot 2026-06-19 at 10 23 36 AM" src="https://github.com/user-attachments/assets/9ec36763-d9d3-4d76-80b1-feda49af4fcd" />
<img width="1423" height="799" alt="Screenshot 2026-06-19 at 10 24 23 AM" src="https://github.com/user-attachments/assets/d99438fb-67e2-4846-ad76-ed6756be1bb9" />
<img width="1423" height="799" alt="Screenshot 2026-06-19 at 10 24 42 AM" src="https://github.com/user-attachments/assets/4617946c-7d03-49c4-94f6-04ede5d8404d" />
<img width="1423" height="799" alt="Screenshot 2026-06-19 at 10 25 23 AM" src="https://github.com/user-attachments/assets/e3936d15-cfe9-4972-bf12-13f59db21378" />
<img width="1423" height="799" alt="Screenshot 2026-06-19 at 10 26 53 AM" src="https://github.com/user-attachments/assets/cda67922-08ca-4884-ab99-3b05d8895eb5" />

<img width="953" height="596" alt="image" src="https://github.com/user-attachments/assets/54d49653-a466-4238-8d94-508bdb5a45c1" />

Every execution searches upwards from your current directory to locate the `.spreadjam` configuration folder and automatically sends authorized requests to the Google Sheets API.
---

# Installation

## macOS / Linux

Install SpreadJam globally:

```bash
npm install -g spreadjam
```

If you receive a permission denied (`EACCES`) error:

```bash
sudo npm install -g spreadjam
```

Enter your system password when prompted.

Verify the installation:

```bash
spreadjam --version
```

---

## Windows (Command Prompt or PowerShell)

Install SpreadJam globally:

```powershell
npm install -g spreadjam
```

If you receive a permissions error, open **Command Prompt** or **PowerShell** as **Administrator** and run:

```powershell
npm install -g spreadjam
```

Verify the installation:

```powershell
spreadjam --version
```

---

## Troubleshooting

Check that Node.js and npm are installed:

```bash
node --version
npm --version
```

If `spreadjam` is not recognized after installation, restart your terminal and try:

```bash
spreadjam --version
```



---
## Setup & API Credentials

To obtain Google Sheets API credentials and configure `spreadjam`, follow the step-by-step instructions in [how_to_add_api.md](how_to_add_api.md).

---

## How it Helps in Spreadsheet Management

- **Simple Initialization & Configuration**: Initialize a spreadsheet connection using `spreadjam init`, customize credentials with `spreadjam config`, and verify connections with `spreadjam status`.
- **Keyboard-driven workflow**: Avoid leaving the terminal to inspect columns, append logs, or delete sheets.
- **Ultra-minimal Syntax**: Retrieve columns in one line via `spreadjam list columns`, add rows with space-separated positional values, and view data instantly with `spreadjam show data`.
- **Automatic Column Creation**: Enable `--autodate` and `--autotime` flags when adding rows, and `spreadjam` will automatically create `date` and `time` columns if they don't exist and fill them with the current timestamp.
- **Multi-sheet Support**: Target any tab/sheet using the `-s` or `--sheet` flags, or quickly add/delete sheets using `spreadjam add sheet <name>` and `spreadjam delete sheet <name>`.

---

## Command Reference

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


