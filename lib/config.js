import fs from 'fs';
import path from 'path';

/**
 * Searches for a `.spreadjam` directory starting from startDir and walking up to the root.
 * @param {string} startDir 
 * @returns {string|null} The absolute path to the `.spreadjam` directory, or null if not found.
 */
export function findConfigDir(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (true) {
    const target = path.join(current, '.spreadjam');
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      return target;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

/**
 * Initializes a `.spreadjam` directory and default config file.
 * @param {string} dir 
 */
export function initConfig(dir = process.cwd()) {
  const targetDir = path.join(path.resolve(dir), '.spreadjam');
  if (fs.existsSync(targetDir)) {
    throw new Error('Already a spreadjam repository (or has a .spreadjam directory).');
  }
  
  fs.mkdirSync(targetDir);
  const configPath = path.join(targetDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    spreadsheetId: null,
    credentials: null
  }, null, 2));
  
  return targetDir;
}

/**
 * Reads the config.json inside the found .spreadjam directory.
 * Throws an error if not in a spreadjam repository.
 * @returns {object} The parsed config object.
 */
export function readConfig() {
  const configDir = findConfigDir();
  if (!configDir) {
    throw new Error('fatal: not a spreadjam repository (or any of the parent directories): .spreadjam');
  }
  const configPath = path.join(configDir, 'config.json');
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`fatal: failed to read config file at ${configPath}: ${err.message}`);
  }
}

/**
 * Writes or updates the config.json.
 * Throws an error if not in a spreadjam repository.
 * @param {object} updates 
 */
export function updateConfig(updates) {
  const configDir = findConfigDir();
  if (!configDir) {
    throw new Error('fatal: not a spreadjam repository (or any of the parent directories): .spreadjam');
  }
  const configPath = path.join(configDir, 'config.json');
  
  let currentConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      // If corrupted, overwrite
      currentConfig = {};
    }
  }
  
  const newConfig = { ...currentConfig, ...updates };
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  return newConfig;
}
