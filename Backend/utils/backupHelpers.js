const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../backups');

const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  return BACKUP_DIR;
};

const normalizeMongoUri = (raw) => {
  if (!raw) return '';
  return String(raw).trim().replace(/^["']|["']$/g, '');
};

const normalizeArchivePath = (filePath) =>
  path.resolve(filePath).replace(/\\/g, '/');

const parseMongoUri = (cleanUri) => {
  if (cleanUri.startsWith('mongodb+srv://')) {
    return { isSrv: true, uri: cleanUri };
  }

  const parsed = new URL(cleanUri);
  const dbName = decodeURIComponent(
    parsed.pathname.replace(/^\//, '').split('?')[0] || ''
  );

  return {
    isSrv: false,
    hostname: parsed.hostname,
    port: parsed.port || '27017',
    dbName,
    username: parsed.username
      ? decodeURIComponent(parsed.username)
      : null,
    password: parsed.password
      ? decodeURIComponent(parsed.password)
      : null,
    authSource: parsed.searchParams.get('authSource'),
  };
};

const buildConnectionArgs = (cleanUri, { includeDb = false } = {}) => {
  const parsed = parseMongoUri(cleanUri);

  if (parsed.isSrv) {
    return [`--uri=${cleanUri}`];
  }

  const args = [`--host=${parsed.hostname}`, `--port=${parsed.port}`];

  if (parsed.username) {
    args.push(`--username=${parsed.username}`);
    if (parsed.password) args.push(`--password=${parsed.password}`);
  }

  if (parsed.authSource) {
    args.push(`--authenticationDatabase=${parsed.authSource}`);
  }

  if (includeDb && parsed.dbName) {
    args.push(`--db=${parsed.dbName}`);
  }

  return args;
};

const buildMongodumpArgs = (uri, archivePath) => {
  const cleanUri = normalizeMongoUri(uri);
  const archive = normalizeArchivePath(archivePath);

  if (!cleanUri.startsWith('mongodb://') && !cleanUri.startsWith('mongodb+srv://')) {
    throw new Error('MONGO_URI باید د mongodb:// یا mongodb+srv:// سره پیل شي');
  }

  return [
    ...buildConnectionArgs(cleanUri, { includeDb: true }),
    `--archive=${archive}`,
    '--gzip',
  ];
};

/** Restore from archive — do NOT pass --db; archive carries namespace metadata. */
const buildMongorestoreArgs = (uri, archivePath, { drop = false } = {}) => {
  const cleanUri = normalizeMongoUri(uri);
  const archive = normalizeArchivePath(archivePath);

  if (!cleanUri.startsWith('mongodb://') && !cleanUri.startsWith('mongodb+srv://')) {
    throw new Error('MONGO_URI باید د mongodb:// یا mongodb+srv:// سره پیل شي');
  }

  const args = [];
  if (drop) args.push('--drop');
  args.push(...buildConnectionArgs(cleanUri, { includeDb: false }));
  args.push(`--archive=${archive}`, '--gzip');
  return args;
};

const runCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            `${command} ونه موندل شو. مهرباني وکړئ mongodb-database-tools نصب کړئ.`
          )
        );
        return;
      }
      reject(err);
    });

    proc.on('close', (code) => {
      const output = `${stdout}\n${stderr}`.trim();
      if (code === 0) resolve({ stdout, stderr, output });
      else reject(new Error(output || `${command} failed with code ${code}`));
    });
  });

const parseRestoredDocumentCount = (output) => {
  const match = output.match(/(\d+) document\(s\) restored successfully/i);
  return match ? Number.parseInt(match[1], 10) : 0;
};

const assertArchiveFile = (archivePath) => {
  if (!archivePath || !fs.existsSync(archivePath)) {
    throw new Error('بیک اپ فایل ونه موندل شو');
  }

  const stats = fs.statSync(archivePath);
  if (stats.size < 128) {
    throw new Error('بیک اپ فایل خالي یا ناسم دی');
  }
};

const checkMongoTool = async (tool) => {
  try {
    await runCommand(tool, ['--version']);
    return true;
  } catch {
    return false;
  }
};

const checkMongoTools = async () => {
  const [mongodump, mongorestore] = await Promise.all([
    checkMongoTool('mongodump'),
    checkMongoTool('mongorestore'),
  ]);
  return { mongodump, mongorestore, ready: mongodump && mongorestore };
};

const getMongoUri = () => {
  const uri = normalizeMongoUri(process.env.MONGO_URI);
  if (!uri) {
    throw new Error('MONGO_URI په .env کې تنظیم نشوی');
  }
  return uri;
};

const createBackupArchive = async (outputPath) => {
  ensureBackupDir();
  const uri = getMongoUri();
  const args = buildMongodumpArgs(uri, outputPath);
  await runCommand('mongodump', args);

  assertArchiveFile(outputPath);
  return outputPath;
};

const restoreBackupArchive = async (archivePath, { drop = true } = {}) => {
  assertArchiveFile(archivePath);

  const uri = getMongoUri();
  const args = buildMongorestoreArgs(uri, archivePath, { drop });
  const { output } = await runCommand('mongorestore', args);

  const documentsRestored = parseRestoredDocumentCount(output);
  if (documentsRestored <= 0) {
    throw new Error(
      'هیڅ ریکارډ بېرته نه رغول شو. بیک اپ فایل د بل ډیټابیس څخه وي یا ناسم وي.'
    );
  }

  return { documentsRestored, output };
};

const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore cleanup errors */
  }
};

const buildBackupFilename = (prefix = 'mongodb_backup') =>
  `${prefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.gz`;

module.exports = {
  BACKUP_DIR,
  ensureBackupDir,
  checkMongoTools,
  createBackupArchive,
  restoreBackupArchive,
  safeUnlink,
  buildBackupFilename,
  buildMongodumpArgs,
  buildMongorestoreArgs,
};
