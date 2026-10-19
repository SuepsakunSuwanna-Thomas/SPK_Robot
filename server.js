const express = require('express');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const admZip = require('adm-zip');
const https = require('https');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const multer = require('multer');
const app = express();

// Setup logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            fontSrc: ["'self'", "data:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.registry.platformio.org", "https://blockly-demo.appspot.com", "https://generativelanguage.googleapis.com"],
            mediaSrc: ["'self'"],
            workerSrc: ["'self'", "blob:"]
        }
    }
}));

// Rate limiting - Relaxed for local IDE usage
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Increased limit for frequent auto-saves
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));

// Security function
function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        throw new Error('Invalid filename');
    }

    // Remove path separators and dangerous characters
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\') ||
        filename.includes(':') || filename.includes('*') || filename.includes('?') ||
        filename.includes('"') || filename.includes('<') || filename.includes('>') ||
        filename.includes('|')) {
        throw new Error('Invalid filename characters');
    }

    // Ensure it ends with .rp2350 for project files
    if (!filename.endsWith('.rp2350')) {
        filename += '.rp2350';
    }

    return filename;
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'));
        }
    }
});

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

const arduinoCliPath = path.join(__dirname, 'arduino_CLI');
const projectsFolder = path.join(__dirname, 'saved_projects');
const libFolder = path.join(arduinoCliPath, 'libraries');
const userLibFolder = path.join(arduinoCliPath, 'libraries_User');
const codeSrcFolder = path.join(arduinoCliPath, 'sketch', 'main_B');

fs.ensureDirSync(projectsFolder);
fs.ensureDirSync(libFolder);
fs.ensureDirSync(userLibFolder);
fs.ensureDirSync(codeSrcFolder);
fs.ensureDirSync('logs'); // For logging

app.get('/', (req, res) => { res.sendFile(path.join(publicPath, 'index.html')); });

// ==========================================
// ðŸŒŸ API  .rp2350
// ==========================================
// ==========================================
// ðŸŒŸ API  .rp2350
// ==========================================
app.get('/files', (req, res) => {
    try {
        const files = fs.readdirSync(projectsFolder).filter(fn => fn.endsWith('.rp2350'));
        logger.info('Files listed successfully', { count: files.length });
        res.json({ files });
    } catch (err) {
        logger.error('Failed to read files', { error: err.message, stack: err.stack });
        res.status(500).json({
            error: "Failed to read files",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// --- Robust Helper to toggle .ino files (Comment out one while activating the other) ---
// --- No longer need to toggle #if 0 as the new build script handles exclusion ---
async function toggleInoFiles(activeFile, inactiveFile) {
    logger.info(`Switching mode to ${activeFile}`);
}

// --- Migration / Init Step (Disabled for Nitro Engine) ---
async function migrateLegacySourceFiles() { }
migrateLegacySourceFiles();

app.post('/save_file', async (req, res) => {
    try {
        const { filename, xml, customBlocks, userCode } = req.body;

        if (!filename || !xml) {
            return res.status(400).json({ error: "Missing required fields: filename and xml" });
        }

        const safeName = sanitizeFilename(filename);
        global.lastProjectName = safeName.replace('.rp2350', ''); // Track for UF2 naming
        const saveData = JSON.stringify({ xml: xml, customBlocks: customBlocks || [] });

        // Save blocks data
        await fs.writeFile(path.join(projectsFolder, safeName), saveData);

        // Save generated code to main_B.ino if provided
        if (userCode) {
            const blockInoPath = path.join(codeSrcFolder, 'main_B.ino');
            await fs.writeFile(blockInoPath, userCode);
            // On block save, we ensure main_B is enabled and main_T is disabled
            await new Promise(resolve => setTimeout(resolve, 50));
            await toggleInoFiles('main_B.ino', 'main_T.ino');
        }

        logger.info('File and code saved (main_B.ino activated)', { filename: safeName });
        res.json({ success: true });
    } catch (err) {
        logger.error('Failed to save file', { error: err.message, filename: req.body.filename });
        res.status(500).json({
            error: "Failed to save file",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.get('/load_file/:filename', async (req, res) => {
    try {
        const safeName = sanitizeFilename(req.params.filename);
        const filePath = path.join(projectsFolder, safeName);

        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: "File not found" });
        }

        const fileContent = await fs.readFile(filePath, 'utf8');

        if (fileContent.trim().startsWith('<xml')) {
            res.json({ success: true, xml: fileContent, customBlocks: [] });
        } else {
            const data = JSON.parse(fileContent);
            res.json({ success: true, xml: data.xml, customBlocks: data.customBlocks || [] });
        }

        logger.info('File loaded successfully', { filename: safeName });
    } catch (err) {
        logger.error('Failed to load file', { error: err.message, filename: req.params.filename });
        res.status(500).json({
            error: "Failed to load file",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.delete('/delete_file/:filename', async (req, res) => {
    try {
        const safeName = sanitizeFilename(req.params.filename);
        const filePath = path.join(projectsFolder, safeName);

        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: "File not found" });
        }

        await fs.unlink(filePath);

        logger.info('File deleted successfully', { filename: safeName });
        res.json({ success: true });
    } catch (err) {
        logger.error('Failed to delete file', { error: err.message, filename: req.params.filename });
        res.status(500).json({
            error: "Failed to delete file",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.post('/rename_file', async (req, res) => {
    try {
        const { oldName, newName } = req.body;

        if (!oldName || !newName) {
            return res.status(400).json({ error: "Missing required fields: oldName and newName" });
        }

        const safeOldName = sanitizeFilename(oldName);
        const safeNewName = sanitizeFilename(newName);
        const oldPath = path.join(projectsFolder, safeOldName);
        const newPath = path.join(projectsFolder, safeNewName);

        if (!await fs.pathExists(oldPath)) {
            return res.status(404).json({ error: "Source file not found" });
        }

        if (await fs.pathExists(newPath)) {
            return res.status(409).json({
                error: "Destination file already exists",
                suggestion: `${newName.replace('.rp2350', '')} (1).rp2350`
            });
        }

        await fs.rename(oldPath, newPath);

        logger.info('File renamed successfully', { oldName: safeOldName, newName: safeNewName });
        res.json({ success: true });
    } catch (err) {
        logger.error('Failed to rename file', { error: err.message, oldName: req.body.oldName, newName: req.body.newName });
        res.status(500).json({
            error: "Failed to rename file",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ==========================================
// ðŸŒŸ API  SRC
// ==========================================
app.get('/list_src_files', (req, res) => {
    try {
        const files = fs.readdirSync(codeSrcFolder);
        res.json({ success: true, files });
    } catch (err) { res.json({ success: false, files: [] }); }
});

app.get('/read_src_file/:name', async (req, res) => {
    try {
        const filename = req.params.name;
        const filePath = path.join(codeSrcFolder, filename);
        const content = await fs.readFile(filePath, 'utf8');
        res.json({ success: true, content });
    } catch (err) { res.json({ success: false, content: "" }); }
});

// --- Source Code File Management API ---
app.post('/create_src_file', (req, res) => {
    const { name } = req.body;
    if (!name || !name.endsWith('.ino')) return res.status(400).send("Invalid filename");
    const filePath = path.join(__dirname, 'arduino_CLI', 'sketch', 'main_B', name);
    if (fs.existsSync(filePath)) return res.status(409).send("File already exists");

    try {
        fs.writeFileSync(filePath, "");
        res.send("File created");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/rename_src_file', (req, res) => {
    const { oldName, newName } = req.body;
    const forbidden = ['main_B.ino', 'main_T.ino', 'User.ino'];
    if (forbidden.includes(oldName)) return res.status(403).send("Cannot rename core files");
    if (!newName || !newName.endsWith('.ino')) return res.status(400).send("Invalid new filename");

    const oldPath = path.join(__dirname, 'arduino_CLI', 'sketch', 'main_B', oldName);
    const newPath = path.join(__dirname, 'arduino_CLI', 'sketch', 'main_B', newName);

    try {
        fs.renameSync(oldPath, newPath);
        res.send("File renamed");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/delete_src_file', (req, res) => {
    const { name } = req.body;
    const forbidden = ['main_B.ino', 'main_T.ino', 'User.ino'];
    if (forbidden.includes(name)) return res.status(403).send("Cannot delete core files");

    const filePath = path.join(__dirname, 'arduino_CLI', 'sketch', 'main_B', name);
    try {
        fs.unlinkSync(filePath);
        res.send("File deleted");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/save_src_file', async (req, res) => {
    try {
        const filename = req.body.name;
        const content = req.body.content;
        const filePath = path.join(codeSrcFolder, filename);
        await fs.writeFile(filePath, content);
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

app.post('/activate_src_mode', async (req, res) => {
    try {
        await toggleInoFiles('main_T.ino', 'main_B.ino');
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

async function getLibInfo(libPath, folderName) {
    const propPath = path.join(libPath, 'library.properties');
    let info = { name: folderName, version: 'Unknown', author: 'Unknown', description: '' };
    try {
        if (await fs.pathExists(propPath)) {
            const content = await fs.readFile(propPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach(line => {
                const parts = line.split('=');
                if (parts.length < 2) return;
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                if (key === 'version') info.version = value;
                if (key === 'author') info.author = value;
                if (key === 'sentence') info.description = value;
                if (key === 'name') info.name = value;
            });
        }
    } catch (e) {
        logger.error('Error reading library.properties', { path: propPath, error: e.message });
    }
    return info;
}

// ==========================================
app.get('/list_pio_libs', async (req, res) => {
    try {
        if (!await fs.pathExists(libFolder)) return res.json({ success: true, libs: [] });
        const folders = await fs.readdir(libFolder);
        const libs = [];
        for (let folder of folders) {
            const fullPath = path.join(libFolder, folder);
            if ((await fs.stat(fullPath)).isDirectory()) {
                libs.push(folder);
            }
        }
        res.json({ success: true, libs: libs });
    } catch (err) { res.json({ success: false, libs: [] }); }
});

// New endpoint to list user-uploaded libraries specifically
app.get('/list_user_libs', async (req, res) => {
    try {
        if (!await fs.pathExists(userLibFolder)) return res.json({ success: true, libs: [] });
        const folders = await fs.readdir(userLibFolder);
        const libs = [];
        for (let folder of folders) {
            const fullPath = path.join(userLibFolder, folder);
            if ((await fs.stat(fullPath)).isDirectory()) {
                const info = await getLibInfo(fullPath, folder);
                libs.push(info);
            }
        }
        res.json({ success: true, libs: libs });
    } catch (err) {
        logger.error('Failed to list user libs', { error: err.message });
        res.json({ success: false, libs: [] });
    }
});

app.post('/delete_pio_lib', async (req, res) => {
    try {
        const { libName } = req.body;

        // 1. Check in libraries folder
        const libPath = path.join(libFolder, libName);
        if (await fs.pathExists(libPath)) {
            await fs.remove(libPath);
            logger.info('Library deleted from libraries', { libName });
        }

        // 2. Check in user_lib folder
        const specificLibPath = path.join(userLibFolder, libName);
        if (await fs.pathExists(specificLibPath)) {
            await fs.remove(specificLibPath);
            logger.info('User library deleted from libraries_User', { libName });
        }

        res.json({ success: true });
    } catch (err) {
        logger.error('Failed to delete library', { error: err.message, libName: req.body.libName });
        res.json({ success: false, details: err.message });
    }
});

app.post('/search_lib', (req, res) => {
    const { query } = req.body;
    const arduinoCli = path.join(arduinoCliPath, 'portable_tools', 'arduino-cli.exe');

    //  exec  Promise ( buffer  10MB  timeout  30 seconds)
    const execPromise = (cmd) => new Promise((resolve, reject) => {
        exec(cmd, { cwd: arduinoCliPath, timeout: 30000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error && !stdout) return reject(error);
            resolve(stdout || "");
        });
    });

    //  2 
    Promise.all([
        execPromise(`"${arduinoCli}" lib list --format json --config-file arduino-cli.yaml`),
        execPromise(`"${arduinoCli}" lib search "${query}" --format json --config-file arduino-cli.yaml`)
    ]).then(([listOut, searchOut]) => {
        let installedLibs = {};
        try {
            const listData = JSON.parse(listOut);
            //  []  { libraries: [] }
            const libs = Array.isArray(listData) ? listData : (listData.libraries || listData.installed_libraries || []);
            libs.forEach(l => {
                const name = (l.library ? l.library.name : l.name).toLowerCase().trim();
                installedLibs[name] = (l.library ? l.library.version : l.version);
            });
        } catch (e) { }

        try {
            const parsed = JSON.parse(searchOut);
            if (parsed.libraries) {
                const results = parsed.libraries.map(item => {
                    const searchName = item.name.toLowerCase().trim();
                    const instVer = installedLibs[searchName] || null;
                    return {
                        name: item.name,
                        description: item.latest.sentence || "No description",
                        author: item.latest.author || "Unknown",
                        latest_version: item.latest.version,
                        versions: item.versions || [item.latest.version],
                        installed_version: instVer,
                        is_installed: !!instVer
                    };
                });
                return res.json({ success: true, results: results });
            }
            res.json({ success: true, results: [] });
        } catch (e) {
            res.json({ success: false, details: "Parse Error: " + e.message });
        }
    }).catch(err => {
        logger.error('Library search error', { error: err.message });
        res.json({ success: false, details: "Search Error: " + err.message });
    });
});

app.post('/install_lib', (req, res) => {
    const { libName, libVersion } = req.body;
    const arduinoCli = path.join(arduinoCliPath, 'portable_tools', 'arduino-cli.exe');

    const target = libVersion ? `${libName}@${libVersion}` : libName;
    const cmd = `"${arduinoCli}" lib install "${target}" --config-file arduino-cli.yaml`;

    exec(cmd, { cwd: arduinoCliPath, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ success: false, details: stderr || stdout });
        }

        //   FORCE_REBUILD.bat 
        const rebuildCmd = `FORCE_REBUILD.bat`;
        exec(rebuildCmd, { cwd: __dirname }, (rbError, rbStdout, rbStderr) => {
            if (rbError) {
                logger.error('Post-install Rebuild failed', { error: rbStderr });
            }
        });

        res.json({ success: true, details: stdout });
    });
});

app.post('/upload_zip_lib', upload.single('zip'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { libName } = req.body;
        if (!libName || libName.trim() === '') {
            return res.status(400).json({ error: "Library name is required" });
        }

        // Clean and safe library folder name
        const safeLibName = libName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        // Ensure clean extraction target
        await fs.ensureDir(userLibFolder);
        const specificLibPath = path.join(userLibFolder, safeLibName);
        await fs.remove(specificLibPath);
        await fs.ensureDir(specificLibPath);

        const zip = new admZip(req.file.buffer);
        zip.extractAllTo(specificLibPath, true);

        logger.info('Library uploaded to user_lib successfully', { libName, safeLibName });
        res.json({ success: true });
    } catch (err) {
        logger.error('Failed to upload library', { error: err.message, libName: req.body.libName });
        res.status(500).json({
            error: "Failed to upload library",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ==========================================
// ðŸŒŸ API Compile & Upload
// ==========================================
let currentUploadProcess = null;

app.post('/cancel_upload', (req, res) => {
    if (currentUploadProcess) {
        currentUploadProcess.kill('SIGKILL');
        currentUploadProcess = null;
        res.json({ success: true, message: "!" });
    } else {
        res.json({ success: false, message: "" });
    }
});

// ==========================================
// ðŸŒŸ API Compile & Upload (Streaming)
// ==========================================
let stagedCode = { main: null, user: null };

app.post('/stage_code', (req, res) => {
    const { mainCode, userCode } = req.body;
    stagedCode.main = mainCode;
    stagedCode.user = userCode;
    res.json({ success: true });
});

app.get('/upload_stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Use staged code if available, otherwise fallback to query (for backwards compatibility if any)
    const mainCode = stagedCode.main !== null ? stagedCode.main : req.query.mainCode;
    const userCode = stagedCode.user !== null ? stagedCode.user : req.query.userCode;

    // Reset staged code after retrieval
    stagedCode = { main: null, user: null };

    const mode = req.query.mode || 'text'; // 'block' or 'text'

    try {
        if (mainCode) { // Only write if code is provided and not empty
            const outFilename = mode === 'block' ? 'main_B.ino' : 'main_T.ino';
            await fs.writeFile(path.join(codeSrcFolder, outFilename), mainCode);
        }
        if (userCode) { // Only write if code is provided and not empty
            await fs.writeFile(path.join(codeSrcFolder, 'User.ino'), userCode);
        }

        const globalStart = Date.now();
        const buildMode = req.query.mode === 'text' ? 'T' : 'B';
        logger.info(`Starting streaming upload (Nitro Mode: ${buildMode})...`);

        const cmd = `powershell -ExecutionPolicy Bypass -File .\\ULTIMATE_NITRO_V6_ELITE.ps1 -Mode ${buildMode} -GlobalStartTime ${globalStart}`;
        const child = exec(cmd, { cwd: arduinoCliPath, maxBuffer: 1024 * 1024 * 5 });

        let timingData = null;
        child.stdout.on('data', (data) => {
            const str = data.toString();
            res.write(`data: ${str}\n\n`);

            // Check for timing tag: [[TIMING: startup=1.2, discovery=0.5, compile=0.5, upload=1.2, total=1.7]]
            const match = str.match(/\[\[TIMING:\s*startup=([\d.]+),\s*discovery=([\d.]+),\s*compile=([\d.]+),\s*upload=([\d.]+),\s*total=([\d.]+)\]\]/);
            if (match) {
                timingData = {
                    startup: match[1],
                    discovery: match[2],
                    compile: match[3],
                    upload: match[4],
                    total: match[5]
                };
            }
        });

        child.stderr.on('data', (data) => {
            res.write(`data: ${data.toString()}\n\n`);
        });

        child.on('close', (code) => {
            // Wait a tiny bit for any pending data events to be processed
            setTimeout(() => {
                if (code === 0) {
                    const dataStr = timingData ? JSON.stringify(timingData) : 'success';
                    res.write(`event: complete\ndata: ${dataStr}\n\n`);
                } else {
                    res.write('event: error\ndata: failed\n\n');
                }
                res.end();
            }, 200);
        });

        req.on('close', () => {
            child.kill();
        });
    } catch (err) {
        res.write(`data: Error: ${err.message}\n\n`);
        res.write('event: error\ndata: system_error\n\n');
        res.end();
    }
});

// --- FORCE REBUILD STREAM ---
app.get('/rebuild_stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    logger.info('Starting FORCE_REBUILD.bat via stream...');
    const cmd = `FORCE_REBUILD.bat`;
    const child = exec(cmd, { cwd: __dirname, maxBuffer: 1024 * 1024 * 5 });

    child.stdout.on('data', (data) => {
        res.write(`data: ${data.toString()}\n\n`);
    });

    child.stderr.on('data', (data) => {
        res.write(`data: ${data.toString()}\n\n`);
    });

    child.on('close', (code) => {
        setTimeout(() => {
            if (code === 0) {
                res.write(`event: complete\ndata: success\n\n`);
            } else {
                res.write('event: error\ndata: failed\n\n');
            }
            res.end();
        }, 500);
    });

    req.on('close', () => {
        child.kill();
    });
});

app.post('/upload', async (req, res) => {
    const fullCode = req.body.code;
    const userCode = req.body.userCode || "";


    try {
        await fs.ensureDir(codeSrcFolder);
        await Promise.all([
            fs.writeFile(path.join(codeSrcFolder, 'main_B.ino'), fullCode),
            fs.writeFile(path.join(codeSrcFolder, 'User.ino'), userCode)
        ]);

        console.log("  Compile  Upload (Nitro Engine)...");
        const cmd = `powershell -ExecutionPolicy Bypass -File .\\ULTIMATE_NITRO_V6_ELITE.ps1 -Mode B`;
        currentUploadProcess = exec(cmd, { cwd: arduinoCliPath, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            currentUploadProcess = null;

            let memoryStats = "";
            if (stdout) {
                const lines = stdout.split('\n');
                lines.forEach(line => {
                    if (line.includes('RAM:   [') || line.includes('Flash: [')) {
                        memoryStats += line.trim() + '<br>';
                    }
                });
            }

            if (error) {
                if (error.killed) return res.status(499).json({ error: "Cancelled" });
                const fullLog = `========== STDOUT ==========\n${stdout || ''}\n\n========== STDERR ==========\n${stderr || ''}`;
                return res.status(500).json({ error: "Failed", details: fullLog });
            }
            res.json({ message: "Success", log: stdout, memory: memoryStats });
        });
    } catch (err) { res.status(500).json({ error: "System Error", details: err.message }); }
});

// ==========================================
//  EXPORT UF2 TO FOLDER (Ctrl+L Feature)
// ==========================================

// ==========================================
//  SERVER-SIDE FOLDER EXPLORER
// ==========================================

// Get all Windows drives (A-Z)
app.get('/get_drives', async (req, res) => {
    const drives = [];
    for (let i = 67; i <= 90; i++) { // C to Z
        const drive = String.fromCharCode(i) + ':\\';
        try {
            if (fs.existsSync(drive)) drives.push(drive);
        } catch (e) {}
    }
    res.json({ drives });
});

// List subdirectories for a given path
app.post('/list_subdirs', async (req, res) => {
    let { folderPath } = req.body;
    if (!folderPath) return res.status(400).json({ error: "Missing path" });
    
    // จัดการเรื่อง \ ให้ถูกต้องสำหรับ Windows Drive
    if (folderPath.length === 2 && folderPath.endsWith(':')) {
        folderPath += '\\';
    }

    try {
        const fs = require('fs-extra');
        if (!fs.existsSync(folderPath)) return res.json({ subdirs: [] });
        
        const items = await fs.readdir(folderPath, { withFileTypes: true });
        const subdirs = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .sort((a, b) => a.localeCompare(b));
        res.json({ subdirs });
    } catch (err) {
        // แทนที่จะส่ง 500 ให้ส่งค่าว่างแทนเพื่อให้ UI ไม่ค้าง
        res.json({ subdirs: [], error: err.message });
    }
});

app.post('/check_folder_safety', async (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) return res.status(400).json({ error: "Missing path" });
    try {
        const fs = require('fs');
        const path = require('path');
        
        // 1. ต้องมีอยู่จริงเท่านั้น (ห้ามมั่วที่อยู่)
        if (!fs.existsSync(folderPath)) {
            return res.json({ safe: false, message: "ที่อยู่นี้ไม่มีอยู่จริงในเครื่องของคุณ กรุณาตรวจสอบอีกครั้ง" });
        }

        // 2. ต้องเป็นโฟลเดอร์เท่านั้น
        const stats = fs.statSync(folderPath);
        if (!stats.isDirectory()) {
            return res.json({ safe: false, message: "ที่อยู่นี้ไม่ใช่โฟลเดอร์ กรุณาเลือกโฟลเดอร์ที่ถูกต้อง" });
        }

        // 3. ตรวจสอบความว่างเปล่า (อนุญาตแค่ไฟล์ Firmware เดิม)
        const items = fs.readdirSync(folderPath, { withFileTypes: true });
        const forbidden = items.filter(item => {
            const name = item.name.toLowerCase();
            if (item.isDirectory()) return true;
            if (name === 'flash.bat') return false;
            if (name.endsWith('.uf2')) return false;
            return true;
        });

        if (forbidden.length > 0) {
            return res.json({ safe: false, message: "โฟลเดอร์นี้ไม่ว่างเปล่า! มีไฟล์หรือโฟลเดอร์อื่นอยู่ภายใน" });
        }
        res.json({ safe: true });
    } catch (err) { res.json({ safe: false, message: "ไม่สามารถเข้าถึงที่อยู่นี้ได้ หรือที่อยู่ไม่ถูกต้อง" }); }
});
app.get('/export_uf2_stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const send = (msg) => res.write(`data: ${msg}\n\n`);
    const sendEvent = (evt, data) => res.write(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`);
    const mode = (req.query.mode || 'block');
    const targetFolder = req.query.folder || '';
    if (!targetFolder) {
        send('[ERROR] No folder specified');
        res.write('event: error_event\ndata: no_folder\n\n');
        res.end(); return;
    }
    try {
        const mainCode = stagedCode.main;
        const userCode = stagedCode.user;
        stagedCode = { main: null, user: null };
        if (mainCode) {
            const outFilename = mode === 'block' ? 'main_B.ino' : 'main_T.ino';
            await fs.writeFile(require('path').join(codeSrcFolder, outFilename), mainCode);
        }
        if (userCode) {
            await fs.writeFile(require('path').join(codeSrcFolder, 'User.ino'), userCode);
        }
        send(`>>> Mode: ${mode.toUpperCase()} | Target: ${targetFolder}\n`);
        send('>>> Compiling (Build-Only)...\n');
        const buildMode = mode === 'text' ? 'T' : 'B';
        const globalStart = Date.now();
        const buildCmd = `powershell -ExecutionPolicy Bypass -File .\\ULTIMATE_NITRO_V6_ELITE.ps1 -Mode ${buildMode} -BuildOnly -GlobalStartTime ${globalStart}`;
        await new Promise((resolve, reject) => {
            const child = require('child_process').exec(buildCmd, { cwd: arduinoCliPath, maxBuffer: 1024 * 1024 * 5 });
            child.stdout.on('data', d => send(d.toString()));
            child.stderr.on('data', d => send(d.toString()));
            child.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`Build failed with code ${code}`));
            });
            req.on('close', () => child.kill());
        });
        const arduinoCli = arduinoCliPath;
        const elfPath = require('path').join(arduinoCli, 'build_cache', 'main_B.ino.elf');
        const projName = (global.lastProjectName || 'firmware').replace(/[^a-zA-Z0-9_-]/g, '_');
        const uf2Name = `${projName}_${buildMode}.uf2`;
        const uf2Temp = require('path').join(arduinoCli, 'build_cache', uf2Name);
        const picotool = require('path').join(arduinoCli, 'portable_tools', 'picotool', 'picotool.exe');
        send(`\n>>> Converting ELF to UF2...\n`);
        await new Promise((resolve, reject) => {
            const child = require('child_process').exec(`"${picotool}" uf2 convert "${elfPath}" "${uf2Temp}" --family rp2350-arm-s`, { cwd: arduinoCli }, (err, stdout, stderr) => {
                if (stdout) send(stdout);
                if (stderr) send(stderr);
                if (err) reject(new Error('picotool failed'));
                else resolve();
            });
            req.on('close', () => child.kill());
        });
        const existingItems = await fs.readdir(targetFolder, { withFileTypes: true });
        const forbidden = existingItems.filter(item => {
            const name = item.name.toLowerCase();
            if (item.isDirectory()) return true;
            if (name === 'flash.bat') return false;
            if (name.endsWith('.uf2')) return false;
            return true;
        });
        if (forbidden.length > 0) {
            send(`\n[ERROR] Safety abort: Folder is not safe!\n`);
            res.write('event: error_event\ndata: forbidden_folder\n\n');
            res.end(); return;
        }
        send(`>>> Cleaning and Exporting...\n`);
        for (const f of existingItems) { await fs.remove(require('path').join(targetFolder, f.name)); }
        const destUf2 = require('path').join(targetFolder, uf2Name);
        await fs.copy(uf2Temp, destUf2);
        send(`>>> Saved: ${uf2Name} OK\n`);
        const flashBatPath = require('path').join(targetFolder, 'flash.bat');
        const flashBatContent = `@echo off
chcp 65001 >nul
title Flash PuppyBot6 Firmware
echo ============================================
echo  RP2350 Pro IDE - Flash Tool
echo  File: ${uf2Name}
echo ============================================
echo.
echo [1] Hold BOOTSEL button on board.
echo [2] Connect USB cable (or press Reset).
echo [3] Wait for "RPI-RP2" drive to appear...
echo.
echo Waiting for connection...
set "UF2_FILE=%~dp0${uf2Name}"
set "START_TIME=%time%"
:WAIT_FOR_DRIVE
set "TARGET_DRIVE="
for %%d in (D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist %%d:\INFO_UF2.TXT set "TARGET_DRIVE=%%d:"
    if exist %%d:\INDEX.HTM set "TARGET_DRIVE=%%d:"
)
if not defined TARGET_DRIVE (
    timeout /t 1 /nobreak >nul
    goto WAIT_FOR_DRIVE
)
echo.
echo Found Drive %TARGET_DRIVE%
echo Flashing...
copy /Y "%UF2_FILE%" %TARGET_DRIVE%\ >nul
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to write to %TARGET_DRIVE%
    pause
    exit /b 1
)
set "END_TIME=%time%"
for /f "tokens=*" %%a in ('powershell -Command "([datetime]'%END_TIME%' - [datetime]'%START_TIME%').TotalSeconds"') do set "DURATION=%%a"
echo.
echo ============================================
echo  SUCCESS! Flash Completed.
echo  Total Time: %DURATION% seconds
echo ============================================
echo.
pause
exit /b 0
`;
        await fs.writeFile(flashBatPath, flashBatContent, 'utf8');
        send(`>>>  flash.bat \n`);
        send(`\n !\n`);

        sendEvent('complete', { uf2name: uf2Name, folder: targetFolder });
        res.end();

    } catch (err) {
        send(`\n[ERROR] ${err.message}\n`);
        res.write('event: error_event\ndata: failed\n\n');
        res.end();
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` Server Ready: http://localhost:${PORT}`);
    console.log(`=========================================`);
});
