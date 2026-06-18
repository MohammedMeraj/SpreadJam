# spreadjam CLI - Sheet Operations Guide

`spreadjam` provides minimal and easy-to-use commands to manage columns, rows, and data in your Google Sheets.

---

## 1. List Columns (`list columns`)

List all column header names in the sheet on a single line, separated by spaces. This is useful for quickly seeing the order of columns to add rows positionally.

### Usage
```bash
spreadjam list columns [-s <sheet_name>]
```

### Examples
- **Example 1:** List columns for the default sheet:
  ```bash
  spreadjam list columns
  ```
  *Output:*
  ```
  title date isComplete
  ```
- **Example 2:** List columns for a specific sheet named "Tasks":
  ```bash
  spreadjam list columns -s Tasks
  ```
  *Output:*
  ```
  id title description status
  ```

---

## 2. Add Column (`add column` / `add col`)

Append a new column header to the sheet.

### Usage
```bash
spreadjam add column <column_name> [-s <sheet_name>]
# OR
spreadjam add col <column_name> [-s <sheet_name>]
```

### Examples
- **Example 1:** Add a column named "priority" to the default sheet:
  ```bash
  spreadjam add column priority
  ```
- **Example 2:** Add a column named "dueDate" to sheet "Tasks":
  ```bash
  spreadjam add col dueDate -s Tasks
  ```

---

## 3. Add Row (`add row`)

Append a new row of data. You can pass positional arguments corresponding to the order of columns, or pass key=value pairs.

### Options
- `--autodate`: Automatically add the current date (format: `DD-MM-YYYY`). If a column named `date` (case-insensitive) does not exist, it will be created automatically.
- `--autotime`: Automatically add the current time (format: `HH:MM:SS`). If a column named `time` (case-insensitive) does not exist, it will be created automatically.

### Usage
```bash
# Positional arguments
spreadjam add row <val1> <val2> ... [options]

# Key-Value arguments
spreadjam add row <col1>=<val1> <col2>=<val2> ... [options]
```

### Examples
- **Example 1: Positional row addition**
  If columns are `title`, `date`, `isComplete`, add a row:
  ```bash
  spreadjam add row "Read a book" "18-06-2026" "true"
  ```
- **Example 2: Row addition with automatic date and time**
  If columns are `title`, `isComplete` (missing `date` and `time` columns), run:
  ```bash
  spreadjam add row "Go jogging" "false" --autodate --autotime
  ```
  *Result:* Creates `date` and `time` columns, maps `"Go jogging"` and `"false"` to the existing columns, and populates `date` and `time` with the current date/time values.
- **Example 3: Key-Value row addition**
  ```bash
  spreadjam add row title="Learn JS" isComplete="false"
  ```

---

## 4. Delete Column (`delete column` / `delete col`)

Delete a column from the sheet. Remaining columns to the right will shift left.

### Usage
```bash
spreadjam delete column <column_name> [-s <sheet_name>]
# OR
spreadjam delete col <column_name> [-s <sheet_name>]
```

### Examples
- **Example 1:** Delete the "priority" column:
  ```bash
  spreadjam delete column priority
  ```
- **Example 2:** Delete the "dueDate" column from "Tasks" sheet:
  ```bash
  spreadjam delete col dueDate -s Tasks
  ```

---

## 5. Delete Row (`delete row`)

Delete a row from the sheet by its 1-based index (where index 1 corresponds to the first data row below the headers).

### Usage
```bash
spreadjam delete row <index> [-s <sheet_name>]
```

### Examples
- **Example 1:** Delete the first data row:
  ```bash
  spreadjam delete row 1
  ```
- **Example 2:** Delete the fifth data row from "Tasks" sheet:
  ```bash
  spreadjam delete row 5 -s Tasks
  ```

---

## 6. Delete Data (`delete data`)

Flexible delete interface allowing deletion of either a row or column using flags.

### Usage
```bash
spreadjam delete data --row <index> [-s <sheet_name>]
# OR
spreadjam delete data --column <column_name> [-s <sheet_name>]
```

### Examples
- **Example 1:** Delete the column "temp_data":
  ```bash
  spreadjam delete data --column temp_data
  ```
- **Example 2:** Delete row index 3:
  ```bash
  spreadjam delete data --row 3
  ```

---

## 7. Show Data (`show data` / `list rows`)

Show all row records in the sheet formatted nicely as a table.

### Usage
```bash
spreadjam show data [-s <sheet_name>]
# OR
spreadjam list rows [-s <sheet_name>]
```

### Examples
- **Example 1:** Show data for the default sheet:
  ```bash
  spreadjam show data
  ```
- **Example 2:** List rows for the "Archive" sheet:
  ```bash
  spreadjam list rows -s Archive
  ```

---

## 8. Add Sheet (`add sheet`)

Add a new sheet (tab) to the Google Spreadsheet.

### Usage
```bash
spreadjam add sheet <sheet_name>
```

### Examples
- **Example 1:** Add a sheet named "Expenses":
  ```bash
  spreadjam add sheet Expenses
  ```
- **Example 2:** Add a sheet named "Staging":
  ```bash
  spreadjam add sheet Staging
  ```

---

## 9. Delete Sheet (`delete sheet`)

Delete an existing sheet (tab) from the Google Spreadsheet by name.

### Usage
```bash
spreadjam delete sheet <sheet_name>
```

### Examples
- **Example 1:** Delete the sheet named "Expenses":
  ```bash
  spreadjam delete sheet Expenses
  ```
- **Example 2:** Delete the sheet named "OldData":
  ```bash
  spreadjam delete sheet OldData
  ```

---

## 10. Developer Profile (`dev`)

Opens the developer's GitHub profile in a new browser tab.

### Usage
```bash
spreadjam dev
```

### Examples
- **Example 1:** Open the developer page:
  ```bash
  spreadjam dev
  ```
