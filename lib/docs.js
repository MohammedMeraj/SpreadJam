import pc from 'picocolors';

const BASE = 'https://github.com/MohammedMeraj/SpreadJam/blob/main/how_to_add_api.md';

export const DOCS = {
  credentials: `${BASE}#step-4-generate-a-json-key-file`,
  spreadsheetId: `${BASE}#step-5-get-the-spreadsheet-id`,
  share: `${BASE}#step-6-share-the-sheet-with-the-service-account-editor-access`,
  setup: BASE
};

export function link(url) {
  return pc.underline(pc.cyan(url));
}

function serviceEmail(config) {
  try {
    const creds = typeof config.credentials === 'string' ? JSON.parse(config.credentials) : config.credentials;
    return creds && creds.client_email;
  } catch (e) {
    return null;
  }
}

export function credentialsHelp() {
  return `${pc.bold('How to get the service account JSON file:')} ${link(DOCS.credentials)}`;
}

export function spreadsheetIdHelp() {
  return `${pc.bold('How to find the Spreadsheet ID:')} ${link(DOCS.spreadsheetId)}`;
}

export function shareHelp(email) {
  const who = email ? pc.bold(email) : 'the service account email (client_email in the JSON file)';
  return `Share the sheet with ${who} as ${pc.bold('Editor')} (Share button > add email > Editor),\n` +
    `or set General access to "Anyone with the link" as Editor.\n` +
    `${pc.bold('Step-by-step guide:')} ${link(DOCS.share)}`;
}

/**
 * Turns Google API / setup errors into guided messages that say exactly what to fix.
 * Returns the message to print.
 */
export function explainError(err, config) {
  const msg = err && err.message ? err.message : String(err);
  const status = Number((err && err.response && err.response.status) || (err && err.status) || (err && err.code));
  const email = config ? serviceEmail(config) : null;

  if (status === 403 || /permission|PERMISSION_DENIED|does not have permission/i.test(msg)) {
    return `${pc.red('Permission denied: the service account cannot access this spreadsheet.')}\n\n` +
      `${shareHelp(email)}`;
  }
  if (status === 404 || /Requested entity was not found/i.test(msg)) {
    return `${pc.red('Spreadsheet not found: the Spreadsheet ID looks wrong.')}\n\n` +
      `${spreadsheetIdHelp()}\n` +
      `Then run: spreadjam config --spreadsheet <id>`;
  }
  if (/invalid_grant|invalid_client|unauthorized_client|DECODER|private key|invalid JWT/i.test(msg) || status === 401) {
    return `${pc.red('Authentication failed: the service account credentials are invalid or expired.')}\n\n` +
      `${credentialsHelp()}\n` +
      `Then run: spreadjam config --credentials <path-to-json>`;
  }
  if (/Google Sheets API has not been used|SERVICE_DISABLED|accessNotConfigured/i.test(msg)) {
    return `${pc.red('The Google Sheets API is not enabled for this Google Cloud project.')}\n\n` +
      `Enable it (Step 2): ${link(DOCS.setup + '#step-2-enable-the-google-sheets-api')}`;
  }
  return pc.red(msg);
}
