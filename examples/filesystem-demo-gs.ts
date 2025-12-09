/**
 * GoodScript FileSystem Demo
 * 
 * Demonstrates file system operations using both sync and async APIs.
 * This example shows common file I/O patterns in GoodScript.
 */

// ============================================================================
// Synchronous File Operations
// ============================================================================

function syncFileOperations(): void {
  console.log('=== Synchronous File Operations ===');
  
  // Check if file exists
  const configExists = FileSystem.exists('config.json');
  console.log(`Config exists: ${configExists}`);
  
  // Create directory if it doesn't exist
  if (!FileSystem.exists('data')) {
    FileSystem.mkdir('data');
    console.log('Created data directory');
  }
  
  // Write text file
  const config = '{"app": "GoodScript Demo", "version": 1}';
  FileSystem.writeText('data/config.json', config);
  console.log('Wrote config.json');
  
  // Read text file
  const content = FileSystem.readText('data/config.json');
  console.log(`Read config: ${content}`);
  
  // List directory contents
  const files = FileSystem.readDir('data');
  console.log(`Files in data/: ${files.length}`);
  
  // File info
  const info = FileSystem.stat('data/config.json');
  console.log(`File size: ${info.size} bytes`);
  console.log(`Modified: ${info.modified}`);
}

// ============================================================================
// Asynchronous File Operations
// ============================================================================

async function asyncFileOperations(): Promise<void> {
  console.log('=== Asynchronous File Operations ===');
  
  // Check if file exists (async)
  const exists = await FileSystemAsync.exists('data/async-test.txt');
  console.log(`Async test file exists: ${exists}`);
  
  // Write file asynchronously
  await FileSystemAsync.writeText('data/async-test.txt', 'Hello from async!');
  console.log('Wrote async test file');
  
  // Read file asynchronously
  const content = await FileSystemAsync.readText('data/async-test.txt');
  console.log(`Read async: ${content}`);
  
  // List directory asynchronously
  const files = await FileSystemAsync.readDir('data');
  console.log(`Found ${files.length} files`);
}

// ============================================================================
// Practical Example: Configuration Manager
// ============================================================================

interface Config {
  app: string;
  version: number;
  debug: boolean;
}

function loadConfig(path: string): Config | null {
  if (!FileSystem.exists(path)) {
    console.log(`Config not found: ${path}`);
    return null;
  }
  
  const content = FileSystem.readText(path);
  // In real code, this would use JSON.parse()
  // For now, return a dummy config
  return {
    app: 'GoodScript',
    version: 1,
    debug: false
  };
}

function saveConfig(path: string, config: Config): void {
  // In real code, this would use JSON.stringify()
  const content = `{"app":"${config.app}","version":${config.version},"debug":${config.debug}}`;
  FileSystem.writeText(path, content);
  console.log(`Saved config to ${path}`);
}

// ============================================================================
// Practical Example: File Processing Pipeline
// ============================================================================

async function processFiles(directory: string): Promise<void> {
  console.log(`=== Processing files in ${directory} ===`);
  
  // Check if directory exists
  const dirExists = await FileSystemAsync.exists(directory);
  if (!dirExists) {
    console.log(`Directory not found: ${directory}`);
    return;
  }
  
  // List all files
  const files = await FileSystemAsync.readDir(directory);
  console.log(`Found ${files.length} files`);
  
  // Process each file
  for (const file of files) {
    const filePath = `${directory}/${file}`;
    const info = await FileSystemAsync.stat(filePath);
    
    if (info.type === FileType.File) {
      console.log(`Processing: ${file} (${info.size} bytes)`);
      
      // Read and process file content
      const content = await FileSystemAsync.readText(filePath);
      const processed = `PROCESSED: ${content}`;
      
      // Write to output directory
      await FileSystemAsync.writeText(`${directory}/processed-${file}`, processed);
    }
  }
  
  console.log('File processing complete');
}

// ============================================================================
// Practical Example: Backup Utility
// ============================================================================

async function backupFile(source: string, backupDir: string): Promise<boolean> {
  // Check if source exists
  const exists = await FileSystemAsync.exists(source);
  if (!exists) {
    console.log(`Source file not found: ${source}`);
    return false;
  }
  
  // Create backup directory if needed
  const dirExists = await FileSystemAsync.exists(backupDir);
  if (!dirExists) {
    await FileSystemAsync.mkdir(backupDir);
  }
  
  // Read source file
  const content = await FileSystemAsync.readText(source);
  
  // Generate backup filename with timestamp
  // In real code, would use Date.now() or similar
  const backupPath = `${backupDir}/backup-${source}`;
  
  // Write backup
  await FileSystemAsync.writeText(backupPath, content);
  console.log(`Backed up ${source} to ${backupPath}`);
  
  return true;
}

// ============================================================================
// Practical Example: Log File Manager
// ============================================================================

function appendLog(logPath: string, message: string): void {
  // Check if log file exists
  if (!FileSystem.exists(logPath)) {
    // Create new log file
    FileSystem.writeText(logPath, `=== Log Started ===\n`);
  }
  
  // Append message with timestamp
  // In real code, would use Date.now() or similar
  const logEntry = `[${Date.now()}] ${message}\n`;
  FileSystem.appendText(logPath, logEntry);
}

async function readLogs(logPath: string): Promise<void> {
  const exists = await FileSystemAsync.exists(logPath);
  if (!exists) {
    console.log('No log file found');
    return;
  }
  
  const content = await FileSystemAsync.readText(logPath);
  console.log('=== Log Contents ===');
  console.log(content);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  console.log('GoodScript FileSystem Demo\n');
  
  // Run synchronous examples
  syncFileOperations();
  console.log('');
  
  // Run asynchronous examples
  await asyncFileOperations();
  console.log('');
  
  // Configuration management
  const config: Config = {
    app: 'GoodScript Demo',
    version: 1,
    debug: true
  };
  saveConfig('data/app-config.json', config);
  const loaded = loadConfig('data/app-config.json');
  if (loaded !== null) {
    console.log(`Loaded config: ${loaded.app} v${loaded.version}`);
  }
  console.log('');
  
  // File processing pipeline
  await processFiles('data');
  console.log('');
  
  // Backup utility
  await backupFile('data/config.json', 'backups');
  console.log('');
  
  // Log management
  appendLog('app.log', 'Application started');
  appendLog('app.log', 'Processing files');
  appendLog('app.log', 'Operation complete');
  await readLogs('app.log');
  
  console.log('\nDemo complete!');
}

// Note: In a real application, this would be called automatically
// For this demo, you would call: main();
