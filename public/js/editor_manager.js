/**
 * Editor Manager - Handles Ace Editor configuration, Serial Monitor, and C++ Code Preview
 */

// --- Global Utilities ---
window.copyToClipboard = (text) => {
    if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'คัดลอกล้มเหลว (ใช้วิธีสำรอง)', showConfirmButton: false, timer: 1500 });
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
            title: "",
            html: `
                <div style="text-align:center; padding:40px 0 10px; overflow:visible;">
                    <div style="width:60px; height:60px; background:rgba(16, 185, 129, 0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 15px; overflow:visible;">
                        <i class="fa-solid fa-clipboard-check" style="color:var(--success-color); font-size:30px; filter:drop-shadow(0 5px 15px rgba(16, 185, 129, 0.3));"></i>
                    </div>
                    <div style="font-size:20px; font-weight:800; color:var(--text-main); margin-bottom:5px;">คัดลอกสำเร็จ!</div>
                    <div style="font-size:14px; color:var(--text-muted); font-weight:500;">ข้อความถูกบันทึกลงในคลิปบอร์ดแล้ว</div>
                </div>
            `,
            timer: 2000,
            showConfirmButton: false,
            background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
            color: 'var(--text-main)',
            width: '400px',
            padding: '1.5rem',
            toast: false // Ensure it's a centered dialog for better layout control
        });
    }).catch(err => {
        console.error('Async Copy failed', err);
    });
};

window.showStatusNotify = (title, msg, type = 'success') => {
    const isDark = window.currentThemeMode === 'dark';
    const bgColor = isDark ? '#1a1a1b' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#1a1a1b';
    const subTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Type-based configuration
    const config = {
        success: { color: '#10b981', icon: 'fa-check' },
        warning: { color: '#fbbf24', icon: 'fa-triangle-exclamation' }
    }[type] || { color: '#10b981', icon: 'fa-check' };

    let notify = document.createElement('div');
    notify.style = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 999999; background: ${bgColor}; border: 1px solid ${borderColor};
        padding: 40px 30px; border-radius: 24px; text-align: center; width: 350px;
        box-shadow: 0 30px 70px ${isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.15)'}; pointer-events: none;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity: 0; scale: 0.8;
        color: ${textColor};
    `;
    notify.innerHTML = `
        <div style="width:70px; height:70px; background:${config.color}26; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:20px;">
            <i class="fa-solid ${config.icon}" style="color:${config.color}; font-size:36px; filter:drop-shadow(0 0 10px ${config.color}66);"></i>
        </div>
        <div style="font-size:22px; font-weight:800; color:${textColor}; margin-bottom:8px;">${title}</div>
        <div style="font-size:14px; color:${subTextColor}; font-weight:500;">${msg}</div>
    `;
    document.body.appendChild(notify);

    requestAnimationFrame(() => {
        notify.style.opacity = '1';
        notify.style.scale = '1';
    });

    setTimeout(() => {
        notify.style.opacity = '0';
        notify.style.scale = '0.9';
        notify.style.transform = 'translate(-50%, -40%)';
        setTimeout(() => notify.remove(), 400);
    }, 1800);
};


const showPortNotFoundError = (retryCallback, closeCallback) => {
    Swal.fire({
        title: "",
        html: `
            <div style="text-align:center; padding:30px 10px 10px; overflow:visible;">
                <div style="width:85px; height:85px; background:rgba(245, 158, 11, 0.1); border-radius:24px; display:flex; align-items:center; justify-content:center; margin:0 auto 25px; overflow:visible; position:relative;">
                    <i class="fa-solid fa-plug-circle-exclamation" style="color:#f59e0b; font-size:42px; filter:drop-shadow(0 8px 20px rgba(245, 158, 11, 0.4));"></i>
                    <div style="position:absolute; top:-5px; right:-5px; width:24px; height:24px; background:#f59e0b; border-radius:50%; border:3px solid var(--bg-panel); display:flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-question" style="color:white; font-size:12px; font-weight:900;"></i>
                    </div>
                </div>
                
                <div style="font-size:24px; font-weight:800; color:var(--text-main); margin-bottom:12px; letter-spacing:-0.5px;">ไม่พบการเชื่อมต่อบอร์ด</div>
                <div style="font-size:15px; color:var(--text-muted); font-weight:400; line-height:1.6; margin-bottom:30px; padding:0 20px;">
                    กรุณาตรวจสอบว่า <span style="color:var(--text-main); font-weight:700;">ลืมเสียบสาย</span> หรือ <span style="color:var(--text-main); font-weight:700;">เสียบสายไม่แน่น</span> หรือไม่? <br>
                    ลองถอดแล้วเสียบใหม่ให้แน่น แล้วกดปุ่มลองอีกครั้ง
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:10px;">
                    <button id="btnRetryUpload" class="btn primary" style="padding:14px; border-radius:14px; font-weight:700; font-size:15px; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);">
                        <i class="fa-solid fa-rotate-right"></i> ลองอีกครั้ง
                    </button>
                    <button id="btnCloseNotify" class="btn" style="padding:14px; border-radius:14px; font-weight:600; font-size:15px; background:var(--bg-panel); border:1px solid var(--border-light); color:var(--text-light);">
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: true,
        width: '440px',
        padding: '1.5rem',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        didOpen: () => {
            document.getElementById('btnRetryUpload').addEventListener('click', () => {
                Swal.close();
                if (retryCallback) retryCallback();
            });
            document.getElementById('btnCloseNotify').addEventListener('click', () => {
                Swal.close();
                if (closeCallback) closeCallback();
            });
        }
    });
};



// --- 🇹🇭 ULTIMATE THAI CHARACTER PATCH (Zero-Width Marks) ---
(function() {
    try {
        const lang = ace.require("ace/lib/lang");
        const oldIsCombining = lang.isCombining;
        lang.isCombining = function(ch) {
            if (typeof ch === 'string') ch = ch.charCodeAt(0);
            // Comprehensive Thai Combining Marks Range (Vowels & Tone Marks)
            if ((ch >= 0x0E31 && ch <= 0x0E3A) || (ch >= 0x0E47 && ch <= 0x0E4E)) return true;
            return oldIsCombining ? oldIsCombining(ch) : false;
        };
    } catch(e) { console.error("Thai Patch Failed", e); }
})();

// Initialize Monaco Editor for Main Code Preview
(async function initMainEditor() {
    await loadMonacoAsync();
    window.editor = monaco.editor.create(document.getElementById("codePreview"), {
        value: "",
        language: "cpp",
        theme: window.currentThemeMode === 'light' ? 'vs' : 'vs-dark',
        fontSize: 16,
        fontFamily: "Consolas, 'Courier New', monospace",
        readOnly: true,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        disableMonospaceOptimizations: true,
        letterSpacing: 0,
        renderWhitespace: "none"
    });

    window.editor.onDidChangeModelContent(() => {
        if (window.isManualEditing) updateManualCode();
        debouncedLint(window.editor.getModel());
    });

    // 🔍 Attach custom Find system
    if (window.EditorFind) EditorFind.attach(window.editor);

    // ✨ Register C++ Formatter
    if (typeof monaco !== 'undefined') {
        monaco.languages.registerDocumentFormattingEditProvider('cpp', {
            provideDocumentFormattingEdits(model) {
                return [{
                    range: model.getFullModelRange(),
                    text: beautifyCppCode(model.getValue())
                }];
            }
        });
    }
})();

// =========================================
// 🔍 Custom Editor Find & Replace Logic
// =========================================
window.EditorFind = {
    editor: null,
    matches: [],
    currentIndex: -1,
    lastUserSelection: null,
    isJumping: false,
    options: {
        matchCase: false,
        wholeWord: false,
        isRegex: false,
        findInSelection: false,
        preserveCase: false
    },

    attach(editorInstance) {
        if (!editorInstance) return;
        
        // 🛡️ Disable Monaco's native find widget
        editorInstance.updateOptions({ 
            find: { 
                addExtraSpaceOnTop: false, 
                autoFindInSelection: 'never', 
                seedSearchStringFromSelection: 'never' 
            } 
        });

        // ⌨️ Block Monaco's native Ctrl+F / Ctrl+H (handled globally by ui_manager.js)
        editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => { /* handled globally */ });
        editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => { /* handled globally */ });
        
        // Listen for editor focus to update the target
        editorInstance.onDidFocusEditorText(() => {
            this.editor = editorInstance;
        });

        // 🧠 Track actual user selection, ignore automated jumps
        editorInstance.onDidChangeCursorSelection((e) => {
            if (!this.isJumping) {
                this.lastUserSelection = e.selection;
            }
        });
        
        // Initialize if first time
        if (!this.editor) this.editor = editorInstance;
    },

    toggle(withReplace = false) {
        // Fallback: Ensure editor is set if missing after theme/mode changes
        if (!this.editor && window.editor) this.editor = window.editor;
        
        const widget = document.getElementById('editorFindWidget');
        const replaceRow = document.getElementById('replaceRow');
        
        const isVisible = widget && widget.style.display !== 'none';
        const isReplaceVisible = replaceRow ? replaceRow.style.display !== 'none' : false;

        if (isVisible && (withReplace === isReplaceVisible)) {
            this.close();
        } else {
            this.show(withReplace);
        }
    },

    show(withReplace = false) {
        let widget = document.getElementById('editorFindWidget');
        let input = document.getElementById('editorFindInput');
        
        // 🛡️ RECOVERY SYSTEM: If widget was destroyed by a Modal closing, recreate it!
        if (!widget && window._editorFindWidgetTemplate) {
            console.log("[EditorFind] 🛠️ Widget was destroyed, recreating from template...");
            const temp = document.createElement('div');
            temp.innerHTML = window._editorFindWidgetTemplate;
            widget = temp.firstElementChild;
            document.body.appendChild(widget);
            // Re-fetch input from the new widget
            input = document.getElementById('editorFindInput');
        } else if (widget && !window._editorFindWidgetTemplate) {
            // Store template for first time
            window._editorFindWidgetTemplate = widget.outerHTML;
        }

        if (!widget || !input || !this.editor) {
            console.error("[EditorFind] ❌ CRITICAL: Widget missing and no template available.");
            return;
        }

        // 🚀 Teleport Widget to the active editor's container
        const domNode = this.editor.getContainerDomNode();
        const container = domNode ? domNode.parentElement : null;
        
        if (container) {
            if (widget.parentElement !== container) {
                container.appendChild(widget);
                widget.style.position = 'absolute';
                widget.style.top = '45px';
                widget.style.right = '20px';
                widget.style.zIndex = '10000';
            }
        } else {
            console.error("[EditorFind] ❌ Target container NOT FOUND. Editor might be detached.");
            return;
        }

        widget.style.display = 'flex';
        widget.removeAttribute('aria-hidden');
        
        if (this.editor && this.editor.getModel()) {
            const selection = this.editor.getModel().getValueInRange(this.editor.getSelection());
            if (selection && selection.length < 100 && selection.length > 0) {
                input.value = selection;
            }
        }

        this.toggleReplace(withReplace);
        input.focus();
        input.select();
        this.handleSearch();
    },

    close() {
        const widget = document.getElementById('editorFindWidget');
        if (widget) {
            widget.style.display = 'none';
            // 🛡️ Restore to body so it's safe if the current container (modal) is destroyed
            if (widget.parentElement !== document.body) {
                document.body.appendChild(widget);
            }
        }
        this.clearDecorations();
        if (this.editor) this.editor.focus();
    },

    toggleReplace(forceShow = null) {
        const row = document.getElementById('replaceRow');
        const btn = document.getElementById('btnToggleReplace');
        if (!row || !btn) return;

        const show = forceShow !== null ? forceShow : row.style.display === 'none';
        if (show) {
            row.style.display = 'flex';
            btn.classList.add('active');
        } else {
            row.style.display = 'none';
            btn.classList.remove('active');
        }
    },

    toggleOption(opt) {
        if (!this.editor) return;
        this.options[opt] = !this.options[opt];
        
        if (opt === 'findInSelection') {
            if (this.options.findInSelection) {
                // Try the tracked user selection first, fallback to current editor selection
                let sel = (this.lastUserSelection && !this.lastUserSelection.isEmpty()) 
                            ? this.lastUserSelection 
                            : this.editor.getSelection();

                // Lock onto the true user selection, not the active highlighted match
                if (sel && !sel.isEmpty()) {
                    this.lockedSelection = monaco.Range.fromPositions(
                        sel.getStartPosition(), 
                        sel.getEndPosition()
                    );
                } else {
                    this.options.findInSelection = false;
                    if (window.showStatusNotify) {
                        window.showStatusNotify('Find', 'Please highlight some text first to use Find in Selection.', 'warning');
                    }
                    return; 
                }
            } else {
                this.lockedSelection = null;
            }
        }

        const btnId = { 
            matchCase: 'optCase', 
            wholeWord: 'optWord', 
            isRegex: 'optRegex',
            findInSelection: 'optSelection',
            preserveCase: 'optPreserveCase'
        }[opt];
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.toggle('active', this.options[opt]);
        
        this.handleSearch();
        // Return focus to input if it was on a button
        document.getElementById('editorFindInput').focus();
    },

    handleSearch() {
        if (!this.editor) return;
        const model = this.editor.getModel();
        const query = document.getElementById('editorFindInput').value;
        const countLabel = document.getElementById('editorFindCount');

        if (!query) {
            this.matches = [];
            this.currentIndex = -1;
            countLabel.innerText = 'No results';
            this.clearDecorations();
            return;
        }

        // Use the locked range if findInSelection is active
        const range = this.options.findInSelection ? this.lockedSelection : null;

        this.matches = model.findMatches(
            query, 
            range, 
            this.options.isRegex, 
            this.options.matchCase, 
            this.options.wholeWord ? " `~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?\n" : null,
            false
        );

        if (this.matches.length > 0) {
            this.currentIndex = 0;
            this.updateUI();
            this.jumpToMatch();
        } else {
            this.currentIndex = -1;
            countLabel.innerText = '0 of 0';
            this.clearDecorations();
        }
    },

    moveSelection(dir) {
        if (this.matches.length === 0) return;
        this.currentIndex = (this.currentIndex + dir + this.matches.length) % this.matches.length;
        this.updateUI();
        this.jumpToMatch();
    },

    jumpToMatch() {
        if (this.currentIndex === -1 || !this.matches[this.currentIndex]) return;
        const match = this.matches[this.currentIndex];
        
        this.isJumping = true; // Flag to ignore selection change
        this.editor.setSelection(match.range);
        this.isJumping = false;
        
        this.editor.revealRangeInCenterIfOutsideViewport(match.range);
        this.highlightMatches();
    },

    updateUI() {
        const countLabel = document.getElementById('editorFindCount');
        if (countLabel) {
            countLabel.innerText = `${this.currentIndex + 1} of ${this.matches.length}`;
        }
    },

    highlightMatches() {
        const decorations = [];
        
        this.matches.forEach((m, idx) => {
            const isActive = (idx === this.currentIndex);
            
            // 1. Highlight the exact word match
            decorations.push({
                range: m.range,
                options: {
                    className: isActive ? 'editor-match-active' : 'editor-match-bg',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGlow
                }
            });

            // 2. Highlight the entire line of the active match
            if (isActive) {
                decorations.push({
                    range: new monaco.Range(m.range.startLineNumber, 1, m.range.startLineNumber, 1),
                    options: {
                        isWholeLine: true,
                        className: 'editor-match-line-active'
                    }
                });
            }
        });

        this.decorations = this.editor.deltaDecorations(this.decorations || [], decorations);
    },

    clearDecorations() {
        if (this.editor && this.decorations) {
            this.decorations = this.editor.deltaDecorations(this.decorations, []);
        }
    },

    replace() {
        if (this.currentIndex === -1 || !this.matches[this.currentIndex]) return;
        const match = this.matches[this.currentIndex];
        let replaceText = document.getElementById('editorReplaceInput').value;
        
        if (this.options.preserveCase) {
            replaceText = this.applyPreserveCase(match.matches[0], replaceText);
        }

        this.editor.executeEdits('find-replace', [{
            range: match.range,
            text: replaceText,
            forceMoveMarkers: true
        }]);
        
        this.handleSearch(); // Refresh matches
    },

    replaceAll() {
        if (this.matches.length === 0) return;
        const replaceTextBase = document.getElementById('editorReplaceInput').value;
        const edits = this.matches.map(m => {
            let text = replaceTextBase;
            if (this.options.preserveCase) {
                text = this.applyPreserveCase(m.matches[0], text);
            }
            return {
                range: m.range,
                text: text
            };
        });

        this.editor.executeEdits('find-replace-all', edits);
        this.handleSearch();
    },
    applyPreserveCase(original, replacement) {
        if (original === original.toUpperCase()) return replacement.toUpperCase();
        if (original === original.toLowerCase()) return replacement.toLowerCase();
        if (original.length > 0 && original[0] === original[0].toUpperCase()) {
            return replacement[0].toUpperCase() + replacement.substring(1);
        }
        return replacement;
    }
};

// ⌨️ Specific listener for the find input to handle Enter and Arrows precisely
document.addEventListener('DOMContentLoaded', () => {
    const findInput = document.getElementById('editorFindInput');
    if (findInput) {
        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                EditorFind.moveSelection(e.shiftKey ? -1 : 1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                EditorFind.moveSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                EditorFind.moveSelection(-1);
            }
        });
    }
});

// --- Serial Monitor Logic ---
window.port = null; window.reader = null; window.keepReading = false; window.closedPromise = null; window.intentionalDisconnect = true;

navigator.serial.addEventListener("disconnect", (event) => {
    if (window.port && event.target === window.port) {
        window.intentionalDisconnect = false; disconnectSerialUI(); setTimeout(attemptReconnect, 1000);
    }
});

async function attemptReconnect() {
    if (window.intentionalDisconnect) return;
    const ports = await navigator.serial.getPorts();
    if (ports.length > 0) { try { window.port = ports[0]; await connectPort(); } catch (e) { setTimeout(attemptReconnect, 2000); } }
    else { setTimeout(attemptReconnect, 2000); }
}

async function toggleSerial() {
    if (window.port) { window.intentionalDisconnect = true; await disconnectSerial(); }
    else { try { window.port = await navigator.serial.requestPort(); window.intentionalDisconnect = false; await connectPort(); } catch (e) { } }
}

async function connectPort() {
    if (!window.port) return;
    try {
        await window.port.open({ baudRate: 115200 });
        let btn = document.getElementById('btnSerial'); if (btn) { btn.innerHTML = "<i class='fa-solid fa-plug-circle-xmark'></i> Disconnect Serial"; btn.classList.add('danger'); btn.classList.remove('primary'); }
        let statusBtn = document.getElementById('bottomSerialStatus'); let statusText = document.getElementById('bottomSerialText');
        if (statusBtn) { statusBtn.classList.remove('disconnected'); statusBtn.classList.add('connected'); }
        if (statusText) statusText.innerText = "Connected (115200)";
        if (statusBtn) statusBtn.querySelector('i').className = "fa-solid fa-plug-circle-check";
        window.keepReading = true; readLoop();
    } catch (e) { }
}

async function readLoop() {
    const decoder = new TextDecoderStream(); window.closedPromise = window.port.readable.pipeTo(decoder.writable); window.reader = decoder.readable.getReader(); const logElement = document.getElementById('serialLog');
    try {
        while (window.keepReading) {
            const { value, done } = await window.reader.read(); if (done) break;
            const span = document.createElement('span'); span.textContent = value; if (logElement) logElement.appendChild(span);
            if (logElement && logElement.childNodes.length > 1000) logElement.removeChild(logElement.firstChild);
            if (window.autoScroll && logElement) logElement.scrollTop = logElement.scrollHeight;
        }
    } catch (e) { } finally { if (window.reader) window.reader.releaseLock(); }
}

function disconnectSerialUI() {
    let btn = document.getElementById('btnSerial'); if (btn) { btn.innerHTML = "<i class='fa-solid fa-plug'></i> Connect Serial"; btn.classList.remove('danger'); btn.classList.add('primary'); }
    let statusBtn = document.getElementById('bottomSerialStatus'); let statusText = document.getElementById('bottomSerialText');
    if (statusBtn) { statusBtn.classList.add('disconnected'); statusBtn.classList.remove('connected'); }
    if (statusText) statusText.innerText = "No Port Connected";
    if (statusBtn) statusBtn.querySelector('i').className = "fa-solid fa-circle-xmark";
}

async function disconnectSerial() {
    window.keepReading = false; window.intentionalDisconnect = true;
    if (window.reader) { try { await window.reader.cancel(); } catch (e) { } }
    if (window.closedPromise) { try { await window.closedPromise.catch(() => { }); } catch (e) { } }
    if (window.port) { try { await window.port.close(); } catch (e) { } window.port = null; }
    disconnectSerialUI();
}

function toggleAutoScroll() {
    window.autoScroll = !window.autoScroll;
    const btn = document.getElementById('btnScroll');
    if (window.autoScroll) { if (btn) { btn.classList.add('primary'); btn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>'; } }
    else { if (btn) { btn.classList.remove('primary'); btn.innerHTML = '<i class="fa-solid fa-pause"></i>'; } }
}

function clearSerial() { const el = document.getElementById('serialLog'); if (el) el.innerText = ""; }

async function sendSerial() {
    if (!window.port) return;
    const inputEl = document.getElementById('serialIn');
    const val = inputEl.value + '\n';
    const writer = window.port.writable.getWriter(); await writer.write(new TextEncoder().encode(val)); writer.releaseLock();
    inputEl.value = '';
}

// --- Upload Logic ---
// --- Upload Logic ---
function formatPioLog(text) {
    if (!text) return "";
    let formatted = text;

    // 1. Function context: main_B.ino: In function 'void setup()':
    const funcRegex = /([^:\n]+): In function '(.+?)':/gi;
    formatted = formatted.replace(funcRegex, '<span style="color:var(--text-light); opacity:0.7;">$1:</span> <span style="color:var(--text-light); font-style:italic;">In function \'<span style="color:var(--accent-color); font-weight:bold;">$2</span>\':</span>');
    
    // Fallback for context without filename
    const funcOnlyRegex = /In function '(.+?)':/gi;
    formatted = formatted.replace(funcOnlyRegex, '<span style="color:var(--text-light); font-style:italic;">In function \'<span style="color:var(--accent-color); font-weight:bold;">$1</span>\':</span>');

    // 2. GCC Error/Warning Format: file:line:col: [error|warning|note]: message
    const gccRegex = /([^:\n]+):(\d+):(\d+): (error|warning|note): (.+)/gi;
    formatted = formatted.replace(gccRegex, (match, file, line, col, type, msg) => {
        const typeColor = type.toLowerCase() === 'error' ? 'var(--danger-color)' : (type.toLowerCase() === 'warning' ? 'var(--warning-color)' : 'var(--info-color)');
        return `<span style="color:var(--text-light); opacity:0.7;">${file}:</span><span style="color:var(--primary-color); font-weight:bold;">${line}:${col}:</span> <span style="color:${typeColor}; font-weight:bold; text-transform:uppercase;">${type}:</span> <span style="color:var(--text-main); font-weight:500;">${msg}</span>`;
    });


    // 2.5 Code pointer:      ^
    const pointerRegex = /^(\s*\^)/gm;
    formatted = formatted.replace(pointerRegex, '<span style="color:var(--success-color); font-weight:bold;">$1</span>');

    // 3. C++ Syntax Highlighting for Logs (using lookahead to not break tags)
    // Keywords / Types
    const codeKeywords = /\b(void|int|bool|float|double|long|String|char|if|else|while|for|return|uint\d+_t|byte|static|volatile|const)\b(?![^<]*>)/g;
    formatted = formatted.replace(codeKeywords, '<span style="color:var(--accent-color); font-weight:bold;">$1</span>');

    // Numbers
    formatted = formatted.replace(/\b(\d+)\b(?![^<]*>)/g, '<span style="color:var(--warning-color); font-weight:600;">$1</span>');

    // Quoted text in logs
    formatted = formatted.replace(/'([^']+)'(?![^<]*>)/g, '<span style="color:var(--success-color); font-style:italic;">\'$1\'</span>');

    // 4. Highlight standalone keywords (Case Insensitive)
    formatted = formatted.replace(/\bSUCCESS\b/gi, '<span style="color:var(--success-color); font-weight:bold;">SUCCESS</span>');
    formatted = formatted.replace(/\b(ERROR|FAILED)\b/gi, '<span style="color:var(--danger-color); font-weight:bold;">$1</span>');
    formatted = formatted.replace(/\bWARNING\b/gi, '<span style="color:var(--warning-color); font-weight:bold;">WARNING</span>');
    formatted = formatted.replace(/\[\+\]/g, '<span style="color:var(--info-color);">[+]</span>');
    formatted = formatted.replace(/Configuring/g, '<span style="color:var(--primary-color);">Configuring</span>');
    formatted = formatted.replace(/Uploading/g, '<span style="color:var(--accent-color); font-weight:bold;">Uploading</span>');

    return formatted;
}

async function handleUpload() {
    if (!window.currentProjectName) return Swal.fire('แจ้งเตือน', 'โปรดตั้งชื่อโปรเจกต์ก่อนอัปโหลด', 'warning');
    
    // 🛡️ Critical: Disconnect Serial Monitor before upload to unlock the port for the backend
    let wasSerialConnected = !!window.port;
    if (window.port) {
        console.log("[Upload] Disconnecting Serial Monitor to unlock port...");
        await disconnectSerial();
    }

    // Clear old decorations in Monaco if present

    if (window.editor && window.EditorFind) window.EditorFind.clearDecorations();


    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(window.workspace));
    
    // --- 🛡️ Decide which code to upload ---
    let fullCode = "";
    let userCode = "";
    let isManual = false;

    if (window.isManualEditing && window.editor) {
        fullCode = window.editor.getValue();
        userCode = window.generatedUserCode || ""; 
        isManual = true;
    } else {
        fullCode = window.generatedCppCode;
        userCode = window.generatedUserCode;
    }

    // Save project metadata
    await API.saveProject(window.currentProjectName + '.rp2350', xml, window.customBlocksData, fullCode);

    const startTime = performance.now();
    let pioSwal = Swal.fire({
        title: "",
        html: `
            <div style="text-align:left; padding:0 10px; overflow:visible; margin-top:40px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px; overflow:visible;">
                    <div class="flash-loader" style="overflow:visible; flex-shrink:0; width:45px; height:45px; background:rgba(251,191,36,0.1); border-radius:12px; display:flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-bolt" style="color:#fbbf24; font-size:20px; filter:drop-shadow(0 0 8px rgba(251,191,36,0.6));"></i>
                    </div>
                    <div>
                        <div style="font-size:20px; font-weight:800; color:var(--text-main); line-height:1.2;">กำลังเริ่มส่งข้อมูล...</div>
                        <div style="font-size:12px; color:var(--text-muted); font-weight:400;">${isManual ? 'Manual Edit Upload' : 'Blockly Project Upload'}</div>
                    </div>
                </div>
                
                <div id="pioLog" style="text-align:left; font-family:var(--font-code); font-size:11px; height:35vh; max-height:280px; overflow-y:auto; background:var(--code-bg); color:var(--text-main); padding:15px; border-radius:10px; border:1px solid var(--border-light); line-height:1.5; box-shadow:inset 0 2px 10px rgba(0,0,0,0.05); white-space:pre-wrap; word-break:break-word;">
                    <div style="color:var(--text-light); opacity:0.6; font-style:italic;">รอรับข้อมูลจากเซิร์ฟเวอร์...</div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding:0 2px;">
                    <div id="uploadTimeDisplay" style="font-size:10px; color:var(--text-muted);"><i class="fa-regular fa-clock"></i> 0.0s</div>
                    <div id="uploadStatusText" style="font-size:10px; color:var(--primary-color); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Building Project...</div>
                </div>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: false,
        cancelButtonText: 'ยกเลิก',
        cancelButtonColor: 'var(--border-light)',
        allowOutsideClick: false,
        width: '700px',
        padding: '2rem',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        didOpen: async () => {
            const logEl = document.getElementById('pioLog');
            const statusText = document.getElementById('uploadStatusText');
            const timeDisplay = document.getElementById('uploadTimeDisplay');
            let hasStartedBuild = false;
            let accumulatedLogs = ""; // NEW: Robust log accumulator

            const timeInterval = setInterval(() => {
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
                if (timeDisplay) timeDisplay.innerHTML = `<i class="fa-regular fa-clock"></i> ${elapsed}s`;
            }, 100);

            const handleLog = (event) => {
                if (!hasStartedBuild) {
                    logEl.innerHTML = "";
                    hasStartedBuild = true;
                }
                accumulatedLogs += event.data + "\n";
                const div = document.createElement('div');
                div.style.marginBottom = "2px";
                div.innerHTML = formatPioLog(event.data);
                logEl.appendChild(div);
                logEl.scrollTop = logEl.scrollHeight;

                if (event.data.toLowerCase().includes('uploading')) {
                    statusText.innerText = "Flashing to Board...";
                    statusText.style.color = "var(--accent-color)";
                }
            };
            // Stage the code first via POST to avoid URL length limits (Error 431)
            await fetch('/stage_code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mainCode: fullCode, userCode: userCode })
            });

            const eventSource = new EventSource(`/upload_stream?mode=block`);
            eventSource.onmessage = handleLog;
            eventSource.addEventListener('complete', (e) => {
                eventSource.close();
                clearInterval(timeInterval);
                
                const realTotalTime = ((performance.now() - startTime) / 1000).toFixed(1);
                let timing = { startup: 0, discovery: 0, compile: 0, upload: 0, total: realTotalTime };
                try { 
                    if (e.data !== 'success') {
                        const serverTiming = JSON.parse(e.data);
                        timing.startup = serverTiming.startup;
                        timing.discovery = serverTiming.discovery;
                        timing.compile = serverTiming.compile;
                        timing.upload = serverTiming.upload;
                    }
                } catch(err) { }

                // --- 🔄 Auto-Reconnect Logic ---
                if (wasSerialConnected) {
                    console.log("[Upload] Successful. Waiting for board to reboot before reconnecting serial...");
                    window.intentionalDisconnect = false; 
                    // Give the board 2-3 seconds to reboot and for the OS to detect the COM port again
                    setTimeout(() => {
                        attemptReconnect();
                    }, 2500);
                }

                Swal.fire({

                    title: "",
                    html: `
                        <div style="text-align:center; padding:40px 0 10px; overflow:visible;">
                            <div style="width:70px; height:70px; background:rgba(16, 185, 129, 0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; overflow:visible;">
                                <i class="fa-solid fa-check" style="color:var(--success-color); font-size:36px; filter:drop-shadow(0 5px 15px rgba(16, 185, 129, 0.3));"></i>
                            </div>
                            <div style="font-size:24px; font-weight:800; color:var(--text-main); margin-bottom:8px;">สำเร็จ!</div>
                            <div style="font-size:15px; color:var(--text-muted); font-weight:500;">อัปโหลดโปรแกรมลงบอร์ดเรียบร้อยแล้ว</div>
                            
                            <div style="margin-top:25px; padding:22px; background:var(--bg-panel); border-radius:16px; border:1px solid var(--border-light); display:flex; flex-direction:column; gap:12px; box-shadow:var(--shadow-sm); text-align:left;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-light); font-weight:500;">1. ระบบเริ่มต้น (Startup)</span>
                                    <span style="font-size:13px; font-weight:700; color:var(--primary-color); font-family:var(--font-code);">${timing.startup}s</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-light); font-weight:500;">2. สแกนพอร์ต (Discovery)</span>
                                    <span style="font-size:13px; font-weight:700; color:var(--primary-color); font-family:var(--font-code);">${timing.discovery}s</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-light); font-weight:500;">3. คอมไพล์โค้ด (Compile)</span>
                                    <span style="font-size:13px; font-weight:700; color:var(--primary-color); font-family:var(--font-code);">${timing.compile}s</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-light); font-weight:500;">4. ส่งข้อมูลลงบอร์ด (Upload)</span>
                                    <span style="font-size:13px; font-weight:700; color:var(--primary-color); font-family:var(--font-code);">${timing.upload}s</span>
                                </div>
                                <div style="height:1px; background:var(--border-light); margin:8px 0; opacity:0.6;"></div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:15px; font-weight:800; color:var(--text-main);">รวมเวลาทั้งหมด</span>
                                    <span style="font-size:16px; font-weight:800; color:var(--success-color); font-family:var(--font-code); filter:drop-shadow(0 0 8px rgba(16, 185, 129, 0.4));">${timing.total} วินาที</span>
                                </div>
                            </div>
                        </div>
                    `,
                    timer: 5000,
                    showConfirmButton: false,
                    background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
                    color: 'var(--text-main)',
                    width: '450px',
                    padding: '2rem'
                });
            });
            eventSource.addEventListener('error', (e) => {
                eventSource.close();
                window.lastUploadLogs = accumulatedLogs; // Store for copy button
                
                // --- NEW: Handle Priority using standardized ERROR_CATEGORY ---
                const isPortError = accumulatedLogs.includes('TIMEOUT') || 
                                   accumulatedLogs.includes('FLASH_ERROR') || 
                                   accumulatedLogs.includes('REBOOTING BOARD') ||
                                   accumulatedLogs.toLowerCase().includes('connection_error') ||
                                   accumulatedLogs.toLowerCase().includes('no accessible rp2350');
                
                const hasCompileError = accumulatedLogs.includes('COMPILE ERR') || 
                                       accumulatedLogs.includes('LINK ERR') ||
                                       accumulatedLogs.includes('PCH ERR') ||
                                       accumulatedLogs.includes(': error:');

                if (isPortError && !hasCompileError) {
                    return showPortNotFoundError(handleUpload);
                }

                Swal.fire({
                    title: "",
                    html: `
                        <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; margin-top:40px; text-align:left; padding:0 5px;">
                            <div style="width:60px; height:60px; background:rgba(239, 68, 68, 0.1); border-radius:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:visible;">
                                <i class="fa-solid fa-bug" style="color:var(--danger-color); font-size:28px; filter:drop-shadow(0 5px 15px rgba(239, 68, 68, 0.3));"></i>
                            </div>
                            <div>
                                <div style="font-size:20px; font-weight:800; color:var(--text-main); margin-bottom:2px;">ตรวจพบข้อผิดพลาดในการคอมไพล์</div>
                                <div style="font-size:13px; color:var(--text-muted);">ระบบวิเคราะห์พบจุดผิดพลาดในโค้ดของคุณ กรุณาตรวจสอบ Log ด้านล่าง</div>
                            </div>
                        </div>
                        <div style="position:relative;">
                            <button class="btn primary" style="position:absolute; top:12px; right:15px; z-index:10; padding:6px 14px; font-size:11px; border-radius:8px; opacity:0.9; height:auto; gap:6px;" onclick="copyToClipboard(window.lastUploadLogs)">
                                <i class="fa-solid fa-copy"></i> คัดลอก Log
                            </button>
                            <button class="btn" style="position:absolute; top:12px; right:145px; z-index:10; padding:6px 14px; font-size:11px; border-radius:8px; height:auto; gap:6px; background:#4f46e5; color:white; border:none; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);" onclick="analyzeErrorWithAI(window.lastUploadLogs)">
                                <i class="fa-solid fa-robot"></i> วิเคราะห์ด้วย AI
                            </button>
                            <div id="pioLog" style="text-align:left; font-family:var(--font-code); font-size:12px; height:50vh; max-height:450px; overflow-y:auto; background:var(--code-bg); color:var(--text-main); padding:25px; border-radius:15px; border:1px solid var(--border-light); line-height:1.7; box-shadow:inset 0 4px 20px rgba(0,0,0,0.08); white-space:pre-wrap; word-break:break-word;">
                                ${formatPioLog(accumulatedLogs).replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    `,
                    width: '1000px',
                    padding: '2.5rem',
                    background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--danger-color)',
                    confirmButtonText: 'กลับไปแก้ไขโค้ด',
                    showCloseButton: true
                });

                // --- SMART AUTO-JUMP TO ERROR (Block Editor Mode) ---
                const errorRegex = /([^:\n]+):(\d+):(\d+): error: (.+)/i;
                const match = accumulatedLogs.match(errorRegex);
                if (match) {
                    const errorLineNum = parseInt(match[2]);
                    if (window.editor) {
                        if (window.monaco) {
                            monaco.editor.setModelMarkers(window.editor.getModel(), "compiler", [{
                                startLineNumber: errorLineNum,
                                startColumn: parseInt(match[3]),
                                endLineNumber: errorLineNum,
                                endColumn: parseInt(match[3]) + 5,
                                message: match[4].trim(),
                                severity: monaco.MarkerSeverity.Error
                            }]);
                            window.editor.revealLineInCenter(errorLineNum);
                            window.editor.setPosition({lineNumber: errorLineNum, column: 1});
                        } else if (window.editor.getSession) {
                            window.editor.getSession().setAnnotations([{ row: errorLineNum - 1, column: parseInt(match[3]) - 1, text: match[4].trim(), type: "error" }]);
                            window.editor.gotoLine(errorLineNum, 0, true);
                        }
                    }
                }
            });
            pioSwal.then((res) => { if (res.isDismissed) eventSource.close(); });
        }
    });
}

// --- Dynamic Code Generation Logic ---
function extractFunctions(code) {
    const functions = new Map();
    const funcStartRegex = /(?:void|int|float|double|bool|String|auto)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/g;
    let match;
    while ((match = funcStartRegex.exec(code)) !== null) {
        const startIdx = match.index;
        const sigMatch = match[0].match(/([a-zA-Z0-9_]+)\s*\([^)]*\)/);
        const sigKey = sigMatch ? sigMatch[0].replace(/\s+/g, '') : match[1];

        const braceStartIdx = code.indexOf('{', startIdx);
        if (braceStartIdx === -1) continue;
        let braceCount = 1;
        let currentIdx = braceStartIdx + 1;
        let inString = false;
        let inChar = false;
        let inLineComment = false;
        let inBlockComment = false;
        while (braceCount > 0 && currentIdx < code.length) {
            const char = code[currentIdx];
            const nextChar = code[currentIdx + 1];
            const prevChar = code[currentIdx - 1];

            if (inLineComment) {
                if (char === '\n') inLineComment = false;
            } else if (inBlockComment) {
                if (char === '*' && nextChar === '/') {
                    inBlockComment = false;
                    currentIdx++;
                }
            } else if (inString) {
                if (char === '"' && prevChar !== '\\') inString = false;
            } else if (inChar) {
                if (char === "'" && prevChar !== '\\') inChar = false;
            } else {
                if (char === '/' && nextChar === '/') {
                    inLineComment = true;
                    currentIdx++;
                } else if (char === '/' && nextChar === '*') {
                    inBlockComment = true;
                    currentIdx++;
                } else if (char === '"') {
                    inString = true;
                } else if (char === "'") {
                    inChar = true;
                } else if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                }
            }
            currentIdx++;
        }
        if (braceCount === 0) {
            functions.set(sigKey, code.substring(startIdx, currentIdx));
            funcStartRegex.lastIndex = currentIdx; // Skip scanning inside this function's body
        }
    }
    return Array.from(functions.values());
}

function generateAndPreviewCode() {
    if (window.isManualEditing) return;
    let rawCode = window.codeGenerator.workspaceToCode(window.workspace);
    let varMatch = rawCode.match(/var\s+[^;]+;/g);
    let setupMatch = rawCode.match(/\/\/---SETUP_START---\n([\s\S]*?)\/\/---SETUP_END---\n/);
    let loopMatch = rawCode.match(/\/\/---LOOP_START---\n([\s\S]*?)\/\/---LOOP_END---\n/);

    let setupCodeBase = setupMatch ? setupMatch[1] : "";
    let servo1Val = "20", servo2Val = "45", calVal = "1";
    let restSetupLines = [];

    // 🧩 Collect Header and Setup code from USED custom blocks
    let customHeaders = new Set();
    let customSetups = new Set();
    let usedCustomBlockIds = new Set();

    const allBlocks = window.workspace.getAllBlocks(false);
    allBlocks.forEach(block => {
        if (block.type.startsWith('custom_')) {
            // 🛡️ Only include if connected to a main root (Setup or Loop)
            let root = block.getRootBlock();
            if (root && (root.type === 'arduino_setup' || root.type === 'arduino_loop')) {
                let id = block.type.replace('custom_', '');
                usedCustomBlockIds.add(id);
                let cb = (window.customBlocksData || []).find(b => b.id === id);
                if (cb) {
                    if (cb.headerCode) customHeaders.add(cb.headerCode);
                    if (cb.setupCode) customSetups.add(cb.setupCode);
                }
            }
        }
    });

    // 🧩 Collect ALL 'full' mode custom blocks code
    let rawCustomCode = (window.customBlocksData || [])
        .filter(cb => cb.mode === 'full')
        .map(cb => cb.code)
        .join('\n\n');

    // 🧩 Extract and deduplicate ALL functions (from Blockly AND Custom Studio)
    // Using extractFunctions ensures robust parsing and deduplication by actual C++ function signature
    const allFunctions = extractFunctions(rawCode + '\n\n' + rawCustomCode);
    
    // Clear User.ino to prevent old ghost files from causing compilation redefinition errors
    window.generatedUserCode = "// Custom functions are now merged into main_B.ino to be visible in the editor.";

    setupCodeBase.split('\n').forEach(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('degree_servo1 =')) {
            servo1Val = trimmed.split('=')[1].replace(';', '').trim();
        } else if (trimmed.startsWith('degree_servo2 =')) {
            servo2Val = trimmed.split('=')[1].replace(';', '').trim();
        } else if (trimmed.startsWith('Calibrate_EEPROM =')) {
            calVal = trimmed.split('=')[1].replace(';', '').trim();
        } else if (trimmed !== "") {
            restSetupLines.push(line);
        }
    });

    let configCode = `int degree_servo1 = ${servo1Val};\nint degree_servo2 = ${servo2Val};\nint Calibrate_EEPROM = ${calVal};`;
    let restCode = restSetupLines.join('\n');
    let injectedSetups = Array.from(customSetups).join('\n  ');

    const fullCodeTemplate = `#include <Arduino.h>
#include <puppybot6.h>
#include <EEPROM.h>

// --- Custom Headers ---
${Array.from(customHeaders).join('\n')}

int selection_Encoder = 1;

// Variables
${configCode}
${varMatch ? varMatch.join('\n').replace(/var/g, 'int') : ""}

#define SENSOR_COUNT 7
#define EEPROM_SIZE 512
#define EEPROM_ADDR_BASE 0

int L_1 = 700; int R_1 = 700;
int L_0 = 200; int R_0 = 400;

volatile bool req_reset = false;      
volatile bool bt_start_flag = false;
unsigned long run_start_time = 0;

// Custom Functions
// (Note: Custom functions are now correctly deduplicated and placed here)
${allFunctions.length > 0 ? allFunctions.join('\n\n') + '\n' : ""}
void setup() {
  Serial.begin(115200);
  delay(2000);
  puppybot6_setup();
  setupBT();
  EEPROM.begin(EEPROM_SIZE);
  
  servoRun(1, degree_servo1);
  servoRun(2, degree_servo2);
  delay(2000);

  setSensorPins((const int[]){0, 1, 2, 3, 4, 5, 6}, 7);

  loadCalibrationFromEEPROM();
  printCalibrationFromEEPROM();
  delay(1000);
  init_encoder(1);
  
  // --- Injected Setups ---
  ${injectedSetups}

  ${restCode}

  // --- Auto Stop Timer & Display ---
  show_run_time();
}

void loop() {
  ${loopMatch ? loopMatch[1] : ""}
}

void setup1() {
  delay(1000);
  initIMU();
  updateIMU_fine_offset_Yaw(200);
  offset_yaw_loop1 = getOffsetYaw();
  buzzer(500, 100); buzzer(2000, 100);
}

void loop1() {
  if (req_reset) { rp2040.reboot(); }
  yaw_loop1 = getYaw();
  Con_yaw_loop1 = getContinuousYaw();
  if (status_resetYaw == 1) { status_resetYaw = 0; resetContinuousYaw(); }
}
`;
    const finalCode = beautifyCppCode(fullCodeTemplate);
    window.originalBlocklyCode = finalCode + "\n\n// ======== User.ino ========\n" + window.generatedUserCode;
    
    if (!window.isManualEditing && window.editor) {
        window.generatedCppCode = finalCode;
        window.editor.setValue(finalCode);
    }

    const hasCustomBlocks = window.customBlocksData && window.customBlocksData.length > 0;
    const btnView = document.getElementById('btnViewCustomCode');
    if (btnView) btnView.style.display = hasCustomBlocks ? 'inline-block' : 'none';

    if (typeof window.updateLayout === 'function') window.updateLayout();
    if (typeof window.triggerAutoSave === 'function') window.triggerAutoSave();
}


async function viewCustomCode() {
    await loadMonacoAsync();
    Swal.fire({
        title: '<i class="fa-solid fa-puzzle-piece"></i> Custom Blocks Source Code',
        html: '<div id="customCodeModalEditor" style="height: 400px; text-align: left; border-radius: 8px; border: 1px solid var(--border-light); overflow: hidden;"></div>',
        width: '700px',
        showConfirmButton: true,
        confirmButtonText: 'ปิด',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        didOpen: () => {
            const editorEl = document.getElementById('customCodeModalEditor');
            const editor = monaco.editor.create(editorEl, {
                value: window.generatedUserCode || "// No custom blocks used.",
                language: "cpp",
                theme: window.currentThemeMode === 'light' ? 'vs' : 'vs-dark',
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true
            });
        }
    });
}

function updateManualCode() {
    if (!window.isManualEditing) return;
    window.generatedCppCode = window.editor.getValue();
    window.triggerAutoSave();
}

// --- Source Code Manager Logic ---
window.srcFilesList = [];
window.srcAceEditor = null; // Now represents Monaco Editor
window.srcSessions = {};    // Now stores Monaco Models

// Force Ace to use its own path and not hijack Monaco's AMD loader
if (window.ace) {
    ace.config.set('basePath', 'libs/ace');
    ace.config.set('modePath', 'libs/ace');
    ace.config.set('themePath', 'libs/ace');
    ace.config.set('workerPath', 'libs/ace');
}

function loadMonacoAsync() {
    return new Promise((resolve) => {
        if (window.monaco) return resolve();
        if (window._monacoLoading) {
            const check = setInterval(() => {
                if (window.monaco) { clearInterval(check); resolve(); }
            }, 100);
            return;
        }
        window._monacoLoading = true;

        if (typeof window.require !== 'undefined' && window.require.config) {
            // Monaco loader already exists
            window.require(['vs/editor/editor.main'], () => resolve());
            return;
        }

        const script = document.createElement('script');
        script.src = 'libs/monaco/vs/loader.js';
        script.onload = () => {
            window.require.config({ paths: { 'vs': 'libs/monaco/vs' }});
            window.require(['vs/editor/editor.main'], () => resolve());
        };
        document.head.appendChild(script);
    });
}

async function openSrcManager() {
    await loadMonacoAsync();
    
    // 🚀 Activate Source Mode (Comment out main_B.ino)
    try { await API._fetch('/activate_src_mode', { method: 'POST' }); } catch (err) { }

    let res = await API._fetch('/list_src_files');
    let data = await res.json();
    if (!data.success) return window.showStatusNotify('แจ้งเตือน', 'ไม่สามารถดึงข้อมูลไฟล์ได้', 'error');

    window.srcFilesList = data.files.filter(f => !f.startsWith('.') && !f.startsWith('_') && f !== 'build' && f !== 'build_cache');
    if (window.srcFilesList.length === 0) return window.showStatusNotify('แจ้งเตือน', 'ไม่มีไฟล์ที่สามารถแก้ไขได้', 'warning');

    // --- APPLY SAVED ORDER ---
    const savedOrder = JSON.parse(localStorage.getItem('srcTabOrder') || '[]');
    if (savedOrder.length > 0) {
        const ordered = [];
        savedOrder.forEach(name => { if (window.srcFilesList.includes(name)) ordered.push(name); });
        window.srcFilesList.forEach(name => { if (!ordered.includes(name)) ordered.push(name); });
        window.srcFilesList = ordered;
    }

    Object.keys(window.srcSessions).forEach(key => { if (!window.srcFilesList.includes(key)) delete window.srcSessions[key]; });

    loadSrcFile(window.srcFilesList[0]);
}

async function loadSrcFile(filename) {
    window.currentSrcFile = filename;

    let tabsHtml = window.srcFilesList.map((f, idx) => `
        <div class="src-tab ${f === filename ? 'active' : ''}" 
             draggable="true"
             ondragstart="handleTabDragStart(event, ${idx})"
             ondragover="event.preventDefault()"
             ondrop="handleTabDrop(event, ${idx})"
             onclick="loadSrcFile('${f}')"
             oncontextmenu="handleSrcTabContextMenu(event, '${f}')"
             style="display:flex; align-items:center; border-right:1px solid var(--border-light); 
                    background: ${f === filename ? 'var(--bg-hover)' : 'transparent'};
                    cursor: pointer; position: relative; overflow: hidden; height: 100%;">
            
            <div class="tab-main-btn" 
                    style="border:none; background:transparent; 
                    color: ${f === filename ? 'var(--primary-color)' : 'var(--text-muted)'};
                    font-weight: ${f === filename ? '600' : '400'};
                    font-size:12px; padding:10px 20px; transition: var(--transition-all);
                    display: flex; align-items: center; gap: 8px; min-width: 130px; justify-content: center;">
                <i class="fa-solid fa-file-code" style="font-size: 14px; opacity: ${f === filename ? '1' : '0.6'};"></i>
                ${f}
                <span class="unsaved-dot-${f.replace(/\./g, '_')}" style="width: 8px; height: 8px; background: var(--warning-color); border-radius: 50%; display: none; margin-left: 5px; box-shadow: 0 0 8px var(--warning-color);"></span>
            </div>
            ${f === filename ? '<div style="position:absolute; bottom:0; left:0; right:0; height:2px; background:var(--primary-color);"></div>' : ''}
        </div>
    `).join('');

    if (!window.srcSessions[filename]) {
        let res = await API._fetch('/read_src_file/' + encodeURIComponent(filename));
        let data = await res.json();
        let content = data.content || "";

        const model = monaco.editor.createModel(content, "cpp");
        window.srcSessions[filename] = model;
        model.originalContent = content;
        
        let autoSaveTimer = null;
        model.onDidChangeContent(() => {
            const dot = document.querySelector(`.unsaved-dot-${filename.replace(/\./g, '_')}`);
            if (dot) dot.style.display = (model.getValue() !== (model.originalContent || "")) ? 'inline-block' : 'none';
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => saveSrcFile(true), 2000);
        });
    }

    if (window.srcManagerSwal && Swal.isVisible() && document.getElementById('srcEditorAce')) {
        window.srcAceEditor.setModel(window.srcSessions[filename]);
        setTimeout(() => { if(window.srcAceEditor) window.srcAceEditor.layout(); }, 10);
        const tabsContainer = document.querySelector('.src-tabs-container');
        if (tabsContainer) tabsContainer.innerHTML = tabsHtml;
        if (window.EditorFind && window.srcAceEditor) EditorFind.attach(window.srcAceEditor);
        return;
    }

    window.srcManagerSwal = Swal.fire({
        title: `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; padding: 0 10px; white-space:nowrap;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <i class="fa-solid fa-file-code" style="color:var(--primary-color); font-size:20px;"></i>
                    <span style="font-size:18px; font-weight:800; color:var(--text-main);">Source Code Editor</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="btn" onclick="EditorFind.show(false)" style="padding: 8px; font-size:14px; background:var(--bg-panel); border:1px solid var(--border-light); color:var(--text-main); border-radius:6px;" title="ค้นหา (Ctrl+F)">
                        <i class="fa-solid fa-magnifying-glass"></i> ค้นหา
                    </button>
                    <button class="btn primary" onclick="saveAllSrcFiles()" style="padding: 8px 18px; font-size:14px; background:var(--bg-panel); border:1px solid var(--border-light); color:var(--text-main); border-radius:6px;">
                        <i class="fa-solid fa-floppy-disk"></i> บันทึกทั้งหมด
                    </button>
                    <button class="btn-flash-large" onclick="manualUploadFromSrc()" style="padding: 8px 24px; font-size:14px; box-shadow: 0 4px 15px var(--primary-shadow);">
                        <i class="fa-solid fa-bolt"></i> อัปโหลด
                    </button>
                </div>
            </div>
        `,
        html: `
        <div class="src-html-root" style="display:flex; flex-direction:column; height: calc(100vh - 120px); text-align:left; position:relative;">
            <div style="display:flex; align-items:center; background:var(--bg-panel); border-bottom:1px solid var(--border-light); flex-shrink:0;">
                <div class="src-tabs-container" style="display:flex; overflow-x:auto; flex:1; height: 42px;">${tabsHtml}</div>
                <button class="btn" style="width:42px; height:42px; border:none; border-left:1px solid var(--border-light); border-radius:0; background:transparent; color:var(--success-color);" onclick="createNewSrcFile()" title="เพิ่มไฟล์ใหม่ (.ino)">
                    <i class="fa-solid fa-plus"></i>
                </button>
                <div style="display:flex; gap:4px; padding:0 12px; border-left:1px solid var(--border-light); align-items:center; height:42px; background:var(--bg-panel);">
                    <button class="btn" style="padding:4px 8px; font-size:11px; border-radius:4px;" onclick="srcUndo()" title="ย้อนกลับ (Undo)">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                    <button class="btn" style="padding:4px 8px; font-size:11px; border-radius:4px;" onclick="srcRedo()" title="ทำซ้ำ (Redo)">
                        <i class="fa-solid fa-rotate-right"></i>
                    </button>
                    <div class="divider" style="height:14px; margin:0 4px; opacity:0.5;"></div>
                    <button class="btn primary" style="padding:4px 12px; font-size:11px; font-weight:700; border-radius:4px;" onclick="saveAllSrcFiles()">
                        <i class="fa-solid fa-floppy-disk"></i> บันทึก
                    </button>
                </div>
            </div>
            <div id="srcEditorAce" style="flex:1; width:100%;"></div>
            
            <!-- Context Menu for Tabs -->
            <div id="srcTabContextMenu" class="custom-context-menu">
                <div class="context-menu-item" onclick="renameSrcFile(window.lastContextFile)">
                    <i class="fa-solid fa-pen-to-square"></i> เปลี่ยนชื่อไฟล์
                </div>
                <div class="context-menu-item danger" onclick="deleteSrcFile(window.lastContextFile)">
                    <i class="fa-solid fa-trash"></i> ลบไฟล์
                </div>
            </div>

            <!-- Context Menu for Editor -->
            <div id="srcEditorContextMenu" class="custom-context-menu">
                <div class="context-menu-item" onclick="formatSourceDoc()"><i class="fa-solid fa-wand-magic-sparkles"></i> จัดรูปแบบโค้ด (Ctrl+T)</div>
                <div style="height:1px; background:var(--border-light); margin:4px 0; opacity:0.5;"></div>
                <div class="context-menu-item" onclick="srcUndo()"><i class="fa-solid fa-rotate-left"></i> ย้อนกลับ (Undo)</div>
                <div class="context-menu-item" onclick="srcRedo()"><i class="fa-solid fa-rotate-right"></i> ทำซ้ำ (Redo)</div>
                <div style="height:1px; background:var(--border-light); margin:4px 0; opacity:0.5;"></div>
                <div class="context-menu-item" onclick="srcEditorAction('cut')"><i class="fa-solid fa-scissors"></i> ตัด (Cut)</div>
                <div class="context-menu-item" onclick="srcEditorAction('copy')"><i class="fa-solid fa-copy"></i> คัดลอก (Copy)</div>
                <div class="context-menu-item" onclick="srcEditorAction('paste')"><i class="fa-solid fa-paste"></i> วาง (Paste)</div>
            </div>
        </div>`,
        width: '100vw',
        heightAuto: false,
        padding: '0',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        color: 'var(--text-main)',
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
            // 🛡️ Added small delay to ensure DOM is ready before Monaco mounts
            setTimeout(() => {
                const editorEl = document.getElementById("srcEditorAce");
                if (!editorEl) return console.error("Editor container missing");
                
                window.srcAceEditor = monaco.editor.create(editorEl, {
                    model: window.srcSessions[filename],
                    theme: window.currentThemeMode === 'light' ? 'vs' : 'vs-dark',
                fontSize: 16,
                fontFamily: "Consolas, 'Courier New', monospace",
                letterSpacing: 0,
                wordWrap: "off",
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderWhitespace: "none",
                unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false },
                disableLayerHinting: true,
                disableMonospaceOptimizations: true, 
                lineHeight: 24,
                fontLigatures: false,
                renderControlCharacters: false,
                fixedOverflowWidgets: true,
                contextmenu: false // 🛡️ Disable Monaco's native menu to use our custom one
            });

            // Re-measure aggressively
            setTimeout(() => { if(window.srcAceEditor) window.srcAceEditor.layout(); }, 300);
            window.srcAceEditor.onDidFocusEditorText(() => {
                setTimeout(() => { if(window.srcAceEditor) window.srcAceEditor.layout(); }, 50);
            });

            const handleSrcShortcuts = (e) => {
                if (e.ctrlKey && e.key.toLowerCase() === 't') {
                    e.preventDefault();
                    e.stopPropagation();
                    formatSourceDoc();
                }
            };
            window.addEventListener('keydown', handleSrcShortcuts, true);
            window.currentSrcShortcuts = handleSrcShortcuts;

            window.srcAceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveSrcFile());
            window.srcAceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT, () => formatSourceDoc());

            // 🔍 Attach custom Find system
            if (window.EditorFind) EditorFind.attach(window.srcAceEditor);

            // --- Custom Context Menu Logic for Monaco ---
            const editorMenu = document.getElementById('srcEditorContextMenu');
            
            window.srcAceEditor.onContextMenu((e) => {
                e.event.preventDefault();
                e.event.stopPropagation();

                const event = e.event;
                const x = event.browserEvent.clientX;
                let y = event.browserEvent.clientY;
                
                if (editorMenu) {
                    editorMenu.style.display = 'block';
                    editorMenu.classList.add('active');
                    
                    // Smart Positioning: Check if menu goes off screen
                    const menuHeight = editorMenu.offsetHeight || 180;
                    const menuWidth = editorMenu.offsetWidth || 160;
                    
                    if (y + menuHeight > window.innerHeight) {
                        y = y - menuHeight;
                    }
                    if (x + menuWidth > window.innerWidth) {
                        x = x - menuWidth;
                    }

                    editorMenu.style.left = `${x}px`;
                    editorMenu.style.top = `${y}px`;
                }
            });

            document.addEventListener('mousedown', (e) => {
                if (editorMenu && !editorMenu.contains(e.target)) {
                    editorMenu.style.display = 'none';
                    editorMenu.classList.remove('active');
                }
            }, true);
            }, 50);
        },
        preConfirm: () => {
            let hasUnsaved = false;
            for (const filename in window.srcSessions) {
                const session = window.srcSessions[filename];
                if (session.getValue() !== (session.originalContent || "")) {
                    hasUnsaved = true; break;
                }
            }
            if (hasUnsaved) {
                return Swal.fire({
                    title: 'ยังไม่ได้บันทึก!',
                    text: 'คุณมีบางไฟล์ที่แก้ไขแล้วยังไม่ได้บันทึก ต้องการปิดโดยไม่บันทึกใช่หรือไม่?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'ปิดเลย (ทิ้งข้อมูล)',
                    cancelButtonText: 'กลับไปบันทึก'
                }).then(res => res.isConfirmed);
            }
            return true;
        },
        didClose: () => {
            window.srcManagerSwal = null;
            if (window.currentSrcShortcuts) {
                window.removeEventListener('keydown', window.currentSrcShortcuts);
                window.currentSrcShortcuts = null;
            }
        }
    });
}

function srcUndo() { if (window.srcAceEditor) window.srcAceEditor.trigger('keyboard', 'undo', {}); }
function srcRedo() { if (window.srcAceEditor) window.srcAceEditor.trigger('keyboard', 'redo', {}); }

async function saveSrcFile(silent = false) {
    if (!window.currentSrcFile || !window.srcSessions[window.currentSrcFile]) return;
    const model = window.srcSessions[window.currentSrcFile];
    const content = model.getValue();

    let res = await fetch('/save_src_file', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name: window.currentSrcFile, content: content }) 
    });
    if (res.ok) {
        model.originalContent = content;
        const dot = document.querySelector(`.unsaved-dot-${window.currentSrcFile.replace(/\./g, '_')}`);
        if (dot) dot.style.display = 'none';
        if (!silent) window.showStatusNotify('บันทึกสำเร็จ!', `ไฟล์ ${window.currentSrcFile} ถูกบันทึกแล้ว`, 'success');
    }
}

function beautifyCppCode(code) {
    const lines = code.split('\n');
    let formattedCode = "";
    let indentLevel = 0;
    const indentSize = 2; // 2 spaces

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.length === 0) {
            formattedCode += "\n";
            continue;
        }

        // --- Handle indentation logic more robustly ---
        // Count opening and closing braces in the current line (excluding strings/comments would be better but this is simple)
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;

        // If line starts with closing brace, decrease indent before printing
        if (line.startsWith('}') || line.startsWith(']')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        // Add current indentation
        formattedCode += " ".repeat(indentLevel * indentSize) + line + "\n";

        // Adjust indent for the NEXT line
        if (!line.startsWith('}') && !line.startsWith(']')) {
            indentLevel += (openBraces - closeBraces);
        } else {
            // If it started with a closing brace, we already decremented. 
            // Only add remaining open braces if any (rare case like } {)
            indentLevel += Math.max(0, openBraces - (closeBraces - 1));
        }
        
        if (indentLevel < 0) indentLevel = 0;
    }
    return formattedCode.trim();
}

function formatSourceDoc() {
    const activeEditor = window.srcAceEditor;
    if (!activeEditor) return;
    
    try {
        const action = activeEditor.getAction('editor.action.formatDocument');
        if (action) {
            action.run();
        } else {
            // Fallback if no provider registered
            const model = activeEditor.getModel();
            model.setValue(beautifyCppCode(model.getValue()));
        }
    } catch(e) { console.error("Formatting error", e); }
}

async function srcEditorAction(action) {
    if (!window.srcAceEditor) return;
    window.srcAceEditor.focus();
    switch(action) {
        case 'cut': document.execCommand('cut'); break;
        case 'copy': document.execCommand('copy'); break;
        case 'paste': document.execCommand('paste'); break;
    }
}

function srcUndo() { if (window.srcAceEditor) window.srcAceEditor.trigger('keyboard', 'undo', {}); }
function srcRedo() { if (window.srcAceEditor) window.srcAceEditor.trigger('keyboard', 'redo', {}); }

// Manual Edit Helpers
window.enableManualEdit = () => {
    window.isManualEditing = true;
    window.editor.updateOptions({ readOnly: false });
    document.getElementById('codeBox').style.boxShadow = "inset 0 0 0 1px var(--primary-color)";
    document.getElementById('btnEditCode').style.display = "none";
    document.getElementById('btnResetCode').style.display = "inline-flex";
    document.getElementById('btnFormatCode').style.display = "inline-flex";
    
    // Highlight the main flash button to show it's now the primary action
    const btnFlash = document.getElementById('btnFlash');
    if (btnFlash) {
        btnFlash.classList.add('manual-mode');
        btnFlash.innerHTML = '<i class="fa-solid fa-bolt-lightning"></i> Upload (Manual)';
    }
};

window.resetManualEdit = () => {
    window.isManualEditing = false;
    window.editor.updateOptions({ readOnly: true });
    document.getElementById('codeBox').style.boxShadow = "none";
    document.getElementById('btnEditCode').style.display = "inline-flex";
    document.getElementById('btnResetCode').style.display = "none";
    document.getElementById('btnFormatCode').style.display = "none";

    // Restore main flash button
    const btnFlash = document.getElementById('btnFlash');
    if (btnFlash) {
        btnFlash.classList.remove('manual-mode');
        btnFlash.innerHTML = '<i class="fa-solid fa-bolt"></i> Upload';
    }

    // Generate fresh code from the current state of blocks
    generateAndPreviewCode();
};

// Global Exports
window.toggleSerial = toggleSerial;
window.sendSerial = sendSerial;
window.clearSerial = clearSerial;
window.toggleAutoScroll = toggleAutoScroll;
// --- AI Error Analysis Logic ---
async function analyzeErrorWithAI(logs) {
    // 🚀 Store logs globally for "Try Again" functionality
    window.lastAiLogs = logs;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        return Swal.fire({
            title: 'ไม่พบ API Key',
            text: 'กรุณากด Ctrl+Shift+A เพื่อตั้งค่า Gemini API Key ก่อนใช้งานฟีเจอร์นี้',
            icon: 'warning',
            confirmButtonText: 'ไปตั้งค่า',
            showCancelButton: true
        }).then(res => {
            if (res.isConfirmed) openGeminiConfig();
        });
    }

    // 🚀 Create or Reset Floating AI Widget
    let aiWidget = document.getElementById('ai-floating-widget');
    const initialStepsHTML = `
        <div id="ai-widget-content" class="ai-widget-body">
            <div class="ai-step active" id="ai-w-step-1"><i class="fa-solid fa-circle-right"></i> กำลังเตรียมข้อมูล...</div>
            <div class="ai-step" id="ai-w-step-2"><i class="fa-regular fa-circle"></i> กำลังวิเคราะห์...</div>
            <div class="ai-step" id="ai-w-step-3"><i class="fa-regular fa-circle"></i> สรุปผลการแก้ไข...</div>
            <div class="ai-widget-loader"><i class="fa-solid fa-brain fa-bounce"></i></div>
        </div>
    `;

    if (!aiWidget) {
        aiWidget = document.createElement('div');
        aiWidget.id = 'ai-floating-widget';
        aiWidget.className = 'ai-floating-card';
        aiWidget.innerHTML = `
            <div class="ai-widget-header">
                <div style="display:flex; align-items:center; gap:8px; pointer-events:none;">
                    <i class="fa-solid fa-robot"></i> <span>AI Debugger</span>
                </div>
                <div class="ai-widget-actions">
                    <button class="ai-btn-min" onclick="minimizeAIWidget()" title="ย่อหน้าต่าง"><i class="fa-solid fa-minus"></i></button>
                    <button class="ai-btn-close" onclick="this.closest('.ai-floating-card').remove()" title="ปิด"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            ${initialStepsHTML}
            <div class="ai-widget-resizer"></div>
        `;
        document.body.appendChild(aiWidget);
        makeDraggable(aiWidget);
        makeResizable(aiWidget);
    } else {
        // 🔄 Reset existing widget to start state
        aiWidget.style.display = 'flex';
        aiWidget.innerHTML = `
            <div class="ai-widget-header">
                <div style="display:flex; align-items:center; gap:8px; pointer-events:none;">
                    <i class="fa-solid fa-robot"></i> <span>AI Debugger</span>
                </div>
                <div class="ai-widget-actions">
                    <button class="ai-btn-min" onclick="minimizeAIWidget()" title="ย่อหน้าต่าง"><i class="fa-solid fa-minus"></i></button>
                    <button class="ai-btn-close" onclick="this.closest('.ai-floating-card').remove()" title="ปิด"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            ${initialStepsHTML}
            <div class="ai-widget-resizer"></div>
        `;
        makeDraggable(aiWidget);
        makeResizable(aiWidget);
        ensureInBounds(aiWidget);
    }

    const updateWStep = (idx, text) => {
        const s1 = document.getElementById('ai-w-step-1');
        const s2 = document.getElementById('ai-w-step-2');
        const s3 = document.getElementById('ai-w-step-3');
        const steps = [s1, s2, s3];
        steps.forEach((s, i) => {
            if (!s) return;
            if (i === idx) {
                s.className = 'ai-step active';
                s.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text || s.innerText.replace(/.*\. /, '')}`;
            } else if (i < idx) {
                s.className = 'ai-step done';
                s.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${s.innerText.replace(/.*\. /, '')}`;
            }
        });
    };

    try {
        updateWStep(0, "กำลังวิเคราะห์ Log...");
        const prompt = `You are an expert Arduino/RP2350 developer. Analyze this compiler error log: \n\n${logs}\n\n
        INSTRUCTIONS:
        1. If you need to see code to fix it, reply ONLY with a JSON array: REQUEST_FILES: [{"file": "filename.ino", "start": 1, "end": 100}, ...]
        2. Request only the necessary files and line ranges to save tokens.
        3. If you have enough info, provide a concise final analysis in THAI:
           - Error Location (File & Line)
           - Why it happened
           - How to fix (with code snippet)`;
        
        const result = await callGeminiAPI(apiKey, prompt);

        if (result.includes('REQUEST_FILES:')) {
            const jsonStr = result.split('REQUEST_FILES:')[1].trim();
            let requestedFiles = [];
            try { requestedFiles = JSON.parse(jsonStr); } catch(e) { requestedFiles = []; }

            updateWStep(1, `กำลังดึงข้อมูล ${requestedFiles.length} ไฟล์...`);
            
            let combinedContext = "";
            for (const req of requestedFiles) {
                try {
                    const fileData = await API.readSrcFile(req.file);
                    const lines = (fileData.content || "").split('\n');
                    const start = Math.max(1, req.start || 1);
                    const end = Math.min(lines.length, req.end || lines.length);
                    
                    const slicedContent = lines.slice(start - 1, end).map((l, i) => `${start + i}: ${l}`).join('\n');
                    combinedContext += `--- File: ${req.file} (Lines ${start}-${end}) ---\n${slicedContent}\n\n`;
                } catch(e) { combinedContext += `Error reading ${req.file}\n`; }
            }

            const secondPrompt = `Here is the requested code context from multiple files:\n\n${combinedContext}\n\n
            INSTRUCTIONS:
            1. Analyze ALL provided files.
            2. Report EVERY error you find in ANY of these files.
            3. Provide the final analysis in THAI. Be concise.
            4. Format: [File Name] Line X: [Problem] -> [Fix]`;
            
            updateWStep(2, "AI กำลังวิเคราะห์ทุกไฟล์...");
            const finalResult = await callGeminiAPI(apiKey, secondPrompt);
            showAIWidgetResult(finalResult);
        } else {
            showAIWidgetResult(result);
        }
    } catch (err) {
        const content = document.getElementById('ai-widget-content');
        if (content) {
            let errorMsg = err.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
            let thaiError = "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI";
            let errorIcon = "fa-triangle-exclamation";

            if (errorMsg.includes("quota") || errorMsg.includes("429")) {
                thaiError = "ขออภัย! โควต้าฟรีของคุณเต็มชั่วคราว (รอประมาณ 10-15 วินาทีแล้วกดใหม่นะครับ)";
                errorIcon = "fa-clock";
            } else if (errorMsg.includes("503") || errorMsg.includes("heavy load")) {
                thaiError = "ตอนนี้ AI กำลังทำงานหนักมาก (Server Busy) โปรดรออึดใจเดียวแล้วลองใหม่ครับ";
                errorIcon = "fa-server";
            } else if (errorMsg.includes("API key")) {
                thaiError = "รหัส API Key ของคุณไม่ถูกต้อง หรือหมดอายุ โปรดตรวจสอบที่ปุ่ม Ctrl+Shift+A";
                errorIcon = "fa-key";
            } else if (errorMsg.includes("Failed to fetch")) {
                thaiError = "ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ โปรดตรวจสอบการเชื่อมต่อของคุณ";
                errorIcon = "fa-wifi";
            }

            content.innerHTML = `
                <div class="ai-error-container">
                    <i class="fa-solid ${errorIcon} ai-error-icon"></i>
                    <div class="ai-error-title">พบปัญหาในการทำงาน</div>
                    <div class="ai-error-text">${thaiError}</div>
                    <button class="btn primary small" style="margin-top:5px; width:100%;" onclick="analyzeErrorWithAI(window.lastAiLogs)">ลองใหม่อีกครั้ง</button>
                </div>
            `;
        }
    }
}

function showAIWidgetResult(text) {
    const content = document.getElementById('ai-widget-content');
    if (content) {
        content.innerHTML = `
            <div class="ai-result-header"><i class="fa-solid fa-lightbulb"></i> คำแนะนำจาก AI</div>
            <div class="ai-result-text">${formatMarkdown(text)}</div>
            <div style="margin-top:12px; text-align:right;">
                <button class="btn primary small" style="width:100%;" onclick="this.closest('.ai-floating-card').remove()">เข้าใจแล้ว</button>
            </div>
        `;
        content.scrollTop = 0; // Scroll to top to start reading
    }
    // 🛡️ Ensure it doesn't sink after content grows
    setTimeout(() => {
        const el = document.getElementById('ai-floating-widget');
        if (el) ensureInBounds(el);
    }, 100);
}

function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = el.querySelector('.ai-widget-header');
    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = el.offsetTop - pos2;
        let newLeft = el.offsetLeft - pos1;

        // 🛡️ Strict Boundary Checks (Keep inside window)
        const margin = 5;
        const maxTop = window.innerHeight - el.offsetHeight - margin;
        const maxLeft = window.innerWidth - el.offsetWidth - margin;

        if (newTop < margin) { newTop = margin; pos4 = e.clientY + (el.offsetTop - newTop); }
        if (newLeft < margin) { newLeft = margin; pos3 = e.clientX + (el.offsetLeft - newLeft); }
        if (newTop > maxTop) { newTop = maxTop; pos4 = e.clientY + (el.offsetTop - newTop); }
        if (newLeft > maxLeft) { newLeft = maxLeft; pos3 = e.clientX + (el.offsetLeft - newLeft); }

        el.style.top = newTop + "px";
        el.style.left = newLeft + "px";
        el.style.bottom = "auto";
        el.style.right = "auto";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function makeResizable(el) {
    const resizer = el.querySelector('.ai-widget-resizer');
    resizer.addEventListener('mousedown', initResize, false);

    function initResize(e) {
        e.preventDefault();
        window.addEventListener('mousemove', Resize, false);
        window.addEventListener('mouseup', stopResize, false);
    }
    function Resize(e) {
        let newWidth = e.clientX - el.offsetLeft;
        let newHeight = e.clientY - el.offsetTop;
        
        // 🛡️ Boundary for Resize
        if (el.offsetLeft + newWidth > window.innerWidth - 10) newWidth = window.innerWidth - el.offsetLeft - 10;
        if (el.offsetTop + newHeight > window.innerHeight - 10) newHeight = window.innerHeight - el.offsetTop - 10;

        if (newWidth > 300) el.style.width = newWidth + 'px';
        if (newHeight > 100) el.style.height = newHeight + 'px';
    }
    function stopResize(e) {
        window.removeEventListener('mousemove', Resize, false);
        window.removeEventListener('mouseup', stopResize, false);
    }
}

function minimizeAIWidget() {
    const el = document.getElementById('ai-floating-widget');
    if (!el) return;
    const body = el.querySelector('.ai-widget-body');
    const resizer = el.querySelector('.ai-widget-resizer');
    const minBtnIcon = el.querySelector('.ai-btn-min i');
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        if (resizer) resizer.style.display = 'block';
        el.style.height = 'auto';
        if (minBtnIcon) minBtnIcon.className = 'fa-solid fa-minus';
    } else {
        body.style.display = 'none';
        if (resizer) resizer.style.display = 'none';
        el.style.height = 'auto';
        if (minBtnIcon) minBtnIcon.className = 'fa-solid fa-plus';
    }
}

function ensureInBounds(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 10;
    
    let newTop = el.offsetTop;
    let newLeft = el.offsetLeft;

    if (rect.top < margin) newTop = margin;
    if (rect.left < margin) newLeft = margin;
    if (rect.bottom > window.innerHeight - margin) newTop = window.innerHeight - el.offsetHeight - margin;
    if (rect.right > window.innerWidth - margin) newLeft = window.innerWidth - el.offsetWidth - margin;

    el.style.top = Math.max(margin, newTop) + "px";
    el.style.left = Math.max(margin, newLeft) + "px";
    el.style.bottom = "auto";
    el.style.right = "auto";
}

// 📏 Auto-snap when browser window resizes
window.addEventListener('resize', () => {
    const el = document.getElementById('ai-floating-widget');
    if (el && el.style.display !== 'none') ensureInBounds(el);
});

async function callGeminiAPI(key, prompt) {
    const models = [
        'gemini-2.5-flash', 
        'gemini-2.0-flash', 
        'gemini-flash-latest', 
        'gemini-pro-latest', 
        'gemini-2.5-pro',
        'gemini-3-flash-preview'
    ];
    let lastError = null;

    for (const model of models) {
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                        return data.candidates[0].content.parts[0].text;
                    }
                }

                const status = response.status;
                if (status === 404) break; // Skip to next model immediately

                if (status === 429 || status === 503) {
                    retries++;
                    if (retries <= maxRetries) {
                        const delay = retries * 2000; // Wait 2s, 4s...
                        const modelNameDisplay = model.split('-')[1] || model;
                        console.warn(`[AI] ${status} Error on ${model}. Retrying in ${delay}ms... (Attempt ${retries})`);
                        const content = document.getElementById('ai-widget-content');
                        if (content) {
                            content.innerHTML += `<div style="font-size:10px; color:var(--warning-color); opacity:0.7;">⚠️ ${status} - กำลังลองใหม่ใน ${delay/1000}วิ...</div>`;
                            content.scrollTop = content.scrollHeight; // Auto scroll
                        }
                        ensureInBounds(document.getElementById('ai-floating-widget'));
                        await new Promise(r => setTimeout(r, delay));
                        continue;
                    }
                }
                
                const errorData = await response.json();
                lastError = errorData.error ? errorData.error.message : 'Unknown API Error';
                break; // Try next model
            } catch (err) {
                lastError = err.message;
                break;
            }
        }
        // Small pause between model swaps to avoid rapid-fire 429s
        await new Promise(r => setTimeout(r, 500));
    }
    
    throw new Error(lastError || 'AI ไม่ว่างหรือติดลิมิต โปรดลองใหม่ในอีก 1 นาที');
}

function showAIAnalysis(text) {
    Swal.fire({
        title: '<i class="fa-solid fa-robot"></i> AI Analysis Report',
        html: `<div style="text-align:left; font-family:var(--font-ui); font-size:14px; line-height:1.6; max-height:60vh; overflow-y:auto; padding:10px; border-radius:10px; background:var(--bg-panel);">${formatMarkdown(text)}</div>`,
        width: '800px',
        confirmButtonText: 'รับทราบ',
        confirmButtonColor: '#4f46e5'
    });
}

function formatMarkdown(text) {
    // Basic Markdown to HTML converter for AI response
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre style="background:var(--code-bg); padding:15px; border-radius:8px; font-family:var(--font-code); font-size:12px; margin:10px 0; overflow-x:auto; border:1px solid var(--border-light); color:var(--text-main);">$1</pre>')
        .replace(/`([^`]+)`/g, '<code style="background:var(--bg-hover); padding:2px 6px; border-radius:4px; font-family:var(--font-code);">$1</code>')
        .replace(/\n/g, '<br>');
}

window.analyzeErrorWithAI = analyzeErrorWithAI;
window.handleUpload = handleUpload;
window.openSrcManager = openSrcManager;
window.loadSrcFile = loadSrcFile;
window.saveSrcFile = saveSrcFile;
window.srcUndo = srcUndo;
window.srcRedo = srcRedo;
window.viewCustomCode = viewCustomCode;
window.generateAndPreviewCode = generateAndPreviewCode;

window.Editor = {
    formatMainCode: () => { 
        if (window.editor && window.editor.getAction) {
            window.editor.getAction('editor.action.formatDocument').run();
        }
    }
};
function handleTabDragStart(e, idx) {
    // 🛡️ SECURITY: Use custom type instead of 'text' to prevent dropping "text index" into the editor
    e.dataTransfer.setData('application/x-tab-index', idx);
    e.dataTransfer.effectAllowed = 'move';

    const ghost = document.createElement('div');
    ghost.style.padding = '4px 10px';
    ghost.style.background = 'var(--primary-color)';
    ghost.style.color = 'white';
    ghost.style.borderRadius = '4px';
    ghost.style.fontSize = '12px';
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.innerText = window.srcFilesList[idx];
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
}

function handleTabDrop(e, targetIdx) {
    e.preventDefault();
    const sourceIdx = parseInt(e.dataTransfer.getData('application/x-tab-index'));
    if (isNaN(sourceIdx) || sourceIdx === targetIdx) return;

    const items = [...window.srcFilesList];
    const [movedItem] = items.splice(sourceIdx, 1);
    items.splice(targetIdx, 0, movedItem);
    window.srcFilesList = items;
    saveSrcOrder(); // PERSIST
    loadSrcFile(window.currentSrcFile);
}

function saveSrcOrder() {
    localStorage.setItem('srcTabOrder', JSON.stringify(window.srcFilesList));
}

function loadSrcOrder() {
    const saved = localStorage.getItem('srcTabOrder');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) window.srcFilesList = parsed;
        } catch(e) { console.error("Error loading src order", e); }
    }
}

// --- NEW: Source File Management Logic ---
window.handleSrcTabContextMenu = (e, filename) => {
    e.preventDefault();
    const forbidden = ['main_B.ino', 'main_T.ino', 'User.ino'];
    if (forbidden.includes(filename)) return;

    window.lastContextFile = filename;
    const menu = document.getElementById('srcTabContextMenu');
    if (!menu) return;

    showSmartMenu(e, menu);
};

// Global Context Menu Positioner with Smart Boundary Detection
function showSmartMenu(e, menu) {
    // 1. Reset and show briefly to measure
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';
    
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    
    let left = e.clientX; // Use clientX/Y for relative viewport positioning
    let top = e.clientY;
    
    // 2. Smart Boundary Check
    const padding = 10;
    
    // If it hits the right edge, move it to the left of the cursor
    if (left + menuWidth + padding > window.innerWidth) {
        left = left - menuWidth;
    }
    
    // If it hits the bottom edge, make the mouse position the "bottom" of the menu
    if (top + menuHeight + padding > window.innerHeight) {
        top = top - menuHeight;
    }
    
    // 3. Apply positions and make visible
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';

    const closeMenu = () => { 
        menu.style.display = 'none'; 
        menu.style.visibility = 'hidden';
        document.removeEventListener('click', closeMenu); 
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

// Update Editor Context Menu to use Smart Positioner
// (In didOpen, we'll call showSmartMenu instead of manual logic)

window.createNewSrcFile = async () => {
    const { value: rawName } = await Swal.fire({
        title: 'สร้างไฟล์ใหม่',
        input: 'text',
        inputLabel: 'ชื่อไฟล์ (ระบบจะเติม .ino ให้เอง)',
        inputPlaceholder: 'MyFunctions',
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) return 'กรุณาใส่ชื่อไฟล์!';
            if (/[^a-zA-Z0-9_]/.test(value)) return 'ชื่อไฟล์ควรประกอบด้วยตัวอักษร ตัวเลข และ _ เท่านั้น!';
        }
    });

    if (rawName) {
        // Force Arduino standard: Strip any extension user might have typed and add .ino
        const sanitizedName = rawName.split('.')[0] + ".ino";

        if (window.srcFilesList.includes(sanitizedName)) {
            return window.showStatusNotify('ผิดพลาด', 'มีไฟล์ชื่อนี้อยู่แล้ว!', 'warning');
        }

        let res = await API._fetch('/create_src_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: sanitizedName })
        });
        if (res.ok) {
            window.srcFilesList.push(sanitizedName);
            saveSrcOrder(); // PERSIST
            loadSrcFile(sanitizedName);
            window.showStatusNotify('สำเร็จ!', `สร้างไฟล์ ${sanitizedName} เรียบร้อยแล้ว`, 'success');
        }
    }
};

window.renameSrcFile = async (oldName) => {
    // Strip .ino for display to user
    const displayName = oldName.replace(/\.ino$/, '');

    const { value: rawNewName } = await Swal.fire({
        title: 'เปลี่ยนชื่อไฟล์',
        input: 'text',
        inputLabel: 'ชื่อใหม่ (ระบบจะจัดการ .ino ให้เอง)',
        inputValue: displayName,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) return 'กรุณาใส่ชื่อไฟล์!';
            if (/[^a-zA-Z0-9_]/.test(value)) return 'ชื่อไฟล์ควรประกอบด้วยตัวอักษร ตัวเลข และ _ เท่านั้น!';
        }
    });

    if (rawNewName && rawNewName !== displayName) {
        // Force Arduino standard: Re-append .ino
        const sanitizedNewName = rawNewName.split('.')[0] + ".ino";

        if (window.srcFilesList.includes(sanitizedNewName) && sanitizedNewName !== oldName) {
            return window.showStatusNotify('ผิดพลาด', 'มีไฟล์ชื่อนี้อยู่แล้ว!', 'warning');
        }

        let res = await API._fetch('/rename_src_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName: sanitizedNewName })
        });
        if (res.ok) {
            const idx = window.srcFilesList.indexOf(oldName);
            if (idx !== -1) window.srcFilesList[idx] = sanitizedNewName;
            saveSrcOrder(); // PERSIST
            if (window.srcSessions[oldName]) {
                window.srcSessions[sanitizedNewName] = window.srcSessions[oldName];
                delete window.srcSessions[oldName];
            }
            loadSrcFile(sanitizedNewName);
            window.showStatusNotify('สำเร็จ!', 'เปลี่ยนชื่อไฟล์เรียบร้อยแล้ว', 'success');
        }
    }
};

window.deleteSrcFile = async (name) => {
    const resConfirm = await Swal.fire({
        title: 'ยืนยันการลบไฟล์?',
        text: `คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ ${name}? การกระทำนี้ไม่สามารถย้อนกลับได้!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--danger-color)',
        confirmButtonText: 'ลบเลย',
        cancelButtonText: 'ยกเลิก'
    });

    if (resConfirm.isConfirmed) {
        let res = await API._fetch('/delete_src_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            window.srcFilesList = window.srcFilesList.filter(f => f !== name);
            saveSrcOrder(); // PERSIST
            if (window.srcSessions[name]) delete window.srcSessions[name];
            loadSrcFile(window.srcFilesList[0]);
            window.showStatusNotify('สำเร็จ!', `ลบไฟล์ ${name} เรียบร้อยแล้ว`, 'success');
        }
    }
};

window.handleTabDragStart = handleTabDragStart;
window.handleTabDrop = handleTabDrop;

async function saveAllSrcFiles() {
    let count = 0;
    for (const filename in window.srcSessions) {
        const session = window.srcSessions[filename];
        if (session.getValue() !== (session.originalContent || "")) {
            await API._fetch('/save_src_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: filename, content: session.getValue() })
            });
            session.originalContent = session.getValue();
            count++;
        }
    }
    if (count > 0) {
        window.showStatusNotify('บันทึกทั้งหมดสำเร็จ!', `บันทึกไฟล์ทั้งหมด (${count} ไฟล์) เรียบร้อยแล้ว`, 'success');
    } else {
        window.showStatusNotify('แจ้งเตือน', 'ไม่มีไฟล์ที่ต้องการบันทึก', 'warning');
    }
}

function toggleSrcFullscreen() {
    const swalPopup = Swal.getPopup();
    if (!swalPopup) return;

    if (!document.fullscreenElement) {
        swalPopup.requestFullscreen().then(() => {
            const container = swalPopup.querySelector('.src-html-root');
            if (container) container.style.height = '90vh';
        }).catch(err => {
            console.error(err);
        });
    } else {
        document.exitFullscreen();
    }
}

async function handleManualUploadFromMain() {
    if (!window.currentProjectName) return Swal.fire('แจ้งเตือน', 'โปรดตั้งชื่อโปรเจกต์ก่อนอัปโหลด', 'warning');
    if (!window.editor) return;

    const manualCode = window.editor.getValue();
    const userCode = window.generatedUserCode || ""; // Fallback to generated user code if any

    const startTime = performance.now();
    Swal.fire({
        title: "",
        html: `
            <div style="text-align:left; padding:0 10px; overflow:visible; margin-top:40px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px; overflow:visible;">
                    <div class="flash-loader" style="overflow:visible; flex-shrink:0; width:45px; height:45px; background:rgba(251,191,36,0.1); border-radius:12px; display:flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-bolt" style="color:#fbbf24; font-size:20px; filter:drop-shadow(0 0 8px rgba(251,191,36,0.6));"></i>
                    </div>
                    <div>
                        <div style="font-size:20px; font-weight:800; color:var(--text-main); line-height:1.2;">กำลังเริ่มส่งข้อมูล...</div>
                        <div style="font-size:12px; color:var(--text-muted); font-weight:400;">Manual Edit Upload (Block Context)</div>
                    </div>
                </div>
                
                <div id="pioLog" style="text-align:left; font-family:var(--font-code); font-size:11px; height:35vh; max-height:280px; overflow-y:auto; background:var(--code-bg); color:var(--text-main); padding:15px; border-radius:10px; border:1px solid var(--border-light); line-height:1.5; box-shadow:inset 0 2px 10px rgba(0,0,0,0.05); white-space:pre-wrap; word-break:break-word;">
                    <div style="color:var(--text-light); opacity:0.6; font-style:italic;">รอรับข้อมูลจากเซิร์ฟเวอร์...</div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding:0 2px;">
                    <div id="uploadTimeDisplay" style="font-size:10px; color:var(--text-muted);"><i class="fa-regular fa-clock"></i> 0.0s</div>
                    <div id="uploadStatusText" style="font-size:10px; color:var(--primary-color); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Building Project...</div>
                </div>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: false,
        allowOutsideClick: false,
        width: '700px',
        padding: '2rem',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        didOpen: async () => {
            const logEl = document.getElementById('pioLog');
            const statusText = document.getElementById('uploadStatusText');
            const timeDisplay = document.getElementById('uploadTimeDisplay');
            let hasStartedBuild = false;
            let accumulatedLogs = "";

            const timeInterval = setInterval(() => {
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
                if (timeDisplay) timeDisplay.innerHTML = `<i class="fa-regular fa-clock"></i> ${elapsed}s`;
            }, 100);

            const handleLog = (event) => {
                if (!hasStartedBuild) {
                    logEl.innerHTML = "";
                    hasStartedBuild = true;
                }
                accumulatedLogs += event.data + "\n";
                const div = document.createElement('div');
                div.style.marginBottom = "2px";
                div.innerHTML = formatPioLog(event.data);
                logEl.appendChild(div);
                logEl.scrollTop = logEl.scrollHeight;
            };

            await API._fetch('/stage_code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mainCode: manualCode, userCode: userCode })
            });

            const eventSource = new EventSource(`/upload_stream?mode=block`);
            eventSource.onmessage = handleLog;
            eventSource.addEventListener('complete', (event) => {
                clearInterval(timeInterval);
                eventSource.close();
                const timingData = JSON.parse(event.data);
                Swal.fire({
                    title: "",
                    html: `
                        <div style="text-align:center; padding:20px 10px;">
                            <div style="width:70px; height:70px; background:rgba(34, 197, 94, 0.1); border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                                <i class="fa-solid fa-check" style="color:var(--success-color); font-size:32px;"></i>
                            </div>
                            <div style="font-size:24px; font-weight:800; color:var(--text-main); margin-bottom:8px;">อัปโหลดสำเร็จ!</div>
                            <div style="font-size:14px; color:var(--text-muted); margin-bottom:25px;">บอร์ด RP2350 พร้อมทำงานแล้ว</div>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:var(--bg-panel); padding:15px; border-radius:12px; text-align:left;">
                                <div>
                                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Build Time</div>
                                    <div style="font-size:16px; font-weight:700; color:var(--primary-color);">${timingData.compile}s</div>
                                </div>
                                <div>
                                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Upload Time</div>
                                    <div style="font-size:16px; font-weight:700; color:var(--accent-color);">${timingData.upload}s</div>
                                </div>
                            </div>
                        </div>
                    `,
                    timer: 5000,
                    showConfirmButton: false,
                    background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
                    color: 'var(--text-main)',
                    width: '450px',
                    padding: '2rem'
                });
            });

            eventSource.addEventListener('error', () => {
                eventSource.onmessage = null;
                eventSource.close();
                window.lastUploadLogs = accumulatedLogs;

                const isPortError = accumulatedLogs.includes('TIMEOUT') || 
                                   accumulatedLogs.includes('FLASH_ERROR') || 
                                   accumulatedLogs.includes('REBOOTING BOARD') ||
                                   accumulatedLogs.toLowerCase().includes('connection_error') ||
                                   accumulatedLogs.toLowerCase().includes('no accessible rp2350');
                
                const hasCompileError = accumulatedLogs.includes('COMPILE ERR') || 
                                       accumulatedLogs.includes('LINK ERR') ||
                                       accumulatedLogs.includes('PCH ERR') ||
                                       accumulatedLogs.includes(': error:');

                if (isPortError && !hasCompileError) {
                    return showPortNotFoundError(handleManualUploadFromMain);
                }

                Swal.fire({
                    title: "",
                    html: `
                        <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px; margin-top:40px; text-align:left; padding:0 5px;">
                            <div style="width:60px; height:60px; background:rgba(239, 68, 68, 0.1); border-radius:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:visible;">
                                <i class="fa-solid fa-bug" style="color:var(--danger-color); font-size:28px; filter:drop-shadow(0 5px 15px rgba(239, 68, 68, 0.3));"></i>
                            </div>
                            <div>
                                <div style="font-size:20px; font-weight:800; color:var(--text-main); margin-bottom:2px;">ตรวจพบข้อผิดพลาด</div>
                                <div style="font-size:13px; color:var(--text-muted);">กรุณาตรวจสอบโค้ดที่แก้ไขเองในหน้าหลัก</div>
                            </div>
                        </div>
                        <div id="pioLog" style="text-align:left; font-family:var(--font-code); font-size:12px; height:50vh; max-height:400px; overflow-y:auto; background:var(--code-bg); color:var(--text-main); padding:20px; border-radius:12px; border:1px solid var(--border-light); line-height:1.6; white-space:pre-wrap;">
                            ${formatPioLog(accumulatedLogs).replace(/\n/g, '<br>')}
                        </div>
                    `,
                    background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
                    showConfirmButton: true,
                    confirmButtonText: 'รับทราบ',
                    confirmButtonColor: 'var(--primary-color)'
                });
            });

            const popup = Swal.getPopup();
            if (popup) popup.addEventListener('close', () => eventSource.close());
        }
    });
}

async function manualUploadFromSrc() {
    // 🛡️ State Cleanup: Releasing manager reference to prevent UI locking
    window.srcManagerSwal = null;

    // Clear old error icons before starting new upload
    if (window.srcAceEditor) {
        if (window.monaco) monaco.editor.setModelMarkers(window.srcAceEditor.getModel(), "compiler", []);
        else if (window.srcAceEditor.getSession) window.srcAceEditor.getSession().clearAnnotations();
    }

    // 1. Save sessions
    for (const filename in window.srcSessions) {
        const session = window.srcSessions[filename];
        if (session.getValue() !== (session.originalContent || "")) {
            await API._fetch('/save_src_file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: filename, content: session.getValue() }) });
            session.originalContent = session.getValue();
        }
    }

    const mainCode = window.srcSessions['main_T.ino'] ? window.srcSessions['main_T.ino'].getValue() : (window.srcSessions['main.ino'] ? window.srcSessions['main.ino'].getValue() : null);
    const userCode = window.srcSessions['User.ino'] ? window.srcSessions['User.ino'].getValue() : null;
    let url = `/upload_stream?mainCode=${encodeURIComponent(mainCode || "")}&userCode=${encodeURIComponent(userCode || "")}&mode=text`;

    let accumulatedLogs = "";

    const startTime = performance.now();
    Swal.fire({
        title: "",
        html: `
            <div style="text-align:left; padding:0 10px; overflow:visible; margin-top:40px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px; overflow:visible;">
                    <div class="flash-loader" style="overflow:visible; flex-shrink:0; width:45px; height:45px; background:rgba(251,191,36,0.1); border-radius:12px; display:flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-bolt" style="color:#fbbf24; font-size:20px; filter:drop-shadow(0 0 8px rgba(251,191,36,0.6));"></i>
                    </div>
                    <div>
                        <div style="font-size:20px; font-weight:800; color:var(--text-main); line-height:1.2;">กำลังเริ่มส่งข้อมูล...</div>
                        <div style="font-size:12px; color:var(--text-muted); font-weight:400;">Source Mode Execution</div>
                    </div>
                </div>
                
                <div id="pioLog" style="text-align:left; font-family:var(--font-code); font-size:11px; height:35vh; max-height:280px; overflow-y:auto; background:var(--code-bg); color:var(--text-main); padding:15px; border-radius:10px; border:1px solid var(--border-light); line-height:1.5; box-shadow:inset 0 2px 10px rgba(0,0,0,0.05); white-space:pre-wrap; word-break:break-word;">
                    <div style="color:var(--text-light); opacity:0.6; font-style:italic;">Building project from Source...</div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding:0 2px;">
                    <div id="uploadTimeDisplay" style="font-size:10px; color:var(--text-muted);"><i class="fa-regular fa-clock"></i> 0.0s</div>
                    <div id="uploadStatusText" style="font-size:10px; color:var(--primary-color); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Building Project...</div>
                </div>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: false,
        allowOutsideClick: false,
        width: '700px',
        padding: '2rem',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        didOpen: async () => {
            const logEl = document.getElementById('pioLog');
            const statusText = document.getElementById('uploadStatusText');
            const timeDisplay = document.getElementById('uploadTimeDisplay');
            let hasStarted = false;

            const timeInterval = setInterval(() => {
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
                if (timeDisplay) timeDisplay.innerHTML = `<i class="fa-regular fa-clock"></i> ${elapsed}s`;
            }, 100);

            // Stage the code first via POST to avoid URL length limits (Error 431)
            await API._fetch('/stage_code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mainCode, userCode })
            });

            const eventSource = new EventSource(`/upload_stream?mode=text`);

            eventSource.onmessage = (e) => {
                if (!hasStarted) {
                    logEl.innerHTML = "";
                    hasStarted = true;
                }
                accumulatedLogs += e.data + "\n";
                const div = document.createElement('div');
                div.innerHTML = formatPioLog(e.data);
                logEl.appendChild(div);
                logEl.scrollTop = logEl.scrollHeight;

                if (statusText) statusText.innerText = "Processing Logs...";
            };

            eventSource.addEventListener('complete', (e) => {
                eventSource.close();
                clearInterval(timeInterval);
                
                const realTotalTime = ((performance.now() - startTime) / 1000).toFixed(1);
                let timing = { startup: 0, discovery: 0, compile: 0, upload: 0, total: realTotalTime };
                try { 
                    if (e.data !== 'success') {
                        const serverTiming = JSON.parse(e.data);
                        timing.startup = serverTiming.startup;
                        timing.discovery = serverTiming.discovery;
                        timing.compile = serverTiming.compile;
                        timing.upload = serverTiming.upload;
                    }
                } catch(err) { }

                // Build completion success UI
                Swal.fire({
                    title: "",
                    html: `
                        <div style="text-align:center; padding:40px 0 10px; overflow:visible;">
                            <div style="width:70px; height:70px; background:rgba(16, 185, 129, 0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; overflow:visible;">
                                <i class="fa-solid fa-check" style="color:var(--success-color); font-size:36px; filter:drop-shadow(0 5px 15px rgba(16, 185, 129, 0.3));"></i>
                            </div>
                            <div style="font-size:24px; font-weight:800; color:var(--text-main); margin-bottom:8px;">สำเร็จ!</div>
                            <div style="font-size:15px; color:var(--text-muted); font-weight:500;">อัปโหลดโปรแกรมลงบอร์ดเรียบร้อยแล้ว (Source Mode)</div>
                            
                            <div style="margin-top:25px; padding:22px; background:var(--bg-panel); border-radius:16px; border:1px solid var(--border-light); display:flex; flex-direction:column; gap:12px; box-shadow:var(--shadow-sm); text-align:left;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-light); font-weight:500;">1. ระบบเริ่มต้น (Startup)</span>
                                    <span style="font-size:13px; font-weight:700; color:var(--primary-color); font-family:var(--font-code);">${timing.startup}s</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-light); font-weight:500;">2. สแกนพอร์ต (Discovery)</span>
                                    <span style="font-size:13px; font-weight:700; color:var(--primary-color); font-family:var(--font-code);">${timing.discovery}s</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-light); font-weight:500;">3. คอมไพล์โค้ด (Compile)</span>
                                    <span style="font-size:13px; font-weight:700; color:var(--primary-color); font-family:var(--font-code);">${timing.compile}s</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-light); font-weight:500;">4. ส่งข้อมูลลงบอร์ด (Upload)</span>
                                    <span style="font-size:13px; font-weight:700; color:var(--primary-color); font-family:var(--font-code);">${timing.upload}s</span>
                                </div>
                                <div style="height:1px; background:var(--border-light); margin:8px 0; opacity:0.6;"></div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:15px; font-weight:800; color:var(--text-main);">รวมเวลาทั้งหมด</span>
                                    <span style="font-size:16px; font-weight:800; color:var(--success-color); font-family:var(--font-code); filter:drop-shadow(0 0 8px rgba(16, 185, 129, 0.4));">${timing.total} วินาที</span>
                                </div>
                            </div>
                        </div>
                    `,
                    timer: 5000,
                    showConfirmButton: false,
                    background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
                    color: 'var(--text-main)',
                    width: '450px',
                    padding: '2rem'
                });
            });

            eventSource.addEventListener('error', () => {
                eventSource.onmessage = null; // 🛡️ Stop accepting logs
                eventSource.close();
                window.lastUploadLogs = accumulatedLogs;

                // --- NEW: Handle Priority using standardized ERROR_CATEGORY ---
                const isPortError = accumulatedLogs.includes('TIMEOUT') || 
                                   accumulatedLogs.includes('FLASH_ERROR') || 
                                   accumulatedLogs.includes('REBOOTING BOARD') ||
                                   accumulatedLogs.toLowerCase().includes('connection_error') ||
                                   accumulatedLogs.toLowerCase().includes('no accessible rp2350');
                
                const hasCompileError = accumulatedLogs.includes('COMPILE ERR') || 
                                       accumulatedLogs.includes('LINK ERR') ||
                                       accumulatedLogs.includes('PCH ERR') ||
                                       accumulatedLogs.includes(': error:');

                if (isPortError && !hasCompileError) {
                    // 🛡️ Prevent the .then() block from reloading the editor immediately
                    window.preventManualUploadReload = true;
                    return showPortNotFoundError(() => {
                        window.preventManualUploadReload = false;
                        manualUploadFromSrc();
                    }, () => {
                        window.preventManualUploadReload = false;
                        loadSrcFile(window.currentSrcFile || 'main.ino');
                    });
                }

                Swal.update({
                    title: "",
                    html: `
                        <div style="display:flex; align-items:center; gap:20px; margin-bottom:25px; margin-top:40px; text-align:left; padding:0 5px;">
                            <div style="width:60px; height:60px; background:rgba(239, 68, 68, 0.1); border-radius:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:visible;">
                                <i class="fa-solid fa-bug" style="color:var(--danger-color); font-size:28px; filter:drop-shadow(0 5px 15px rgba(239, 68, 68, 0.3));"></i>
                            </div>
                            <div>
                                <div style="font-size:20px; font-weight:800; color:var(--text-main); margin-bottom:2px;">ข้อผิดพลาดในการคอมไพล์</div>
                                <div style="font-size:13px; color:var(--text-muted);">Source Code ของคุณมีปัญหา กรุณาแก้ไขตาม Log ด้านล่าง</div>
                            </div>
                        </div>

                        <div style="position:relative;">
                            <button class="btn primary" style="position:absolute; top:12px; right:15px; z-index:10; padding:6px 14px; font-size:11px; border-radius:8px; opacity:0.9; height:auto; gap:6px;" onclick="copyToClipboard(window.lastUploadLogs)">
                                <i class="fa-solid fa-copy"></i> คัดลอก Log
                            </button>
                            <button class="btn" style="position:absolute; top:12px; right:145px; z-index:10; padding:6px 14px; font-size:11px; border-radius:8px; height:auto; gap:6px; background:#4f46e5; color:white; border:none; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);" onclick="analyzeErrorWithAI(window.lastUploadLogs)">
                                <i class="fa-solid fa-robot"></i> วิเคราะห์ด้วย AI
                            </button>
                            <div id="pioLog" style="text-align:left; font-family:var(--font-code); font-size:12px; height:55vh; max-height:480px; overflow-y:auto; background:var(--code-bg); color:var(--text-main); padding:25px; border-radius:15px; border:1px solid var(--border-light); line-height:1.7; box-shadow:inset 0 4px 20px rgba(0,0,0,0.08); white-space:pre-wrap; word-break:break-word;">
                                ${formatPioLog(accumulatedLogs).replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    `,
                    
                    
                    background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
                    showConfirmButton: true,
                    confirmButtonText: 'กลับไปแก้ไขโค้ด',
                    confirmButtonColor: 'var(--danger-color)',
                    showCancelButton: false
                });

                const popup = Swal.getPopup();
                if (popup) popup.addEventListener('close', () => eventSource.close());
            });
        }
    }).then(() => {
        // 🛡️ Only reload if not prevented
        if (window.preventManualUploadReload) {
            window.preventManualUploadReload = false;
            return;
        }
        loadSrcFile(window.currentSrcFile || 'main.ino');
        setTimeout(() => { 
            if (window.srcAceEditor) {
                window.srcAceEditor.focus(); 
            }
        }, 500);
    });
}

// --- 🛡️ PuppyBot AI Code Guard (Real-time Linter) ---
function runRealtimeLinting(model) {
    if (!model) return;
    const code = model.getValue();
    const markers = [];
    const lines = code.split('\n');
    const stack = [];
    const openChars = ['{', '(', '['];
    const closeChars = ['}', ')', ']'];
    const charMap = { '}': '{', ')': '(', ']': '[' };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (openChars.includes(char)) {
                stack.push({ char, line: i + 1, col: j + 1 });
            } else if (closeChars.includes(char)) {
                if (stack.length === 0 || stack[stack.length - 1].char !== charMap[char]) {
                    markers.push({
                        startLineNumber: i + 1, startColumn: j + 1,
                        endLineNumber: i + 1, endColumn: j + 2,
                        message: `พบวงเล็บปิด '${char}' ที่ไม่สัมพันธ์กับวงเล็บเปิด`,
                        severity: monaco.MarkerSeverity.Error
                    });
                } else { stack.pop(); }
            }
        }
    }
    stack.forEach(unclosed => {
        markers.push({
            startLineNumber: unclosed.line, startColumn: unclosed.col,
            endLineNumber: unclosed.line, endColumn: unclosed.col + 1,
            message: `ลืมปิดวงเล็บ '${unclosed.char === '{' ? '}' : (unclosed.char === '(' ? ')' : ']')}' หรือเปล่า?`,
            severity: monaco.MarkerSeverity.Warning
        });
    });
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('//') || line.startsWith('#') || line.endsWith('{') || line.endsWith('}') || line.endsWith(';') || line.endsWith(',') || line.includes('if (') || line.includes('while (') || line.includes('for (')) continue;
        if (line.match(/^[a-zA-Z0-9_]+\s*\(.*\)|\w+\s*=\s*.+$/)) {
             markers.push({
                startLineNumber: i + 1, startColumn: lines[i].length + 1,
                endLineNumber: i + 1, endColumn: lines[i].length + 5,
                message: "บรรทัดนี้อาจจะลืมใส่เครื่องหมาย Semi-colon (;) หรือเปล่า?",
                severity: monaco.MarkerSeverity.Info
            });
        }
    }
    monaco.editor.setModelMarkers(model, "compiler", []);
    monaco.editor.setModelMarkers(model, "codeguard", markers);
}

window.lintTimer = null;
function debouncedLint(model) {
    clearTimeout(window.lintTimer);
    window.lintTimer = setTimeout(() => runRealtimeLinting(model), 500);
}

// --- 🛡️ Server-Side Folder Picker (For absolute paths) ---
async function showServerFolderPicker(currentPath = '') {
    const normalize = (p) => p.replace(/\//g, '\\').replace(/\\\\/g, '\\').trim();
    let currentDir = normalize(currentPath);
    
    return new Promise((resolve) => {
        const renderExplorer = async () => {
            let items = [];
            try {
                if (!currentDir) {
                    const res = await API._fetch('/get_drives');
                    const data = await res.json();
                    items = data.drives.map(d => ({ name: d, isDrive: true }));
                } else {
                    const res = await API._fetch('/list_subdirs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ folderPath: currentDir })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    items = data.subdirs.map(s => ({ name: s, isDrive: false }));
                }
            } catch (err) {
                console.error(err);
                items = [];
            }

            const itemsHtml = items.map(item => {
                const fullPath = item.isDrive ? item.name : (currentDir.endsWith('\\') ? currentDir + item.name : currentDir + '\\' + item.name);
                const safePath = JSON.stringify(fullPath).replace(/"/g, '&quot;');
                return `
                <div class="explorer-item" onclick="window.navTo(${safePath})" 
                     style="padding:10px; cursor:pointer; display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--border-light); font-size:14px; transition:all 0.2s;">
                    <i class="fa-solid ${item.isDrive ? 'fa-hard-drive' : 'fa-folder'}" style="color:${item.isDrive ? 'var(--primary-color)' : '#f59e0b'}; font-size:16px;"></i>
                    <span style="color:var(--text-main); font-weight:500;">${item.name}</span>
                </div>
                `;
            }).join('');

            const parentDir = currentDir ? (currentDir.length <= 3 ? '' : currentDir.substring(0, currentDir.lastIndexOf('\\')) || currentDir.substring(0, 3)) : null;
            const safeParent = JSON.stringify(parentDir === null ? '' : parentDir).replace(/"/g, '&quot;');

            Swal.update({
                html: `
                <div style="text-align:left; margin-bottom:12px;">
                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">ตำแหน่ง / วางที่อยู่ที่นี่ (แล้วกด Enter):</div>
                    <div style="display:flex; gap:8px;">
                        <input id="explorer-address-bar" class="swal2-input" style="flex:1; margin:0; font-size:13px; height:38px; font-family:var(--font-code);" value="${currentDir}" placeholder="วางที่อยู่จาก Windows Explorer ได้ที่นี่...">
                        <button onclick="window.navTo(document.getElementById('explorer-address-bar').value)" class="btn btn-icon" style="width:40px; height:38px; border:1px solid var(--border-light); border-radius:8px;"><i class="fa-solid fa-arrow-right"></i></button>
                    </div>
                </div>
                <div style="height:300px; overflow-y:auto; border:1px solid var(--border-light); border-radius:10px; background:var(--bg-panel); text-align:left; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    ${currentDir ? `<div onclick="window.navTo(${safeParent})" style="padding:10px; cursor:pointer; color:var(--primary-color); font-size:14px; border-bottom:1px solid var(--border-light); background:rgba(37,99,235,0.05); font-weight:bold;">
                        <i class="fa-solid fa-arrow-turn-up" style="margin-right:8px;"></i> กลับไปก่อนหน้า
                    </div>` : ''}
                    ${itemsHtml || '<div style="padding:40px; text-align:center; color:var(--text-muted); font-style:italic;">ไม่พบโฟลเดอร์ย่อยหรือที่อยู่ไม่ถูกต้อง</div>'}
                </div>
                <style>
                    .explorer-item:hover { background: var(--bg-base); transform: translateX(5px); }
                </style>
                `
            });

            const addrInput = document.getElementById('explorer-address-bar');
            if (addrInput) {
                addrInput.onkeydown = (e) => {
                    if (e.key === 'Enter') window.navTo(addrInput.value);
                };
            }
        };

        window.navTo = (path) => {
            currentDir = normalize(path);
            renderExplorer();
        };

        Swal.fire({
            title: '<i class="fa-solid fa-magnifying-glass-location" style="margin-right:10px;"></i> เลือกโฟลเดอร์บันทึกไฟล์',
            html: '<div style="padding:40px; text-align:center;"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:30px; color:var(--primary-color);"></i><br><br>กำลังอ่านข้อมูลในเครื่อง...</div>',
            showCancelButton: true,
            confirmButtonText: 'ตกลง เลือกโฟลเดอร์นี้',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: 'var(--primary-color)',
            width: '600px',
            didOpen: () => renderExplorer(),
            preConfirm: () => {
                if (!currentDir || currentDir.length <= 0) {
                    Swal.showValidationMessage('กรุณาเลือกโฟลเดอร์ก่อนกดตกลง');
                    return false;
                }
                return currentDir;
            }
        }).then((result) => {
            if (result.isConfirmed) resolve(result.value);
            else resolve(null);
            delete window.navTo;
        });
    });
}

// ============================================================
// 📦 EXPORT TO FOLDER (Ctrl+L)
// ============================================================
async function openExportUF2Dialog(initialPath = null) {
    let lastPath = initialPath || localStorage.getItem('rp_export_last_path') || 'D:\\';
    
    const { value: targetFolder, isDismissed } = await Swal.fire({
        title: '<i class="fa-solid fa-folder-open" style="color:var(--primary-color)"></i> ส่งออกไฟล์ UF2',
        html: `
            <div style="text-align:left; font-size:13px; margin-bottom:15px; color:var(--text-muted); line-height:1.6;">
                ระบุเส้นทางโฟลเดอร์ปลายทาง (ก๊อปที่อยู่จาก Windows Explorer มาวางได้)
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <input id="swal-input-path" class="swal2-input" style="flex:1; margin:0; font-size:14px;" placeholder="ตัวอย่าง D:\\UF2" value="${lastPath}">
                <button id="btnBrowse" class="btn btn-icon" style="height:48px; width:48px; border:1px solid var(--border-light); background:var(--bg-panel); border-radius:8px;" title="คลิกเพื่อเลือกโฟลเดอร์">
                    <i class="fa-solid fa-magnifying-glass-location"></i>
                </button>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'ถัดไป →',
        cancelButtonText: 'ยกเลิก',
        cancelButtonColor: '#ef4444',
        didOpen: () => {
            const btn = document.getElementById('btnBrowse');
            const input = document.getElementById('swal-input-path');
            if (btn) {
                btn.onclick = async () => {
                    const pickedPath = await showServerFolderPicker(input.value);
                    if (pickedPath) {
                        openExportUF2Dialog(pickedPath);
                    } else {
                        openExportUF2Dialog(input.value);
                    }
                };
            }
        },
        preConfirm: async () => {
            const val = document.getElementById('swal-input-path').value.trim();
            if (!val || !val.includes(':')) {
                Swal.showValidationMessage('กรุณาระบุ Drive ด้วย (เช่น D:\\...)');
                return false;
            }
            
            // ตรวจสอบความปลอดภัยของโฟลเดอร์ทันที
            try {
                const res = await API._fetch('/check_folder_safety', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folderPath: val })
                });
                const data = await res.json();
                if (!data.safe) {
                    Swal.showValidationMessage(data.message || 'โฟลเดอร์ไม่ปลอดภัย (มีไฟล์อื่นอยู่)');
                    return false;
                }
                return val;
            } catch (err) {
                Swal.showValidationMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อตรวจสอบโฟลเดอร์ได้');
                return false;
            }
        }
    });

    if (isDismissed || !targetFolder) return;
    localStorage.setItem('rp_export_last_path', targetFolder);

    const { value: compileMode, isDismissed: modeDismissed } = await Swal.fire({
        title: '⚙️ เลือกโหมดคอมไพล์',
        html: `
        <div style="display:flex; gap:12px; justify-content:center; margin-top:8px;">
            <label id="modeBlock" onclick="document.getElementById('modeBlockRadio').checked=true; document.getElementById('modeBlock').style.borderColor='var(--primary-color)'; document.getElementById('modeText').style.borderColor='var(--border-light)';"
                style="flex:1; border:2px solid var(--primary-color); border-radius:12px; padding:16px 12px; cursor:pointer; transition:all 0.2s; text-align:center; background:var(--bg-base);">
                <input type="radio" id="modeBlockRadio" name="compileMode" value="block" style="display:none" checked>
                <div style="font-size:28px; margin-bottom:8px;">🧩</div>
                <div style="font-weight:700; font-size:14px; color:var(--text-main);">โหมด Block</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">ใช้โค้ดจาก Blockly Workspace</div>
            </label>
            <label id="modeText" onclick="document.getElementById('modeTextRadio').checked=true; document.getElementById('modeText').style.borderColor='var(--primary-color)'; document.getElementById('modeBlock').style.borderColor='var(--border-light)';"
                style="flex:1; border:2px solid var(--border-light); border-radius:12px; padding:16px 12px; cursor:pointer; transition:all 0.2s; text-align:center; background:var(--bg-base);">
                <input type="radio" id="modeTextRadio" name="compileMode" value="text" style="display:none">
                <div style="font-size:28px; margin-bottom:8px;">📝</div>
                <div style="font-weight:700; font-size:14px; color:var(--text-main);">โหมด Code</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">ใช้โค้ดจาก Source Editor (main_T)</div>
            </label>
        </div>`,
        confirmButtonText: '▶ เริ่มคอมไพล์',
        showCancelButton: true,
        cancelButtonColor: '#ef4444',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            return document.getElementById('modeTextRadio').checked ? 'text' : 'block';
        }
    });
    if (modeDismissed || !compileMode) return;

    Swal.fire({
        title: `<i class="fa-solid fa-hammer" style="color:var(--primary-color)"></i> กำลังคอมไพล์...`,
        html: `<div id="exportLog" style="text-align:left; font-family:var(--font-code); font-size:11px; background:var(--bg-base); border-radius:8px; padding:12px; max-height:200px; overflow-y:auto; white-space:pre-wrap; color:var(--text-main); border:1px solid var(--border-light);">เริ่มต้น...</div>`,
        allowOutsideClick: false, showConfirmButton: false, showCancelButton: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const log = document.getElementById('exportLog');
    const appendLog = (msg) => { if (log) { log.textContent += msg; log.scrollTop = log.scrollHeight; } };

    try {
        let mainCode = '';
        let userCode = window.generatedUserCode || '';

        if (compileMode === 'text') {
            // ถ้าเป็นโหมด Code ให้ดึงโค้ดจาก Monaco Editor (ถ้าเปิดไฟล์ main_T.ino อยู่)
            if (window.currentOpenFile === 'main_T.ino' && window.editor) {
                mainCode = window.editor.getValue();
            } else {
                // ถ้าไม่ได้เปิดอยู่ ให้พยายามดึงจากตัวแปรที่เก็บโค้ดล่าสุดไว้ (ถ้ามี)
                mainCode = window.lastTextCode || ''; 
            }
        } else {
            // โหมด Block ใช้โค้ดที่เจนจากบล็อก
            mainCode = window.generatedCppCode || '';
        }

        await API._fetch('/stage_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mainCode, userCode })
        });
        const url = `/export_uf2_stream?mode=${compileMode}&folder=${encodeURIComponent(targetFolder)}`;
        const es = new EventSource(url);
        es.onmessage = (e) => appendLog(e.data);
        es.addEventListener('complete', async (e) => {
            es.close(); Swal.close();
            const result = JSON.parse(e.data || '{}');
            await Swal.fire({
                icon: 'success', title: '✅ ส่งออกสำเร็จ!',
                html: `<div style="text-align:left; font-size:13px; line-height:1.8;">
                    <div>📁 <b>โฟลเดอร์:</b> <code style="font-size:11px; color:var(--primary-color)">${targetFolder}</code></div>
                    <div>📦 <b>ไฟล์ .uf2:</b> <code style="font-size:11px;">${result.uf2name || 'firmware.uf2'}</code></div>
                    <div>⚡ <b>flash.bat:</b> ดับเบิลคลิกเพื่อ Flash บอร์ดได้ทันที</div>
                    <hr style="border-color:var(--border-light); margin:8px 0;">
                </div>`, confirmButtonText: 'ตกลง'
            });
        });
        es.addEventListener('error_event', (e) => { es.close(); Swal.fire('❌ คอมไพล์ล้มเหลว', 'กรุณาตรวจสอบโค้ด', 'error'); });
        es.onerror = () => { es.close(); Swal.fire('❌ เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับ Server ได้', 'error'); };
    } catch (err) { Swal.fire('❌ เกิดข้อผิดพลาด', err.message, 'error'); }
}

window.openExportUF2Dialog = openExportUF2Dialog;

