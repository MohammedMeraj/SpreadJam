#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import readline from 'readline';
import { initConfig, readConfig, updateConfig } from '../lib/config.js';
import * as api from '../lib/api.js';

const program = new Command();

program
  .name('spreadjam')
  .description('A Git-like CLI for Google Sheets')
  .version('1.0.0');

// Catch-all error wrapper for commands
function actionWrapper(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      console.error(pc.red(err.message));
      process.exit(1);
    }
  };
}

function showInitMenu() {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      console.log(pc.cyan('\nUseful links:'));
      console.log(`- Learn to bind spreadsheet API: ${pc.underline('https://github.com/MohammedMeraj/SpreadJam/blob/main/how_to_add_api.md')}`);
      console.log(`- How it works: ${pc.underline('https://github.com/MohammedMeraj/SpreadJam/blob/main/how_it_works.md')}`);
      console.log(`- Sheet operations: ${pc.underline('https://github.com/MohammedMeraj/SpreadJam/blob/main/sheet_operations.md')}`);
      console.log(`- Developer: ${pc.underline('https://github.com/MohammedMeraj')}`);
      return resolve();
    }

    const items = [
      { name: 'Learn to bind spreadsheet API', action: 'url', target: 'https://github.com/MohammedMeraj/SpreadJam/blob/main/how_to_add_api.md' },
      { name: 'How it works', action: 'url', target: 'https://github.com/MohammedMeraj/SpreadJam/blob/main/how_it_works.md' },
      { name: 'Sheet operations', action: 'url', target: 'https://github.com/MohammedMeraj/SpreadJam/blob/main/sheet_operations.md' },
      { name: 'Help', action: 'help' },
      { name: 'Developer', action: 'url', target: 'https://github.com/MohammedMeraj' }
    ];

    let selectedIndex = 0;

    function render() {
      console.log(pc.cyan('Use Arrow keys (Up/Down) to navigate, Enter to select:'));
      items.forEach((item, idx) => {
        if (idx === selectedIndex) {
          const suffix = item.target ? pc.gray(`(${item.target})`) : '';
          console.log(` ${pc.green('➔')} ${pc.bold(pc.white(item.name))} ${suffix}`);
        } else {
          console.log(`   ${pc.gray(item.name)}`);
        }
      });
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    render();

    function onKeypress(str, key) {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit();
      }

      if (key.name === 'up') {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        readline.moveCursor(process.stdout, 0, -(items.length + 1));
        render();
      } else if (key.name === 'down') {
        selectedIndex = (selectedIndex + 1) % items.length;
        readline.moveCursor(process.stdout, 0, -(items.length + 1));
        render();
      } else if (key.name === 'return') {
        cleanup();
        const chosen = items[selectedIndex];
        if (chosen.action === 'url') {
          console.log(pc.green(`\nOpening: ${chosen.target}`));
          const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
          exec(`${start} ${chosen.target}`);
        } else if (chosen.action === 'help') {
          console.log('');
          program.outputHelp();
        }
        resolve();
      }
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('keypress', onKeypress);
    process.stdin.resume();
  });
}

// spreadjam init
program
  .command('init')
  .description('Initialize a new local .spreadjam repository')
  .action(actionWrapper(async () => {
    const targetDir = initConfig();
    console.log(pc.green(`Initialized empty spreadjam repository in ${pc.bold(targetDir)}\n`));

    const breadLogo =
      pc.yellow('       .---------------. \n') +
      pc.yellow('      /  ') + pc.white('.-----------.') + pc.yellow('  \\ \n') +
      pc.yellow('     /  /  ') + pc.red('( SPREAD )') + pc.white('  \\  \\ \n') +
      pc.yellow('    |  |   ') + pc.red('(  JAM   )') + pc.white('   |  | \n') +
      pc.yellow('    |  |    ') + pc.red('\\______/') + pc.white('    |  | \n') +
      pc.yellow('    |  |               |  | \n') +
      pc.yellow('     \\  \\             /  / \n') +
      pc.yellow('      \\  \'-----------\'  / \n') +
      pc.yellow('       \'---------------\' \n') +
      '\n' +
      `       ${pc.white('S P R E A D')} ${pc.red('J A M')}\n`;
    console.log(breadLogo);

    await showInitMenu();
  }));

// spreadjam config
program
  .command('config')
  .description('Configure Google Sheets API credentials and Spreadsheet ID')
  .option('--credentials <path>', 'Path to Google Service Account JSON file')
  .option('--spreadsheet <id>', 'Target Google Spreadsheet ID')
  .action(actionWrapper(async (options) => {
    // If no arguments provided, display current configuration
    if (!options.credentials && !options.spreadsheet) {
      const config = readConfig();
      console.log(pc.cyan('Current spreadjam configuration:'));
      console.log(`${pc.bold('Spreadsheet ID:')} ${config.spreadsheetId || pc.yellow('Not configured')}`);
      
      let email = 'Not configured';
      if (config.credentials) {
        try {
          const creds = typeof config.credentials === 'string' ? JSON.parse(config.credentials) : config.credentials;
          email = creds.client_email || 'Invalid credentials format';
        } catch (e) {
          email = 'Invalid credentials format';
        }
      }
      console.log(`${pc.bold('Credentials (Service Account):')} ${email}`);
      return;
    }

    const updates = {};
    if (options.spreadsheet) {
      updates.spreadsheetId = options.spreadsheet;
    }

    if (options.credentials) {
      const credPath = path.resolve(options.credentials);
      if (!fs.existsSync(credPath)) {
        throw new Error(`fatal: credentials file not found at path: ${credPath}`);
      }
      try {
        const fileContent = fs.readFileSync(credPath, 'utf8');
        // Parse to validate JSON
        const parsed = JSON.parse(fileContent);
        if (!parsed.client_email || !parsed.private_key) {
          throw new Error('JSON is missing "client_email" or "private_key" fields.');
        }
        updates.credentials = parsed;
      } catch (err) {
        throw new Error(`fatal: failed to parse service account JSON file: ${err.message}`);
      }
    }

    updateConfig(updates);
    console.log(pc.green('Configuration updated successfully.'));
  }));

// spreadjam status
program
  .command('status')
  .description('Verify connection and show status of the connected sheet')
  .action(actionWrapper(async () => {
    console.log(pc.cyan('Verifying connection with Google Sheets API...'));
    const info = await api.verifyConnection();
    const config = readConfig();
    
    let email = 'unknown';
    if (config.credentials) {
      const creds = typeof config.credentials === 'string' ? JSON.parse(config.credentials) : config.credentials;
      email = creds.client_email;
    }

    console.log(pc.green('\n● Connected successfully!'));
    console.log(`${pc.bold('Spreadsheet Title:')} ${pc.cyan(info.title)}`);
    console.log(`${pc.bold('Spreadsheet ID:')}    ${pc.gray(config.spreadsheetId)}`);
    console.log(`${pc.bold('Authenticated As:')}  ${pc.gray(email)}`);
    console.log(`\n${pc.bold('Sheets (Tabs) Available:')}`);
    info.sheets.forEach((sheetName, i) => {
      console.log(`  ${pc.cyan(i + 1)}. ${sheetName}`);
    });
  }));

// Group: col (column)
const colCmd = program.command('col').description('Manage columns in the Google Sheet');

colCmd
  .command('list')
  .description('List columns of a sheet')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (options) => {
    const { title, columns } = await api.listColumns(options.sheet);
    console.log(pc.cyan(`Columns in sheet "${pc.bold(title)}":`));
    if (columns.length === 0) {
      console.log(pc.yellow('  (No columns found/Empty sheet)'));
    } else {
      columns.forEach((col, index) => {
        const colLetter = api.indexToColumnLetter(index);
        console.log(`  ${pc.gray(colLetter)}: ${pc.bold(col)}`);
      });
    }
  }));

colCmd
  .command('add <name>')
  .description('Add a new column')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (name, options) => {
    console.log(pc.cyan(`Adding column "${name}"...`));
    const result = await api.addColumn(name, options.sheet);
    console.log(pc.green(`Success: Added column "${pc.bold(result.columnName)}" to sheet "${pc.bold(result.title)}" at cell ${pc.bold(result.letter + '1')}.`));
  }));

colCmd
  .command('delete <name>')
  .description('Delete a column (shifts remaining columns left)')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (name, options) => {
    console.log(pc.cyan(`Deleting column "${name}"...`));
    const result = await api.deleteColumn(name, options.sheet);
    console.log(pc.green(`Success: Deleted column "${pc.bold(result.columnName)}" from sheet "${pc.bold(result.title)}" (index ${result.index}).`));
  }));

// Group: row
const rowCmd = program.command('row').description('Manage rows in the Google Sheet');

rowCmd
  .command('list')
  .description('List rows of a sheet')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (options) => {
    const { title, records } = await api.listRows(options.sheet);
    console.log(pc.cyan(`Rows in sheet "${pc.bold(title)}":`));
    if (records.length === 0) {
      console.log(pc.yellow('  (No rows found/Empty sheet)'));
    } else {
      console.table(records);
    }
  }));

rowCmd
  .command('add [args...]')
  .description('Add a new row (e.g. `spreadjam row add val1 val2` or `spreadjam row add col1=val1 col2=val2`)')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .option('--autodate', 'Automatically add/fill date column')
  .option('--autotime', 'Automatically add/fill time column')
  .action(actionWrapper(async (args, options) => {
    if ((!args || args.length === 0) && !options.autodate && !options.autotime) {
      throw new Error('fatal: No data provided. Provide values (e.g. `spreadjam row add val1 val2`) or key-values (e.g. `spreadjam row add name=Alice age=20`).');
    }

    // Determine if arguments are structured as key-value pairs (e.g., key=val)
    const isKeyValue = args && args.length > 0 && args.every(arg => arg.includes('='));
    let data;

    if (isKeyValue) {
      data = {};
      for (const arg of args) {
        const eqIndex = arg.indexOf('=');
        const key = arg.slice(0, eqIndex).trim();
        const value = arg.slice(eqIndex + 1).trim();
        if (!key) {
          throw new Error(`fatal: Invalid key-value format in argument "${arg}".`);
        }
        data[key] = value;
      }
    } else {
      // If some arguments have '=' and some don't, throw a helpful error
      const someHaveEq = args && args.some(arg => arg.includes('='));
      if (someHaveEq) {
        throw new Error('fatal: Mixed format. Please use either ALL positional values or ALL key=value pairs.');
      }
      data = args || [];
    }

    console.log(pc.cyan('Adding row...'));
    const result = await api.addRow(data, options.sheet, {
      autodate: !!options.autodate,
      autotime: !!options.autotime
    });
    console.log(pc.green(`Success: Added row to sheet "${pc.bold(result.title)}" with values:`));
    console.log(pc.gray(JSON.stringify(result.values)));
  }));

// New minimal command group: add
const addCmd = program.command('add').description('Add sheet elements (row, column)');

addCmd
  .command('row [args...]')
  .description('Add a new row to the sheet (e.g. `spreadjam add row "value1" "value2"`)')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .option('--autodate', 'Automatically add/fill date column')
  .option('--autotime', 'Automatically add/fill time column')
  .action(actionWrapper(async (args, options) => {
    if ((!args || args.length === 0) && !options.autodate && !options.autotime) {
      throw new Error('fatal: No data provided. Provide values or enable auto-date/time options.');
    }

    const isKeyValue = args && args.length > 0 && args.every(arg => arg.includes('='));
    let data;

    if (isKeyValue) {
      data = {};
      for (const arg of args) {
        const eqIndex = arg.indexOf('=');
        const key = arg.slice(0, eqIndex).trim();
        const value = arg.slice(eqIndex + 1).trim();
        if (!key) {
          throw new Error(`fatal: Invalid key-value format in argument "${arg}".`);
        }
        data[key] = value;
      }
    } else {
      const someHaveEq = args && args.some(arg => arg.includes('='));
      if (someHaveEq) {
        throw new Error('fatal: Mixed format. Please use either ALL positional values or ALL key=value pairs.');
      }
      data = args || [];
    }

    console.log(pc.cyan('Adding row...'));
    const result = await api.addRow(data, options.sheet, {
      autodate: !!options.autodate,
      autotime: !!options.autotime
    });
    console.log(pc.green(`Success: Added row to sheet "${pc.bold(result.title)}" with values:`));
    console.log(pc.gray(JSON.stringify(result.values)));
  }));

addCmd
  .command('column <name>')
  .alias('col')
  .description('Add a new column to the sheet')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (name, options) => {
    console.log(pc.cyan(`Adding column "${name}"...`));
    const result = await api.addColumn(name, options.sheet);
    console.log(pc.green(`Success: Added column "${pc.bold(result.columnName)}" to sheet "${pc.bold(result.title)}" at cell ${pc.bold(result.letter + '1')}.`));
  }));

addCmd
  .command('sheet <name>')
  .description('Add a new sheet (tab) to the spreadsheet')
  .action(actionWrapper(async (name) => {
    console.log(pc.cyan(`Adding sheet "${name}"...`));
    const result = await api.addSheet(name);
    console.log(pc.green(`Success: Added sheet "${pc.bold(result.title)}" to the spreadsheet.`));
  }));

// New minimal command group: delete
const deleteCmd = program.command('delete').alias('del').description('Delete sheet elements (row, column, data)');

deleteCmd
  .command('column <name>')
  .alias('col')
  .description('Delete a column')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (name, options) => {
    console.log(pc.cyan(`Deleting column "${name}"...`));
    const result = await api.deleteColumn(name, options.sheet);
    console.log(pc.green(`Success: Deleted column "${pc.bold(result.columnName)}" from sheet "${pc.bold(result.title)}" (index ${result.index}).`));
  }));

deleteCmd
  .command('row <index>')
  .description('Delete a row by its index (1-based index where 1 is the first data row)')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (index, options) => {
    const rowIndex = parseInt(index, 10);
    if (isNaN(rowIndex) || rowIndex < 1) {
      throw new Error('fatal: Invalid row index. Row index must be a positive integer starting at 1.');
    }
    console.log(pc.cyan(`Deleting row index ${rowIndex}...`));
    const result = await api.deleteRow(rowIndex, options.sheet);
    console.log(pc.green(`Success: Deleted row index ${result.rowIndex} from sheet "${pc.bold(result.title)}".`));
  }));

deleteCmd
  .command('data')
  .description('Delete data from a sheet (specify --row or --col)')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .option('--row <index>', 'Index of row to delete')
  .option('--column <name>', 'Name of column to delete')
  .action(actionWrapper(async (options) => {
    if (options.row) {
      const rowIndex = parseInt(options.row, 10);
      if (isNaN(rowIndex) || rowIndex < 1) {
        throw new Error('fatal: Invalid row index. Row index must be a positive integer starting at 1.');
      }
      console.log(pc.cyan(`Deleting row index ${rowIndex}...`));
      const result = await api.deleteRow(rowIndex, options.sheet);
      console.log(pc.green(`Success: Deleted row index ${result.rowIndex} from sheet "${pc.bold(result.title)}".`));
    } else if (options.column) {
      console.log(pc.cyan(`Deleting column "${options.column}"...`));
      const result = await api.deleteColumn(options.column, options.sheet);
      console.log(pc.green(`Success: Deleted column "${pc.bold(result.columnName)}" from sheet "${pc.bold(result.title)}" (index ${result.index}).`));
    } else {
      throw new Error('fatal: Please specify either --row <index> or --column <name> to delete.');
    }
  }));

deleteCmd
  .command('sheet <name>')
  .description('Delete a sheet (tab) from the spreadsheet')
  .action(actionWrapper(async (name) => {
    console.log(pc.cyan(`Deleting sheet "${name}"...`));
    const result = await api.deleteSheet(name);
    console.log(pc.green(`Success: Deleted sheet "${pc.bold(result.title)}" from the spreadsheet.`));
  }));

// New minimal command group: list
const listCmd = program.command('list').description('List spreadsheet information (columns, rows)');

listCmd
  .command('columns')
  .description('List column names in one line separated by spaces')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (options) => {
    const { columns } = await api.listColumns(options.sheet);
    console.log(columns.join(' '));
  }));

listCmd
  .command('rows')
  .description('List rows of a sheet')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (options) => {
    const { records } = await api.listRows(options.sheet);
    if (records.length === 0) {
      console.log(pc.yellow('  (No rows found/Empty sheet)'));
    } else {
      console.table(records);
    }
  }));

// New minimal command: show data
const showCmd = program.command('show').description('Show spreadsheet data');

showCmd
  .command('data')
  .description('Show rows of a sheet')
  .option('-s, --sheet <name>', 'Specific sheet (tab) name')
  .action(actionWrapper(async (options) => {
    const { records } = await api.listRows(options.sheet);
    if (records.length === 0) {
      console.log(pc.yellow('  (No rows found/Empty sheet)'));
    } else {
      console.table(records);
    }
  }));

// New command: dev
program
  .command('dev')
  .description('Open the developer\'s GitHub profile in a new tab')
  .action(actionWrapper(async () => {
    const url = 'https://github.com/MohammedMeraj';
    console.log(pc.cyan(`Opening developer profile: ${url}`));
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${start} ${url}`, (err) => {
      if (err) {
        console.error(pc.red(`Failed to open URL: ${err.message}`));
      }
    });
  }));

program.parse(process.argv);
