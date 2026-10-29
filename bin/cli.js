#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { exec } from 'child_process';
import { initConfig, readConfig, updateConfig } from '../lib/config.js';
import * as api from '../lib/api.js';
import { explainError, credentialsHelp, spreadsheetIdHelp, shareHelp, link, DOCS } from '../lib/docs.js';

/**
 * Resolves an auto date/time setting: explicit CLI flag wins, then the saved
 * config value, then the built-in default (enabled).
 */
function resolveAuto(flag, key) {
  if (typeof flag === 'boolean') return flag;
  const saved = readConfig()[key];
  return typeof saved === 'boolean' ? saved : true;
}

function parseOnOff(value, name) {
  const v = String(value).toLowerCase();
  if (['on', 'true', 'yes', '1'].includes(v)) return true;
  if (['off', 'false', 'no', '0'].includes(v)) return false;
  throw new Error(`fatal: --${name} expects on or off (got "${value}").`);
}

/** Reads and validates a service account JSON file, returning the parsed credentials. */
function loadCredentialsFile(file) {
  const credPath = path.resolve(file.trim().replace(/^['"]|['"]$/g, '').replace(/^~(?=$|\/)/, process.env.HOME || '~'));
  if (!fs.existsSync(credPath)) {
    throw new Error(`fatal: credentials file not found at path: ${credPath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } catch (err) {
    throw new Error(`fatal: failed to parse service account JSON file: ${err.message}`);
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('fatal: failed to parse service account JSON file: JSON is missing "client_email" or "private_key" fields.');
  }
  return parsed;
}

/** Accepts a bare Spreadsheet ID or a full Google Sheets URL. */
function extractSpreadsheetId(input) {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return (m ? m[1] : input).trim();
}

function isSetupComplete(config) {
  return !!(config.credentials && config.spreadsheetId);
}

/** Prints what is missing and how to fix it (used when stdin is not interactive). */
function printSetupGuide(config) {
  console.log(pc.yellow('Setup incomplete.\n'));
  if (!config.credentials) {
    console.log(`${pc.red('✗')} Service account credentials missing`);
    console.log(`  ${credentialsHelp()}`);
    console.log('  Then run: spreadjam config --credentials <path-to-json>\n');
  }
  if (!config.spreadsheetId) {
    console.log(`${pc.red('✗')} Spreadsheet ID missing`);
    console.log(`  ${spreadsheetIdHelp()}`);
    console.log('  Then run: spreadjam config --spreadsheet <id>\n');
  }
}

/** Interactive first-time setup: asks only for what is still missing, with a docs link for each. */
async function runSetupWizard(config) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(pc.cyan('Let\'s finish setting up spreadjam. (Press Enter on an empty answer to cancel.)\n'));
    const updates = {};

    if (!config.credentials) {
      console.log(pc.bold('Step 1: Service account JSON file'));
      console.log(`  ${credentialsHelp()}`);
      while (true) {
        const answer = (await rl.question('  Path to the service account JSON file: ')).trim();
        if (!answer) { console.log(pc.yellow('Setup cancelled.')); return; }
        try {
          updates.credentials = loadCredentialsFile(answer);
          break;
        } catch (err) {
          console.log(pc.red(`  ${err.message}`));
        }
      }
      console.log(pc.green(`  Saved credentials for ${updates.credentials.client_email}\n`));
      updateConfig(updates);
    }

    if (!config.spreadsheetId) {
      console.log(pc.bold('Step 2: Spreadsheet ID'));
      console.log(`  ${spreadsheetIdHelp()}`);
      const answer = (await rl.question('  Spreadsheet ID (or full sheet URL): ')).trim();
      if (!answer) { console.log(pc.yellow('Setup cancelled.')); return; }
      updates.spreadsheetId = extractSpreadsheetId(answer);
      updateConfig({ spreadsheetId: updates.spreadsheetId });
      console.log(pc.green('  Saved Spreadsheet ID\n'));
    }

    const creds = updates.credentials || config.credentials;
    const email = typeof creds === 'string' ? JSON.parse(creds).client_email : creds.client_email;
    console.log(pc.bold('Last step: give the service account access to your sheet'));
    console.log(`  ${shareHelp(email).replace(/\n/g, '\n  ')}\n`);
    console.log(`Then run ${pc.bold('spreadjam status')} to test the connection.`);
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR')) {
      console.log(pc.yellow('\nSetup cancelled.'));
      return;
    }
    throw err;
  } finally {
    rl.close();
  }
}

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const program = new Command();

program
  .name('spreadjam')
  .description('A CLI for Google Sheets')
  .option('-V, --version', 'output the installed version and check npm for a newer one')
  .addHelpText('after', `
${pc.cyan('Useful Links:')}
  Learn to bind spreadsheet API: ${pc.underline('https://github.com/MohammedMeraj/SpreadJam/blob/main/how_to_add_api.md')}
  How it works:                 ${pc.underline('https://github.com/MohammedMeraj/SpreadJam/blob/main/how_it_works.md')}
  Sheet operations:             ${pc.underline('https://github.com/MohammedMeraj/SpreadJam/blob/main/sheet_operations.md')}
  Developer:                    ${pc.underline('https://github.com/MohammedMeraj')}
`);

// Catch-all error wrapper for commands
function actionWrapper(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      let config = null;
      try { config = readConfig(); } catch (e) { /* not in a repo */ }
      console.error(explainError(err, config));
      process.exit(1);
    }
  };
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

    program.outputHelp();
  }));

// spreadjam config
program
  .command('config')
  .description('Configure Google Sheets API credentials and Spreadsheet ID')
  .option('--credentials <path>', 'Path to Google Service Account JSON file')
  .option('--spreadsheet <id>', 'Target Google Spreadsheet ID')
  .option('--autodate <on|off>', 'Default: automatically fill the date column when adding rows')
  .option('--autotime <on|off>', 'Default: automatically fill the time column when adding rows')
  .action(actionWrapper(async (options) => {
    // If no arguments provided, display current configuration
    if (!options.credentials && !options.spreadsheet && !options.autodate && !options.autotime) {
      const config = readConfig();
      if (!isSetupComplete(config)) {
        if (process.stdin.isTTY) {
          await runSetupWizard(config);
        } else {
          printSetupGuide(config);
        }
        return;
      }
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
      const fmt = (v) => (v === false ? pc.yellow('off') : pc.green('on'));
      console.log(`${pc.bold('Auto date (default):')} ${fmt(config.autodate)}`);
      console.log(`${pc.bold('Auto time (default):')} ${fmt(config.autotime)}`);
      return;
    }

    const updates = {};
    if (options.spreadsheet) {
      updates.spreadsheetId = options.spreadsheet;
    }

    if (options.autodate) {
      updates.autodate = parseOnOff(options.autodate, 'autodate');
    }
    if (options.autotime) {
      updates.autotime = parseOnOff(options.autotime, 'autotime');
    }

    if (options.credentials) {
      updates.credentials = loadCredentialsFile(options.credentials);
    }

    updateConfig(updates);
    console.log(pc.green('Configuration updated successfully.'));
    const merged = readConfig();
    if (!isSetupComplete(merged)) {
      printSetupGuide(merged);
    } else if (updates.credentials || updates.spreadsheetId) {
      const email = updates.credentials ? updates.credentials.client_email : (typeof merged.credentials === 'string' ? JSON.parse(merged.credentials).client_email : merged.credentials.client_email);
      console.log(`\nMake sure the sheet is shared with ${pc.bold(email)} as ${pc.bold('Editor')}: ${link(DOCS.share)}`);
    }
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
  .option('--autodate', 'Force auto date column on (default: on, see `spreadjam config --autodate`)')
  .option('--no-autodate', 'Skip the auto date column for this row')
  .option('--autotime', 'Force auto time column on (default: on, see `spreadjam config --autotime`)')
  .option('--no-autotime', 'Skip the auto time column for this row')
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
      autodate: resolveAuto(options.autodate, 'autodate'),
      autotime: resolveAuto(options.autotime, 'autotime')
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
  .option('--autodate', 'Force auto date column on (default: on, see `spreadjam config --autodate`)')
  .option('--no-autodate', 'Skip the auto date column for this row')
  .option('--autotime', 'Force auto time column on (default: on, see `spreadjam config --autotime`)')
  .option('--no-autotime', 'Skip the auto time column for this row')
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
      autodate: resolveAuto(options.autodate, 'autodate'),
      autotime: resolveAuto(options.autotime, 'autotime')
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

/** Compares dotted versions; returns true when a is newer than b. */
function isNewer(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function printVersion() {
  console.log(pkg.version);
  try {
    const res = await fetch('https://registry.npmjs.org/spreadjam/latest', { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return;
    const latest = (await res.json()).version;
    if (latest && isNewer(latest, pkg.version)) {
      console.log(pc.yellow(`\nA newer version is available: ${latest} (you have ${pkg.version})`));
      console.log(`Upgrade with: ${pc.bold('npm install -g spreadjam@latest')}`);
    }
  } catch (e) {
    // offline or registry unreachable: just show the installed version
  }
}

if (process.argv.length === 3 && ['-V', '-v', '--version'].includes(process.argv[2])) {
  await printVersion();
} else {
  program.parse(process.argv);
}
