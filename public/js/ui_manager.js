/**
 * UI Manager - Handles themes, layout, dialogs, and block search
 */

// Global state for block search
window.searchSelectedIndex = -1;
window.searchResults = [];
let searchWasOpenBeforeTheme = false;

// ✅ CAPTURE PHASE (true) = Intercepts BEFORE Monaco/Blockly can swallow the event
window.addEventListener('keydown', (e) => {
    // 🛡️ Safety check for event integrity
    if (!e || typeof e.getModifierState !== 'function') return;

    const key = (e.key || "").toLowerCase();
    const isH = (e.ctrlKey || e.metaKey) && (e.code === 'KeyH' || key === 'h');
    const isF = (e.ctrlKey || e.metaKey) && (e.code === 'KeyF' || key === 'f');
    const isAI = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyA' || key === 'a');
    const isL = (e.ctrlKey || e.metaKey) && (e.code === 'KeyL' || key === 'l');

    if (isAI) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof openGeminiConfig === 'function') openGeminiConfig();
        return;
    }

    if (isL) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof openExportUF2Dialog === 'function') openExportUF2Dialog();
        return;
    }
    if (!isF && !isH) return;

    // Use window.isCodeOpen as primary truth (set by togglePanel)
    const codeBox = document.getElementById('codeBox');
    const isCodeVisible = (window.isCodeOpen === true) ||
        (codeBox && codeBox.style.display === 'flex');

    // Check if Source Code Editor modal is open (it runs inside SweetAlert2)
    const isSrcModalOpen = !!document.querySelector('.src-html-root');

    // 🚫 Block if a regular SweetAlert2 popup is open (but NOT when srcManagerModal is open inside it)
    if (!isCodeVisible && !isSrcModalOpen) {
        if (document.body.classList.contains('swal2-shown') ||
            document.querySelector('.swal2-popup.swal2-show')) return;
    }

    if (isCodeVisible || isSrcModalOpen) {
        // ✅ Code Editor is open → trigger code find widget
        e.preventDefault();
        e.stopPropagation();
        
        if (window.EditorFind) {
            // Use srcAceEditor when Source Code Editor modal is open
            let targetEditor = null;
            if (isSrcModalOpen && window.srcAceEditor) {
                targetEditor = window.srcAceEditor;
            } else if (window.editor) {
                targetEditor = window.editor;
            }
            
            if (targetEditor) {
                window.EditorFind.editor = targetEditor;
                // 🕒 Small delay to allow browser to settle before focusing find widget
                // This prevents some focus/blur races in Monaco
                setTimeout(() => window.EditorFind.toggle(isH), 10);
            }
        }
        return;
    }

    // ✅ Blockly mode → trigger block search
    if (isH) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof toggleFindWidget === 'function') toggleFindWidget();
    }

}, true); // CAPTURE PHASE - intercepts before Monaco/Blockly

// ⌨️ Blockly Find Widget keyboard navigation (separate listener)
window.addEventListener('keydown', (e) => {
    const findWidget = document.getElementById('workspaceFindWidget');
    if (!findWidget || findWidget.style.display === 'none') return;

    // Skip if user is typing in another input
    const isEditingOther = (e.target.tagName === 'INPUT' && e.target.id !== 'workspaceFindInput') || e.target.tagName === 'TEXTAREA';
    if (isEditingOther) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFindSelection(1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFindSelection(-1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        moveFindSelection(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
        closeFindWidget();
    }
});


// --- Theme Management ---
window.currentThemeMode = localStorage.getItem('themeMode') || 'light';
window.currentThemeAccent = localStorage.getItem('themeAccent') || 'blue';

const themeLabels = {
    'blue': 'Blue Sky',
    'green': 'Emerald Forest',
    'purple': 'Midnight Purple',
    'orange': 'Sunset Orange',
    'sakura': 'Sakura Pink',
    'gold': 'Premium Gold',
    'hacker': 'Hacker Neon'
};

function applyTheme() {
    const body = document.body;
    if (!body) return;
    body.className = body.className.split(' ').filter(c => !c.startsWith('theme-') && c !== 'dark-mode').join(' ');

    const isDark = (window.currentThemeMode === 'dark');
    if (isDark) {
        body.classList.add('dark-mode');
        const icon = document.getElementById('themeModeIcon');
        if (icon) icon.className = 'fa-solid fa-moon';
    } else {
        body.classList.remove('dark-mode');
        const icon = document.getElementById('themeModeIcon');
        if (icon) icon.className = 'fa-solid fa-sun';
    }

    body.classList.add(`theme-${window.currentThemeAccent}`);

    if (window.monaco) {
        monaco.editor.setTheme(isDark ? "vs-dark" : "vs");
    }

    const label = document.getElementById('currentThemeLabel');
    if (label) label.innerText = themeLabels[window.currentThemeAccent] || 'Theme';

    localStorage.setItem('themeMode', window.currentThemeMode);
    localStorage.setItem('themeAccent', window.currentThemeAccent);
    if (window.workspace) Blockly.svgResize(window.workspace);
}

function restoreSearchIfHidden() {
    const findWidget = document.getElementById('workspaceFindWidget');
    if (searchWasOpenBeforeTheme && findWidget) {
        findWidget.style.display = 'block';
        // Restore results ONLY if there is text AND we actually found something
        const input = document.getElementById('workspaceFindInput');
        if (input && input.value.trim() !== '') {
            const results = document.getElementById('workspaceFindResults');
            if (results && findResults.length > 0) {
                results.style.display = 'block';
                updateFindCount(); // ✨ Refresh highlights and counter
            }
        }
        searchWasOpenBeforeTheme = false;
    }
}

function toggleThemeDropdown() {
    const selector = document.getElementById('themeSelector');
    if (!selector) return;

    selector.classList.toggle('active');
    const isOpening = selector.classList.contains('active');
    
    const findWidget = document.getElementById('workspaceFindWidget');
    
    // 🖥️ Check if any side/bottom panels are open
    const isCodeOpen = window.isCodeOpen;
    const isSerialOpen = window.isSerialOpen;

    if (isOpening) {
        // 🚀 ONLY hide search if BOTH panels are closed (because it will overlap)
        // If EITHER is open, it won't overlap, so keep it shown.
        if (!isCodeOpen && !isSerialOpen && findWidget && findWidget.style.display !== 'none') {
            searchWasOpenBeforeTheme = true;
            findWidget.style.display = 'none';
            // Also hide results dropdown if open
            const results = document.getElementById('workspaceFindResults');
            if (results) results.style.display = 'none';
        } else {
            searchWasOpenBeforeTheme = false;
        }
    } else {
        // Closing theme dropdown via toggle button
        restoreSearchIfHidden();
    }
}

function toggleThemeMode() {
    window.currentThemeMode = (window.currentThemeMode === 'light') ? 'dark' : 'light';
    applyTheme();
}

function changeThemeAccent(accent) {
    window.currentThemeAccent = accent;
    applyTheme();
    const selector = document.getElementById('themeSelector');
    if (selector) {
        selector.classList.remove('active');
        restoreSearchIfHidden(); // ✨ Restore search after selecting color
    }
}

document.addEventListener('click', (e) => {
    const selector = document.getElementById('themeSelector');
    if (selector && !selector.contains(e.target) && selector.classList.contains('active')) {
        selector.classList.remove('active');
        restoreSearchIfHidden(); // ✨ Restore search after clicking outside
    }
});

// --- Layout & Panels ---
// Initialize safely: try DOM first, then fallback to false
function getInitialPanelState(id) {
    const el = document.getElementById(id);
    if (el) return el.style.display === 'flex';
    return false;
}
window.isCodeOpen = getInitialPanelState('codeBox');
window.isSerialOpen = getInitialPanelState('serialBox');

function togglePanel(type) {
    const rightPanel = document.getElementById('rightPanel');
    const leftPanel = document.getElementById('leftPanel');
    const resizerV = document.getElementById('resizerV');
    const resizerH = document.getElementById('resizerH');
    const codeBox = document.getElementById('codeBox');
    const serialBox = document.getElementById('serialBox');

    if (type === 'code') {
        window.isCodeOpen = !window.isCodeOpen;
        const btn = document.getElementById('btnToggleCode');
        if (btn) btn.classList.toggle('active', window.isCodeOpen);
    }
    if (type === 'serial') {
        window.isSerialOpen = !window.isSerialOpen;
        const btn = document.getElementById('btnToggleSerial');
        if (btn) btn.classList.toggle('active', window.isSerialOpen);
    }

    if (!window.isCodeOpen && !window.isSerialOpen) {
        rightPanel.style.display = 'none';
        if (resizerV) resizerV.style.display = 'none';
        leftPanel.style.flex = '1';
        leftPanel.style.width = '100%';
    } else {
        rightPanel.style.display = 'flex';
        if (resizerV) resizerV.style.display = 'block';
        if (leftPanel.style.width === '100%' || leftPanel.style.flex === '1') {
            leftPanel.style.flex = "none";
            leftPanel.style.width = "60%";
            rightPanel.style.flex = "1";
        }
    }

    if (codeBox) codeBox.style.display = window.isCodeOpen ? 'flex' : 'none';
    if (serialBox) serialBox.style.display = window.isSerialOpen ? 'flex' : 'none';
    if (resizerH) resizerH.style.display = (window.isCodeOpen && window.isSerialOpen) ? 'block' : 'none';

    if (window.isCodeOpen && !window.isSerialOpen) { if (codeBox) codeBox.style.flex = "1"; if (codeBox) codeBox.style.height = "auto"; }
    if (!window.isCodeOpen && window.isSerialOpen) { if (serialBox) serialBox.style.flex = "1"; }
    if (window.isCodeOpen && window.isSerialOpen) {
        if (codeBox) {
            codeBox.style.flex = "1";
            codeBox.style.height = "auto";
        }
        if (serialBox) {
            serialBox.style.flex = "1";
            serialBox.style.height = "auto";
        }
    }

    // 🚀 Force multiple layout passes
    const refreshLayout = () => {
        if (window.editor && window.editor.layout) window.editor.layout();
        if (window.srcAceEditor && window.srcAceEditor.layout) window.srcAceEditor.layout();
        if (window.workspace) {
            Blockly.svgResize(window.workspace);
            if (typeof window.workspace.resizeContents === 'function') window.workspace.resizeContents();
        }
    };
    refreshLayout();
    setTimeout(refreshLayout, 50);
    setTimeout(refreshLayout, 300);
}
window.updateLayout = togglePanel; // For compatibility with editor_manager.js calls

/**
 * 🔧 Force Blockly to recalculate and re-render all workspace UI elements
 * (trash can, scrollbars, blocklyMainBackground) after layout changes.
 * Must be called AFTER any DOM mutations that affect container size.
 */
function forceBlocklyResize() {
    if (!window.workspace) return;
    const ws = window.workspace;
    const doResize = () => {
        try {
            const div = document.getElementById('blocklyDiv');
            if (div && div.offsetWidth > 0 && div.offsetHeight > 0) {
                Blockly.svgResize(ws);
                if (typeof ws.resizeContents === 'function') ws.resizeContents();
            }
        } catch (e) { /* ignore */ }
    };
    // Multi-pass to ensure the layout has fully settled
    doResize();
    requestAnimationFrame(() => {
        doResize();
        setTimeout(doResize, 100);
        setTimeout(doResize, 300);
    });
}
window.forceBlocklyResize = forceBlocklyResize;

// --- Interactive Resizing Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.getElementById('rightPanel');
    const resizerV = document.getElementById('resizerV');
    const resizerH = document.getElementById('resizerH');
    const codeBox = document.getElementById('codeBox');
    const serialBox = document.getElementById('serialBox');

    let isResizingV = false;
    let isResizingH = false;

    // Create an overlay to prevent mouse events from being swallowed by Blockly or Monaco
    const overlay = document.createElement('div');
    overlay.className = 'resizer-overlay';
    document.body.appendChild(overlay);

    const refreshLayout = () => {
        if (window.editor && window.editor.layout) window.editor.layout();
        if (window.workspace) Blockly.svgResize(window.workspace);
    };

    // --- Vertical Resizing (Left vs Right) ---
    resizerV.addEventListener('mousedown', (e) => {
        isResizingV = true;
        resizerV.classList.add('active');
        overlay.style.display = 'block';
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    // --- Horizontal Resizing (Code vs Serial) ---
    resizerH.addEventListener('mousedown', (e) => {
        isResizingH = true;
        resizerH.classList.add('active');
        overlay.style.display = 'block';
        document.body.style.cursor = 'row-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (isResizingV) {
            const containerWidth = document.querySelector('.workspace-container').offsetWidth;
            const newLeftWidth = (e.clientX / containerWidth) * 100;
            if (newLeftWidth > 20 && newLeftWidth < 80) {
                leftPanel.style.width = `${newLeftWidth}%`;
                leftPanel.style.flex = 'none';
                rightPanel.style.flex = '1';
                refreshLayout();
            }
        }

        if (isResizingH) {
            const rightPanelHeight = rightPanel.offsetHeight;
            const rect = rightPanel.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const newCodeHeight = (relativeY / rightPanelHeight) * 100;

            if (newCodeHeight > 10 && newCodeHeight < 90) {
                codeBox.style.height = `${newCodeHeight}%`;
                codeBox.style.flex = 'none';
                serialBox.style.flex = '1';
                refreshLayout();
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizingV || isResizingH) {
            isResizingV = false; isResizingH = false;
            resizerV.classList.remove('active');
            resizerH.classList.remove('active');
            overlay.style.display = 'none';
            document.body.style.cursor = 'default';
            refreshLayout();
        }
    });
});

// --- Library Manager ---
async function openLibManager(silent = false) {
    if (!silent) {
        Swal.fire({
            title: "",
            html: `
                <div style="padding: 20px 0; text-align: center;">
                    <i class="fa-solid fa-cloud-arrow-down fa-bounce" style="font-size: 45px; color: var(--primary-color); margin-bottom: 20px; filter: drop-shadow(0 0 10px var(--primary-glow));"></i>
                    <div style="font-size: 20px; font-weight: 800; color: var(--text-main);">กำลังโหลดข้อมูล...</div>
                    <div style="font-size: 13px; color: var(--text-muted); margin-top: 5px;">เชื่อมต่อฐานข้อมูลไลบรารี</div>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff'
        });
    }

    let allLibs = [];
    try {
        const userLibsData = await API.listUserLibs();
        allLibs = userLibsData.libs || [];
    } catch (err) { console.error("Library fetch failed", err); }

    let installedHtml = "";
    if (allLibs.length > 0) {
        installedHtml = allLibs.map(l => `
        <div class="custom-dialog-list-item" style="padding: 12px 15px; background: var(--bg-hover); border-radius: var(--radius-md); margin-bottom: 10px; border: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; transition: var(--transition-all);">
            <div style="flex: 1; text-align: left; padding-right: 15px;">
                <div style="font-weight: 800; color: var(--text-main); font-size: 14px; margin-bottom: 2px;">
                    <i class="fa-solid fa-box" style="color:var(--primary-color); font-size: 12px; margin-right: 5px;"></i> ${l.name}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${l.description || ''}">
                    ${l.description || 'ไม่มีคำอธิบาย'}
                </div>
                <div style="font-size: 10px; color: var(--text-light); margin-top: 5px;">
                    <i class="fa-solid fa-code-branch"></i> ${l.version} &nbsp;|&nbsp; <i class="fa-solid fa-user"></i> ${l.author}
                </div>
            </div>
            <button class="btn-icon" style="color:var(--danger-color); background:rgba(239, 68, 68, 0.05); border:1px solid rgba(239, 68, 68, 0.1); border-radius: 8px; width: 35px; height: 35px; cursor:pointer; display: flex; align-items: center; justify-content: center; transition: var(--transition-all);" 
                    onclick="deleteLibrary('${l.name}')" onmouseover="this.style.background='rgba(239, 68, 68, 0.15)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.05)'">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>`).join('');
    } else { installedHtml = "<p style='text-align:center; color:var(--text-muted); font-size:13px; padding: 20px;'>ไม่มีไลบรารีติดตั้งอยู่</p>"; }

    Swal.fire({
        title: `<div style="display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--border-light); padding-bottom:10px; margin-bottom:0; margin-top:-15px;">
                    Library Manager 
                    <i id="libTaskSpinner" class="fa-solid fa-circle-notch fa-spin" style="display:none; color:var(--primary-color); font-size:18px;"></i>
                </div>`,
        html: `
        <div style="text-align:left; font-size:13px; margin-top: 10px;">
            <div class="custom-dialog-header"><i class="fa-solid fa-cloud-arrow-down"></i> ติดตั้งออนไลน์</div>
            <div style="display:flex; gap:8px; margin-bottom:20px;">
                <input type="text" id="libSearchName" class="swal2-input" placeholder="ค้นหาไลบรารี..." style="margin:0; flex:1;">
                <button class="btn primary" onclick="searchLib()" style="border-radius:var(--radius-md); padding:0 20px; font-weight:700;">ค้นหา</button>
            </div>
            <div class="custom-dialog-header"><i class="fa-solid fa-file-zipper"></i> อัปโหลดจากไฟล์</div>
            <button class="btn" style="width:100%; border:1px dashed var(--border-light); justify-content:center; margin-bottom:20px;" onclick="document.getElementById('zipIn').click()">เลือกไฟล์ .ZIP</button>
            <div class="custom-dialog-header"><i class="fa-solid fa-boxes-stacked"></i> ที่ติดตั้งแล้ว</div>
            <div style="max-height: 180px; overflow-y: auto; margin-bottom: 15px;">
                ${installedHtml}
            </div>
            <button class="btn primary" style="width:100%; border-radius:var(--radius-md); font-weight:800; background:var(--primary-color); height:45px;" onclick="runForceRebuildUI()">
                <i class="fa-solid fa-arrows-rotate"></i> อัปเดตไลบรารี (Force Rebuild)
            </button>
        </div>`,
        showConfirmButton: false,
        showCloseButton: true,
        width: '450px',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        color: 'var(--text-main)'
    });
}

// ฟังก์ชันค้นหาไลบรารี (ปรับปรุง: เลือกเวอร์ชันได้, เช็คสถานะติดตั้ง)
async function searchLib() {
    const q = document.getElementById('libSearchName').value;
    if (!q) return;
    Swal.fire({
        title: "",
        html: `
            <div style="padding: 20px 0; text-align: center;">
                <i class="fa-solid fa-magnifying-glass fa-beat" style="font-size: 45px; color: var(--accent-color); margin-bottom: 20px; filter: drop-shadow(0 0 10px var(--accent-glow));"></i>
                <div style="font-size: 20px; font-weight: 800; color: var(--text-main);">กำลังค้นหาไลบรารี...</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 5px;">ค้นหา "${q}" ในฐานข้อมูล Arduino</div>
            </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false,
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff'
    });
    try {
        const data = await API.searchLib(q);
        const results = data.results || [];
        let itemsHtml = results.map(lib => {
            const desc = lib.description || 'ไม่มีคำอธิบาย';
            const libId = lib.name.replace(/[^a-zA-Z0-9]/g, '_');

            // ตรวจสอบสถานะการติดตั้ง (รองรับกรณีค่า null จาก Server)
            const instVer = (lib.installed_version && lib.installed_version !== 'null') ? lib.installed_version : null;
            const isInstalled = !!instVer;

            // สร้าง Options สำหรับเวอร์ชัน (เรียงใหม่ไปเก่า)
            const sortedVersions = [...(lib.versions || [])].reverse();
            let versionOptions = sortedVersions.map(v => {
                const isCurrent = v === instVer;
                return `<option value="${v}" ${v === lib.latest_version ? 'selected' : ''}>${v}${isCurrent ? ' (Installed)' : ''}</option>`;
            }).join('');

            // เช็คว่าเวอร์ชันที่เลือกใน Dropdown (ตัวล่าสุด) ตรงกับที่ติดตั้งไหม
            const isCurrentVersionInstalled = instVer === lib.latest_version;

            return `
            <div class="lib-search-card" style="padding: 15px; margin-bottom: 12px; background: var(--bg-hover); border-radius: 12px; border: 1px solid var(--border-light); display:flex; flex-direction:column; gap:10px; transition: all 0.2s ease;">
                <div style="text-align:left;">
                    <div style="display: flex; justify-content: space-between;">
                        <div style="font-weight:800; color:var(--primary-color); font-size:16px;">
                            <i class="fa-solid fa-cube"></i> ${lib.name}
                        </div>
                        ${isInstalled ? '<span style="font-size: 10px; background: #10b981; color: #fff; padding: 2px 8px; border-radius: 20px; font-weight: 800; height: fit-content;">INSTALLED</span>' : ''}
                    </div>
                    <div style="font-size:11px; color:var(--text-light); margin-top:2px;">
                        ล่าสุด: ${lib.latest_version} &nbsp;|&nbsp; <i class="fa-solid fa-user"></i> ${lib.author}
                    </div>
                    <div style="font-size:13px; color:var(--text-muted); line-height:1.5; margin: 8px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${desc}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; align-items: center;">
                    <select id="ver_${libId}" style="flex: 1; background: #222; color: #fff; border: 1px solid #444; border-radius: 8px; padding: 8px; font-size: 13px;" onchange="updateLibBtnStatus('${libId}', '${instVer || ''}')">
                        ${versionOptions}
                    </select>
                    <button id="btn_${libId}" 
                            class="btn primary" 
                            style="flex: 1.5; padding: 10px; font-size:13px; font-weight:700; border-radius:8px; ${isCurrentVersionInstalled ? 'background: #555 !important; cursor: not-allowed; opacity: 0.6;' : ''}"
                            ${isCurrentVersionInstalled ? 'disabled' : ''}
                            onclick="installSpecificLib('${lib.name}', document.getElementById('ver_${libId}').value, '${instVer || ''}')">
                        <i class="fa-solid fa-download"></i> ${isCurrentVersionInstalled ? 'ติดตั้งแล้ว' : (isInstalled ? 'อัปเดต / เปลี่ยนเวอร์ชัน' : 'ติดตั้ง')}
                    </button>
                </div>
            </div>`;
        }).join('');

        Swal.fire({
            title: `<div style="text-align:left; font-size:20px; font-weight:800; border-bottom:1px solid var(--border-light); padding: 15px 5px 10px 5px;">
                        ผลการค้นหา: ${q}
                    </div>`,
            html: `<div style="height: 65vh; max-height: 65vh; overflow-y:auto; padding:15px 5px; display:block; text-align:left;">
                    ${data.success ? (itemsHtml || '<div style="padding:40px; text-align:center; color:var(--text-muted);">ไม่พบข้อมูลที่ตรงกับคำค้นหา</div>') : `<div style="padding:40px; text-align:center; color:#ef4444;"><i class="fa-solid fa-circle-exclamation" style="font-size:30px; margin-bottom:10px;"></i><br>${data.details || 'เกิดข้อผิดพลาดในการค้นหา'}</div>`}
                   </div>`,
            showConfirmButton: false,
            showCloseButton: true,
            width: '600px',
            background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
            color: 'var(--text-main)',
            customClass: {
                popup: 'simple-search-popup'
            },
            didOpen: () => {
                const style = document.createElement('style');
                style.innerHTML = `
                    .simple-search-popup { border-radius: 15px !important; min-height: 500px !important; }
                    .lib-search-card:hover { border-color: var(--primary-color) !important; background: var(--bg-solid) !important; }
                `;
                document.head.appendChild(style);
            }
        });
    } catch (e) {
        console.error("Search error:", e);
        Swal.fire({
            title: 'การค้นหาล้มเหลว',
            text: 'เกิดข้อผิดพลาด: ' + e.message,
            icon: 'error',
            confirmButtonText: 'รับทราบ',
            background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
            color: 'var(--text-main)'
        });
    }
}

// อัปเดตสถานะปุ่มเมื่อเลือกเวอร์ชันใน Dropdown
function updateLibBtnStatus(libId, installedVersion) {
    const select = document.getElementById('ver_' + libId);
    const btn = document.getElementById('btn_' + libId);
    if (!select || !btn) return;

    const selectedVersion = select.value;
    if (selectedVersion === installedVersion) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ติดตั้งแล้ว';
        btn.style.background = "#555";
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
        btn.disabled = true;
    } else {
        btn.innerHTML = `<i class="fa-solid fa-download"></i> ${installedVersion ? 'เปลี่ยนเวอร์ชัน' : 'ติดตั้ง'}`;
        btn.style.background = ""; // Reset to CSS default
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.disabled = false;
    }
}

async function installSpecificLib(name, version, currentVersion) {
    let confirmMsg = `คุณต้องการติดตั้ง "${name}" เวอร์ชัน ${version} ใช่หรือไม่?`;
    if (currentVersion && currentVersion !== "null" && currentVersion !== version) {
        confirmMsg = `ตรวจพบเวอร์ชัน ${currentVersion} ติดตั้งอยู่แล้ว ระบบจะลบเวอร์ชันเดิมออกและติดตั้งเวอร์ชัน ${version} แทนที่ คุณต้องการดำเนินการต่อหรือไม่?`;
    }

    const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันการติดตั้ง',
        text: confirmMsg,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ตกลง',
        cancelButtonText: 'ยกเลิก',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        color: 'var(--text-main)'
    });

    if (!isConfirmed) return;

    Swal.fire({
        title: 'กำลังติดตั้ง...',
        html: `กำลังติดตั้ง <b>${name}</b> (v${version})<br><br>โปรดรอสักครู่ ระบบจะรัน Rebuild ให้อัตโนมัติเมื่อเสร็จสิ้น`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const result = await API.installLib(name, version);
        if (result.success) {
            // เมื่อติดตั้งสำเร็จ ให้เรียก Rebuild UI ทันที
            Swal.close();
            runForceRebuildUI();
        } else {
            Swal.fire('การติดตั้งล้มเหลว', result.details || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ', 'error');
        }
    } catch (e) {
        Swal.fire('ข้อผิดพลาดระบบ', e.message, 'error');
    }
}


async function deleteLibrary(libName) {
    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `คุณต้องการลบไลบรารี "${libName}" ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--danger-color)',
        cancelButtonColor: 'var(--text-muted)',
        confirmButtonText: 'ลบออก',
        cancelButtonText: 'ยกเลิก',
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        color: 'var(--text-main)'
    });

    if (result.isConfirmed) {
        try {
            const data = await API.deleteLib(libName);
            if (data.success) {
                runForceRebuildUI();
            } else {
                Swal.fire('Error', data.details || 'ลบไม่สำเร็จ', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    }
}

async function uploadZipLibrary(event) {
    const file = event.target.files[0];
    if (!file) return;
    const libName = file.name.replace('.zip', '');

    const formData = new FormData();
    formData.append('zip', file);
    formData.append('libName', libName);

    try {
        const data = await API.uploadZipLib(formData);
        if (data.success) {
            runForceRebuildUI();
        } else {
            Swal.fire('Error', data.error || 'อัปโหลดไม่สำเร็จ', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'ระบบขัดข้อง', 'error');
    }
    event.target.value = '';
}

// --- FORCE REBUILD UI LOGIC ---
function runForceRebuildUI() {
    let logLines = [];
    let isFinished = false;

    Swal.fire({
        title: '<span id="rebuildStatus">กำลังอัปเดตฐานข้อมูลไลบรารี...</span>',
        html: `
            <div style="text-align:center; padding: 10px 0;">
                <div id="rebuildSpinner" style="margin-bottom: 15px;">
                    <i class="fa-solid fa-arrows-rotate fa-spin" style="font-size: 40px; color: var(--primary-color);"></i>
                </div>
                <div id="rebuildSubStatus" style="font-size: 14px; color: var(--text-muted); margin-bottom: 10px;">กำลังปรับจูนระบบและตรวจสอบ Dependency...</div>
                <div id="rebuildLog" style="background: #000; color: #0f0; font-family: 'Consolas', monospace; font-size: 11px; padding: 10px; border-radius: 5px; height: 220px; overflow-y: auto; text-align: left; white-space: pre; margin-top: 10px; border: 1px solid #333;">รอกระบวนการเริ่มต้น...</div>
                <button id="closeRebuildBtn" class="btn primary" style="display:none; margin-top:15px; width:100%; padding:12px;" onclick="Swal.close()">ปิดหน้าต่างนี้</button>
            </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false,
        showCloseButton: false,
        background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
        color: 'var(--text-main)',
        width: '600px',
        didOpen: () => {
            const logEl = document.getElementById('rebuildLog');
            const statusEl = document.getElementById('rebuildStatus');
            const subStatusEl = document.getElementById('rebuildSubStatus');
            const spinnerEl = document.getElementById('rebuildSpinner');
            const closeBtn = document.getElementById('closeRebuildBtn');
            const eventSource = new EventSource('/rebuild_stream');

            const finalize = (success) => {
                if (isFinished) return;
                isFinished = true;
                eventSource.close();
                if (spinnerEl) spinnerEl.innerHTML = success ? '<i class="fa-solid fa-circle-check" style="font-size:40px; color:#10b981;"></i>' : '<i class="fa-solid fa-circle-xmark" style="font-size:40px; color:#ef4444;"></i>';
                if (statusEl) statusEl.innerText = success ? 'อัปเดตสำเร็จ!' : 'อัปเดตล้มเหลว!';
                if (subStatusEl) subStatusEl.innerText = success ? 'ระบบพร้อมใช้งานแล้ว' : 'กรุณาตรวจสอบข้อผิดพลาดใน Log';
                if (closeBtn) closeBtn.style.display = 'block';
                if (success) {
                    setTimeout(() => { if (!Swal.isVisible()) return; Swal.close(); openLibManager(true); }, 3000);
                }
            };

            eventSource.onmessage = (e) => {
                logLines.push(e.data);
                if (logLines.length > 500) logLines.shift(); // Keep only last 500 lines for performance

                if (logEl) {
                    logEl.textContent = logLines.join('\n');
                    logEl.scrollTop = logEl.scrollHeight;
                }
            };

            eventSource.addEventListener('complete', () => finalize(true));
            eventSource.addEventListener('error', () => finalize(false));

            eventSource.onerror = () => {
                // SSE might close connection when done, check if we got success signals in log
                if (!isFinished) {
                    // Small delay to see if 'complete' event arrives
                    setTimeout(() => { if (!isFinished) finalize(false); }, 1000);
                }
            };
        }
    });
}

// --- Project Management UI ---

async function openFileManager(isMandatory = false) {
    const res = await fetch('/files'), data = await res.json();

    if (data.files.length === 0 && isMandatory) {
        return newProject();
    }

    // 🔍 Security: Filter internal and hidden files (starting with . or _)
    const filteredFiles = data.files.filter(f => f.endsWith('.rp2350') && !f.startsWith('.') && !f.startsWith('_'));

    let html = `
        <div style="text-align:left; font-size:14px; padding-top:10px;">
            <div style="max-height:400px; overflow-y:auto; padding-right:5px;">
    `;

    if (filteredFiles.length === 0) {
        html += `<div style="text-align:center; padding:40px 0; color:var(--text-muted);">
                    <i class="fa-solid fa-folder-open" style="font-size:48px; opacity:0.2; display:block; margin-bottom:15px;"></i>
                    ไม่พบโปรเจกต์ในตอนนี้
                 </div>`;
    } else {
        filteredFiles.forEach(f => {
            const baseName = f.replace('.rp2350', '');
            html += `
            <div class="custom-dialog-list-item" style="margin-bottom:12px; padding:15px 18px;">
                <div style="display:flex; align-items:center; gap:12px; flex:1;">
                    <i class="fa-solid fa-file-invoice" style="color:var(--primary-color); font-size:18px;"></i>
                    <span style="font-weight:600; font-family:var(--font-code); color:var(--text-main); font-size:15px;">${baseName}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn primary" style="padding:6px 15px; font-size:13px; font-weight:700;" onclick="loadFile('${f}')">เปิด</button> `;

            if (!isMandatory) {
                html += `
                    <button class="btn" style="width:34px; height:34px; padding:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-light);" onclick="renameFile('${f}')" title="เปลี่ยนชื่อ">
                        <i class="fa-solid fa-pen" style="font-size:12px; color:var(--text-muted);"></i>
                    </button> 
                    <button class="btn" style="width:34px; height:34px; padding:0; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-light);" onclick="deleteFile('${f}')" title="ลบ">
                        <i class="fa-solid fa-trash" style="font-size:12px; color:var(--danger-color);"></i>
                    </button>`;
            }

            html += `</div></div>`;
        });
    }
    html += '</div></div>';

    Swal.fire({
        title: `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; padding-right:45px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <i class="fa-solid fa-folder-tree" style="color:var(--primary-color);"></i>
                    <span style="font-weight:800;">แฟ้มผลงาน</span>
                </div>
                <button class="btn" onclick="newProject()" style="padding:6px 15px; font-size:13px; font-weight:700; background:var(--bg-panel); border:1px solid var(--border-light); color:var(--text-main); border-radius:8px;">
                    <i class="fa-solid fa-plus"></i> โปรเจกต์ใหม่
                </button>
            </div>
        `,
        html: html,
        showConfirmButton: false,
        showCancelButton: !isMandatory,
        cancelButtonText: 'ยกเลิก',
        allowOutsideClick: !isMandatory,
        allowEscapeKey: !isMandatory,
        width: '550px'
    });
}

async function newProject() {
    let serverFiles = [];
    try {
        const res = await fetch('/files');
        const data = await res.json();
        serverFiles = data.files || [];
    } catch (e) { }

    const canCancel = !!window.currentProjectName || serverFiles.length > 0;
    const isMandatory = !window.currentProjectName;

    const { value: name, isDismissed } = await Swal.fire({
        title: 'เริ่มโปรเจกต์ใหม่',
        input: 'text',
        inputPlaceholder: 'ชื่อโปรเจกต์ใหม่...',
        inputValidator: (v) => {
            if (!v || v.trim() === '') return 'โปรดระบุชื่อโปรเจกต์';
            if (v.includes('.')) return 'ชื่อห้ามมีจุดพิเศษ (.)';
            if (serverFiles.includes(v + '.rp2350')) return 'ชื่อนี้มีอยู่แล้ว โปรดใช้ชื่ออื่น';
            return null;
        },
        allowOutsideClick: !isMandatory,
        allowEscapeKey: !isMandatory,
        showCancelButton: canCancel,
        cancelButtonText: 'ยกเลิก',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'สร้าง'
    });

    if (isDismissed) return;

    if (name) {
        window.currentProjectName = name;
        localStorage.setItem('rp_last_file', name + '.rp2350');
        localStorage.setItem('rp_project_name', name);
        
        // 🚀 Step 1: Reveal the UI immediately and restore interaction
        const container = document.getElementById('container');
        if (container) {
            container.classList.remove('is-loading');
            container.style.pointerEvents = "auto";
        }
        updateBadge();

        // 🚀 Step 2: Brief delay to let Grid/Flex layout settle
        setTimeout(async () => {
            window.workspace.clear();
            window.srcSessions = {}; 
            window.customBlocksData = []; // 🧹 Clear custom blocks for new projects
            
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(window.defaultWorkspaceXML), window.workspace);
            if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();

            
            // 🧩 Sync and Refresh
            if (typeof generateAndPreviewCode === 'function') generateAndPreviewCode();
            if (typeof performAutoSave === 'function') performAutoSave();

            window.workspace.clearUndo();
            ensureEssentialBlocks();
            
            // 🔧 Force resize BEFORE showing Swal
            forceBlocklyResize();

            // 🟢 Show success - then resize AGAIN after Swal closes
            // (Swal adds 'swal2-shown' to body which distorts layout)
            Swal.fire({ 
                title: 'เริ่มโปรเจกต์ใหม่สำเร็จ!', 
                icon: 'success', 
                timer: 1500, 
                timerProgressBar: true, 
                showConfirmButton: false 
            }).then(() => {
                // 🔑 KEY FIX: Re-measure AFTER Swal removes swal2-shown from body
                forceBlocklyResize();
            });
        }, 100);
    }
}

async function loadFile(n) {
    try {
        // 🛡️ CRITICAL: Save current project before switching to another one
        if (window.currentProjectName && !window.loadingLastFile) {
            console.log(`[File] Saving current project "${window.currentProjectName}" before switching...`);
            if (typeof saveProject === 'function') await saveProject();
        }

        const res = await fetch(`/load_file/${encodeURIComponent(n)}`);
        if (!res.ok) throw new Error("File not found");
        const data = await res.json();

        window.workspace.clear();
        window.srcSessions = {}; // 🧹 Clear cached source sessions on project switch
        window.customBlocksData = data.customBlocks || [];
        
        // 🔄 Force refresh UI state
        if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();

        try {
            console.log(`[File] Attempting to load XML (${data.xml ? data.xml.length : 0} bytes)`);
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(data.xml), window.workspace);
        } catch (xmlError) {
            console.error("[File] ❌ Corrupted project XML:", xmlError);
            Swal.fire('ไฟล์เสียหาย', 'ไม่สามารถอ่านโครงสร้างบล็อกได้ ข้อมูลอาจสูญหายบางส่วน', 'warning');
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(window.defaultWorkspaceXML), window.workspace);
        }

        window.currentProjectName = n.replace('.rp2350', '');
        localStorage.setItem('rp_last_file', n);
        updateBadge(); 

        // 🧩 Sync with server immediately after project name is set
        if (typeof generateAndPreviewCode === 'function') generateAndPreviewCode();
        if (typeof performAutoSave === 'function') performAutoSave();
        
        // 🛡️ Protection: Reset undo and ensure essentials
        setTimeout(() => {
            if (window.workspace) {
                window.workspace.clearUndo();
                ensureEssentialBlocks();
            }
        }, 100);

        document.getElementById('container').classList.remove('is-loading');
        
        if (typeof window.updateLayout === 'function') {
            window.updateLayout();
            // 🚀 Force stability pass
            setTimeout(() => window.updateLayout(), 150);
        }
        
        Swal.close();
        return true;
    } catch (e) {
        if (window.loadingLastFile) {
            localStorage.removeItem('rp_last_file');
            window.currentProjectName = "";
            updateBadge();
            newProject();
        } else {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดไฟล์ได้', 'error');
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(window.defaultWorkspaceXML), window.workspace);
        }
        return false;
    } finally {
        window.loadingLastFile = false;
    }
}

async function renameFile(old) {
    let serverFiles = [];
    try {
        const res = await fetch('/files');
        const data = await res.json();
        serverFiles = data.files || [];
    } catch (e) { }

    const { value: n } = await Swal.fire({
        title: 'ตั้งชื่อใหม่',
        input: 'text',
        inputValue: old.replace('.rp2350', ''),
        inputValidator: (v) => {
            if (!v || v.trim() === '') return 'โปรดระบุชื่อใหม่';
            if (v.includes('.')) return 'ชื่อห้ามมีจุดพิเศษ (.)';
            if (v !== old.replace('.rp2350', '') && serverFiles.includes(v + '.rp2350')) return 'ชื่อนี้มีอยู่แล้ว';
            return null;
        }
    });
    if (n) {
        await fetch('/rename_file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldName: old, newName: n + '.rp2350' }) });
        if (window.currentProjectName === old.replace('.rp2350', '')) {
            window.currentProjectName = n;
            localStorage.setItem('rp_last_file', n + '.rp2350');
            updateBadge();
            if (typeof performAutoSave === 'function') performAutoSave();
        }
        openFileManager();
    }
}

async function deleteFile(n) {
    const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันการลบโปรเจกต์',
        text: `คุณต้องการลบโปรเจกต์ "${n.replace('.rp2350', '')}" ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบเลย',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    });

    if (isConfirmed) {
        Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await fetch(`/delete_file/${encodeURIComponent(n)}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                await Swal.fire({ title: 'ลบไฟล์สำเร็จ!', icon: 'success', timer: 3000, timerProgressBar: true, showConfirmButton: false });

                const fileRes = await fetch('/files');
                const fileData = await fileRes.json();
                const isCurrentDeleted = (n.replace('.rp2350', '') === window.currentProjectName);

                if (isCurrentDeleted || fileData.files.length === 0) {
                    window.currentProjectName = "";
                    localStorage.removeItem('rp_last_file');
                    updateBadge();
                    window.workspace.clear();
                    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(window.defaultWorkspaceXML), window.workspace);
                    if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();

                    if (fileData.files.length > 0) {
                        openFileManager(true);
                    } else {
                        newProject();
                    }
                } else {
                    openFileManager();
                }
            } else {
                Swal.fire('ล้มเหลว', data.error || 'ไม่สามารถลบไฟล์ได้', 'error');
            }
        } catch (e) {
            Swal.fire('ข้อผิดพลาด', 'ติดต่อเซิร์ฟเวอร์ไม่ได้', 'error');
        }
    }
}

async function renameProject() {
    if (!window.currentProjectName) return newProject();
    renameFile(window.currentProjectName + '.rp2350');
}

function downloadProject() {
    if (!window.currentProjectName) return Swal.fire('แจ้งเตือน', 'ตั้งชื่อก่อนเซฟ', 'warning');
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(window.workspace));
    const saveData = JSON.stringify({ xml: xml, customBlocks: window.customBlocksData });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([saveData]));
    a.download = window.currentProjectName + '.rp2350'; a.click();
}

function importFile() { document.getElementById('fileIn').click(); }

async function loadLocalFile(e) {
    const f = e.target.files[0]; if (!f) return;
    let baseName = f.name.replace('.rp2350', '');
    const res = await fetch('/files'); const data = await res.json();
    let finalFilename = f.name;
    const existingFiles = data.files || [];

    if (existingFiles.includes(f.name)) {
        let counter = 2;
        let suggestedName = baseName + '_copy_' + counter;

        // Auto-increment if the suggested name also exists
        while (existingFiles.includes(suggestedName + '.rp2350')) {
            counter++;
            suggestedName = baseName + '_copy_' + counter;
        }

        const result = await Swal.fire({
            title: `
                <div style="display:flex; align-items:center; gap:8px; width:100%; padding-bottom:2px; border-bottom:1px solid var(--border-light); margin-bottom:-2px;">
                    <i class="fa-solid fa-copy" style="color:#fbbf24; font-size:16px;"></i>
                    <div style="font-weight:700; font-size:15px; color:var(--text-main);">ชื่อโปรเจกต์ซ้ำ</div>
                </div>
            `,
            html: `
                <div style="text-align:left; padding-top:0;">
                    <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px; line-height:1.3; opacity:0.9;">
                        พบชื่อ <span style="font-weight:700; color:var(--primary-color);">"${f.name}"</span> แล้ว โปรดระบุชื่อใหม่:
                    </p>
                    <div style="padding:0;">
                        <input id="swal-input-name" class="swal2-input" value="${suggestedName}" 
                            style="width:100%; margin:0; padding:0 12px; border-radius:8px; border:1px solid var(--border-light); background:var(--bg-solid); color:var(--text-main); font-family:var(--font-code); font-size:14px; box-sizing:border-box; outline:none; height:40px !important;">
                    </div>
                </div>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const val = document.getElementById('swal-input-name').value;
                if (!val) {
                    Swal.showValidationMessage('โปรดระบุชื่อโปรเจกต์');
                    return false;
                }
                return val;
            },
            showCancelButton: false,
            confirmButtonText: '<i class="fa-solid fa-check-circle"></i> บันทึกชื่อใหม่',
            background: window.currentThemeMode === 'dark' ? '#121212' : '#ffffff',
            color: 'var(--text-main)',
            width: '350px',
            padding: '0.1rem 0.8rem 0.6rem 0.8rem'
        });

        if (result.isConfirmed && result.value) {
            baseName = result.value;
            finalFilename = result.value + '.rp2350';
        } else {
            return;
        }
    }

    const r = new FileReader();
    r.onload = async (ev) => {
        window.workspace.clear();
        try {
            let parsedData = JSON.parse(ev.target.result);
            window.customBlocksData = parsedData.customBlocks || [];
            if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(parsedData.xml), window.workspace);
            window.currentProjectName = baseName; updateBadge();
            await fetch('/save_file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: window.currentProjectName + '.rp2350', xml: parsedData.xml, customBlocks: window.customBlocksData }) });
            
            setTimeout(() => {
                if (window.workspace) {
                    window.workspace.clearUndo();
                    ensureEssentialBlocks();
                }
            }, 100);

            await Swal.fire({ title: 'นำเข้าไฟล์สำเร็จ!', icon: 'success', timer: 3000, timerProgressBar: true, showConfirmButton: false });
        } catch (err) { Swal.fire('เกิดข้อผิดพลาด', 'ไฟล์ไม่รองรับ', 'error'); }
    };
    r.readAsText(f); 
    e.target.value = '';
}

function updateBadge() {
    const el = document.getElementById('projectNameDisplay');
    if (el) {
        if (window.currentProjectName) {
            el.innerHTML = `<i class="fa-solid fa-code-branch"></i> <span>${window.currentProjectName}</span>`;
            el.className = "project-tag tag-named";
        } else {
            el.innerHTML = `<i class="fa-solid fa-code-branch"></i> <span>Untitled</span>`;
            el.className = "project-tag tag-empty";
        }
    }
}

function openCustomBlockManager(restoredState = null) {
    // 🎨 Apply Global Studio Styles (Scrollbars & Modern UI)
    if (!document.getElementById('studio-global-styles')) {
        const style = document.createElement('style');
        style.id = 'studio-global-styles';
        style.textContent = `
            .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary-rgb), 0.15); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--primary-rgb), 0.3); }
            
            .blocklyScrollbarHandle { fill: var(--primary-color) !important; fill-opacity: 0.1 !important; rx: 4px; ry: 4px; transition: fill-opacity 0.2s; }
            .blocklyScrollbarHandle:hover { fill-opacity: 0.3 !important; }
            .blocklyScrollbarBackground { fill: transparent !important; fill-opacity: 0 !important; }
        `;
        document.head.appendChild(style);
    }

    window.isEditingCustomBlocks = true;
    window.studioPreviewInitialized = false; 
    if (!restoredState && !window.editingBlockId) window.studioParamMetadata = {}; 
    window.tempStudioCategory = restoredState ? restoredState.tempStudioCategory : null; 

    if (restoredState) {
        window.studioStep = restoredState.step || 2;
    } else if (window.editingBlockId) {
        window.studioStep = 1; 
    } else if (window.studioStep === undefined || window.studioStep === null || window.studioStep > 3) {
        window.studioStep = 0; 
    }


    // High-End List Item Design with Drag & Drop
    let listHtml = (window.customBlocksData || []).map((cb, index) => `
    <div class="studio-list-item" 
         draggable="true" 
         ondragstart="onStudioItemDragStart(event, ${index})" 
         ondragover="onStudioItemDragOver(event, ${index})" 
         ondragleave="onStudioItemDragLeave(event)"
         ondrop="onStudioItemDrop(event, ${index})"
         onclick="editCustomBlock('${cb.id}')" 
         style="cursor:grab; padding:15px; margin-bottom:12px; background:var(--bg-panel); border-radius:16px; border:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center; transition:all 0.15s; box-shadow: 0 2px 5px rgba(0,0,0,0.02); position:relative;">
        <div style="display:flex; align-items:center; gap:15px;">
            <div style="width:40px; height:40px; border-radius:12px; background:hsl(${cb.color || 210}, 75%, 95%); color:hsl(${cb.color || 210}, 75%, 50%); display:flex; align-items:center; justify-content:center; font-size:18px;">
                <i class="fa-solid ${cb.icon || (cb.isSetup ? 'fa-gear' : 'fa-cube')}"></i>
            </div>
            <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-weight:800; font-size:14px; color:var(--text-main);">${cb.name}</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:10px; font-weight:700; color:var(--primary-color); text-transform:uppercase; letter-spacing:0.5px;">${cb.category}</span>
                    ${cb.isSetup ? '<span style="font-size:9px; background:var(--primary-color); color:white; padding:1px 6px; border-radius:20px; font-weight:900;">SETUP</span>' : ''}
                </div>
            </div>
        </div>
        <div style="display:flex; gap:10px;" onclick="event.stopPropagation()">
            <button class="btn-icon-subtle ${cb.hidden ? '' : 'active'}" onclick="toggleBlockVisibility('${cb.id}')" title="${cb.hidden ? 'แสดงบล็อก' : 'ซ่อนบล็อก'}">
                <i class="fa-solid ${cb.hidden ? 'fa-eye-slash' : 'fa-eye'}" style="color: ${cb.hidden ? 'var(--text-muted)' : 'var(--primary-color)'}"></i>
            </button>
            <button class="btn-icon-subtle" onclick="editCustomBlock('${cb.id}')" title="แก้ไข"><i class="fa-solid fa-pen-nib"></i></button>
            <button class="btn-icon-subtle danger" onclick="deleteCustomBlock('${cb.id}')" title="ลบ"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    </div>`).join('') || `
        <div style="padding:40px; text-align:center; color:var(--text-muted); opacity:0.6;">
            <i class="fa-solid fa-folder-open" style="font-size:30px; margin-bottom:10px;"></i>
            <p>ยังไม่มีบล็อกเสริมในขณะนี้</p>
        </div>
    `;

    Swal.fire({
        title: '',
        html: `
        <div id="studio-shell" style="text-align:left; padding: 25px 10px 10px 10px;">
            
            <!-- 🏛️ DASHBOARD (STEP 0) -->
            <div id="studio-step-0" class="studio-step-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; padding: 15px; background:rgba(var(--primary-rgb), 0.03); border-radius:20px; border:1px solid rgba(var(--primary-rgb), 0.08);">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div style="width:45px; height:45px; background:var(--primary-color); border-radius:14px; display:flex; align-items:center; justify-content:center; color:white; font-size:20px; box-shadow:0 8px 15px rgba(var(--primary-rgb), 0.2);">
                            <i class="fa-solid fa-puzzle-piece"></i>
                        </div>
                        <div>
                            <div style="font-size:20px; font-weight:900; color:var(--text-main); letter-spacing:-0.5px; line-height:1.2;">สตูดิโอบล็อก</div>
                            <div style="font-size:11px; color:var(--text-muted); font-weight:600; opacity:0.7;">LIBRARY MANAGER</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="studio-top-btn" onclick="downloadCustomBlocks()" title="ดาวน์โหลดบล็อกทั้งหมด" style="width:38px; height:38px; border-radius:10px;"><i class="fa-solid fa-cloud-arrow-down" style="font-size:14px;"></i></button>
                        <button class="studio-top-btn" onclick="document.getElementById('customBlockIn').click()" title="นำเข้าบล็อกเสริม" style="width:38px; height:38px; border-radius:10px;"><i class="fa-solid fa-cloud-arrow-up" style="font-size:14px;"></i></button>
                    </div>
                </div>

                <div id="studio-list-container" style="margin-bottom:30px; max-height:350px; overflow-y:auto; padding:10px 8px; position:relative;" class="custom-scrollbar">
                    ${listHtml || `
                        <div style="padding:60px 20px; text-align:center; border:2px dashed var(--border-light); border-radius:24px; background:rgba(var(--primary-rgb), 0.01);">
                            <div style="width:60px; height:60px; background:var(--bg-panel); border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 15px; color:var(--text-muted); font-size:24px;">
                                <i class="fa-solid fa-puzzle-piece"></i>
                            </div>
                            <div style="font-weight:800; color:var(--text-main); margin-bottom:5px;">ห้องสมุดว่างเปล่า</div>
                            <div style="font-size:11px; color:var(--text-muted);">เริ่มสร้างบล็อกเสริมแรกของคุณเพื่อขยายความสามารถให้โปรเจกต์</div>
                        </div>
                    `}
                </div>

                <button class="studio-primary-btn" onclick="goStudioStep(1)">
                    <i class="fa-solid fa-sparkles"></i> สร้างบล็อกใหม่
                </button>
            </div>

            <!-- 🧭 WIZARD NAVIGATION (STEP 1-3) -->
            <div id="wizard-flow" style="display:none; margin-bottom:30px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px; padding: 0 5px;">
                    <div style="width:40px; height:40px; background:rgba(var(--primary-rgb), 0.1); border-radius:12px; display:flex; align-items:center; justify-content:center; color:var(--primary-color); font-size:18px;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div style="display:flex; flex-direction:column; flex:1;">
                        <span id="wizard-title" style="font-size:18px; font-weight:900; color:var(--text-main); letter-spacing:-0.5px; line-height:1.2;">กำลังสร้างบล็อก</span>
                        <span style="font-size:10px; font-weight:800; color:var(--primary-color); opacity:0.8; letter-spacing:1px; text-transform:uppercase;">STEP <span id="current-step-num">1</span> OF 3</span>
                    </div>
                </div>
                <div style="display:flex; gap:8px; height:6px; padding: 0 5px;">
                    <div id="pb-1" style="flex:1; border-radius:20px; background:var(--primary-color); transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow:0 2px 5px rgba(var(--primary-rgb), 0.1);"></div>
                    <div id="pb-2" style="flex:1; border-radius:20px; background:var(--border-light); transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    <div id="pb-3" style="flex:1; border-radius:20px; background:var(--border-light); transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>

            <!-- 📄 STEP 1: CORE CONFIG -->
            <div id="studio-step-1" class="studio-step-panel" style="display:none;">
                <div class="studio-form-card">
                    <div class="studio-field">
                        <label>หมวดหมู่บล็อก (Category) <span style="color:var(--danger-color);">*</span></label>
                        <div id="category-select-wrapper" style="display:flex; gap:10px; flex:1;">
                            <div class="studio-custom-select" style="flex:1; position:relative;">
                                <div id="cbCategoryTrigger" class="studio-input" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; height:45px;">
                                    <span id="cbCategoryLabel" style="opacity:0.6;">-- เลือกหมวดหมู่บล็อก --</span>
                                    <i class="fa-solid fa-chevron-down" style="font-size:10px; opacity:0.4;"></i>
                                </div>
                                <div id="cbCategoryDropdown" class="studio-dropdown-menu">
                                    <div class="studio-dropdown-search">
                                        <i class="fa-solid fa-magnifying-glass"></i>
                                        <input type="text" id="cbCategorySearch" placeholder="ค้นหาหมวดหมู่..." onclick="event.stopPropagation()">
                                    </div>
                                    <div id="cbCategoryOptions" class="studio-dropdown-options custom-scrollbar">
                                        <!-- Options will be rendered here -->
                                    </div>
                                </div>
                                <input type="hidden" id="cbCategory" value="">
                            </div>
                            <button class="studio-top-btn" onclick="addNewCategoryPrompt()" title="เพิ่มหมวดหมู่ใหม่" style="background:var(--primary-color); color:white; border:none; width:45px; height:45px; flex-shrink:0;">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                        <div id="category-add-wrapper" style="display:none; gap:10px;">
                            <input type="text" id="newCategoryName" placeholder="ชื่อหมวดหมู่ใหม่..." class="studio-input" style="flex:1;">
                            <button class="studio-top-btn" onclick="confirmNewCategory()" title="บันทึก" style="background:var(--success-color); color:white; border:none; width:40px;">
                                <i class="fa-solid fa-check"></i>
                            </button>
                            <button class="studio-top-btn" onclick="cancelNewCategory()" title="ยกเลิก" style="background:var(--danger-color); color:white; border:none; width:40px;">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>

                    <div id="mode-return-fields" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:20px; align-items: start;">
                        <div class="studio-field">
                            <label>รูปแบบการทำงาน <span style="color:var(--danger-color);">*</span></label>
                            <div class="studio-custom-select">
                                <div id="cbModeTrigger" class="studio-input" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; height:45px;">
                                    <span id="cbModeLabel">สร้างฟังก์ชันใหม่ทั้งหมด</span>
                                    <i class="fa-solid fa-chevron-down" style="font-size:10px; opacity:0.4;"></i>
                                </div>
                                <div id="cbModeDropdown" class="studio-dropdown-menu">
                                    <div class="studio-dropdown-options custom-scrollbar">
                                        <div class="studio-dropdown-item active" onclick="window.selectStudioMode('full', 'สร้างฟังก์ชันใหม่ทั้งหมด')">
                                            <i class="fa-solid fa-code"></i> สร้างฟังก์ชันใหม่ทั้งหมด
                                        </div>
                                        <div class="studio-dropdown-item" onclick="window.selectStudioMode('call', 'เรียกใช้ฟังก์ชันที่มีอยู่แล้ว')">
                                            <i class="fa-solid fa-phone-volume"></i> เรียกใช้ฟังก์ชันที่มีอยู่แล้ว
                                        </div>
                                        <div class="studio-dropdown-item" onclick="window.selectStudioMode('manual', 'กำหนดเอง (Manual Template)')">
                                            <i class="fa-solid fa-file-code"></i> กำหนดเอง (Manual Template)
                                        </div>
                                    </div>
                                </div>
                                <input type="hidden" id="cbMode" value="full">
                            </div>
                        </div>
                        <div class="studio-field">
                            <label>ประเภทการส่งค่ากลับ <span style="color:var(--danger-color);">*</span></label>
                            <div class="studio-custom-select">
                                <div id="cbReturnTypeTrigger" class="studio-input" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; height:45px;">
                                    <span id="cbReturnTypeLabel">ไม่มีการส่งค่า (Void)</span>
                                    <i class="fa-solid fa-chevron-down" style="font-size:10px; opacity:0.4;"></i>
                                </div>
                                <div id="cbReturnTypeDropdown" class="studio-dropdown-menu">
                                    <div class="studio-dropdown-options custom-scrollbar">
                                        <div class="studio-dropdown-item active" onclick="window.selectStudioReturnType('void', 'ไม่มีการส่งค่า (Void)')">
                                            <i class="fa-solid fa-slash"></i> ไม่มีการส่งค่า (Void)
                                        </div>
                                        <div class="studio-dropdown-item" onclick="window.selectStudioReturnType('Number', 'ตัวเลข (Number)')">
                                            <i class="fa-solid fa-hashtag"></i> ตัวเลข (Number)
                                        </div>
                                        <div class="studio-dropdown-item" onclick="window.selectStudioReturnType('String', 'ข้อความ (String)')">
                                            <i class="fa-solid fa-quote-left"></i> ข้อความ (String)
                                        </div>
                                        <div class="studio-dropdown-item" onclick="window.selectStudioReturnType('Boolean', 'จริง/เท็จ (Boolean)')">
                                            <i class="fa-solid fa-toggle-on"></i> จริง/เท็จ (Boolean)
                                        </div>
                                    </div>
                                </div>
                                <input type="hidden" id="cbReturnType" value="void">
                            </div>
                        </div>
                    </div>

                    <label for="cbIsSetup" id="setup-choice-card" class="studio-role-card" style="display:block; cursor:pointer; margin-top:20px;">
                        <div style="display:flex; align-items:center; gap:15px;">
                            <div class="studio-check-wrapper">
                                <input type="checkbox" id="cbIsSetup">
                                <div class="studio-check-custom"></div>
                            </div>
                            <div style="flex:1;">
                                <div style="font-weight:900; font-size:14px; color:var(--text-main);">บล็อกตั้งค่า (Setup Block)</div>
                                <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">ใช้สำหรับ #include หรือกำหนดค่าเริ่มต้นเพียงครั้งเดียวใน void setup()</div>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            <!-- 📄 STEP 2: IMPLEMENTATION (Moved from Step 3) -->
            <div id="studio-step-2" class="studio-step-panel" style="display:none;">
                <div id="setup-fields" style="display:none;">
                    <div class="studio-field">
                        <label>Header Code (ส่วนหัวไฟล์ / Global)</label>
                        <textarea id="cbHeaderCode" class="studio-textarea" placeholder="#include <Lib.h>"></textarea>
                    </div>
                    <div class="studio-field" style="margin-top:15px;">
                        <label>Setup Code (ใน void setup)</label>
                        <textarea id="cbSetupCode" class="studio-textarea" placeholder="pinMode(1, OUTPUT);"></textarea>
                    </div>
                </div>

                <div id="normal-fields" style="display:none;">
                    <div class="studio-field">
                        <label id="cbMainLabel">โค้ดฟังก์ชัน / รูปแบบฟังก์ชัน <span style="color:var(--danger-color);">*</span></label>
                        <textarea id="cbCode" class="studio-textarea" style="height:320px;"></textarea>
                    </div>
                </div>
            </div>


            <!-- 📄 STEP 3: APPEARANCE & NAMING -->
            <div id="studio-step-3" class="studio-step-panel" style="display:none;">
                <div class="studio-form-card">
                    <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:15px; margin-bottom:20px;">
                        <div class="studio-field">
                            <label id="labelCbName">ชื่อที่แสดงบนบล็อก (Label) <span id="labelAutoHint" style="color:var(--primary-color); font-size:9px; display:none;">(ดึงจากโค้ดให้อัตโนมัติ)</span></label>
                            <input type="text" id="cbName" placeholder="เช่น สั่งให้เดินหน้า" class="studio-input">
                        </div>
                        <div class="studio-field">
                            <label>รูปแบบการจัดวาง (Layout)</label>
                            <div class="studio-custom-select">
                                <div id="cbLayoutTrigger" class="studio-input" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; height:45px;">
                                    <span id="cbLayoutLabel">แนวนอน (Horizontal)</span>
                                    <i class="fa-solid fa-chevron-down" style="font-size:10px; opacity:0.4;"></i>
                                </div>
                                <div id="cbLayoutDropdown" class="studio-dropdown-menu">
                                    <div class="studio-dropdown-options custom-scrollbar">
                                        <div class="studio-dropdown-item active" onclick="window.selectStudioLayout('horizontal', 'แนวนอน (Horizontal)')">
                                            <i class="fa-solid fa-arrows-left-right"></i> แนวนอน (Horizontal)
                                        </div>
                                        <div class="studio-dropdown-item" onclick="window.selectStudioLayout('vertical', 'แนวตั้ง (Vertical)')">
                                            <i class="fa-solid fa-arrows-up-down"></i> แนวตั้ง (Vertical)
                                        </div>
                                    </div>
                                </div>
                                <input type="hidden" id="cbLayout" value="horizontal">
                            </div>
                        </div>
                    </div>

                    <div id="step3-params-container" style="margin-top:20px; display:none; padding: 15px; background:rgba(var(--primary-rgb), 0.05); border-radius:12px; border:1px solid var(--border-light);">
                        <label style="font-size:11px; font-weight:800; color:var(--primary-color); text-transform:uppercase; margin-bottom:10px; display:block;">ตั้งค่าพารามิเตอร์ (Default Values)</label>
                        <div id="params-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:15px; margin-top:20px; align-items:center;">
                        <div class="studio-field">
                            <label>สีของบล็อก (0-360)</label>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <input type="range" id="cbColor" min="0" max="360" value="210" style="flex:1; accent-color:var(--primary-color);">
                                <div id="cbColorPreview" style="width:24px; height:24px; border-radius:6px; background:hsl(210, 70%, 50%); border:2px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.1);"></div>
                            </div>
                        </div>
                        <div class="studio-field">
                            <label>ไอคอนประจำบล็อก</label>
                            <input type="text" id="cbIcon" placeholder="เช่น fa-gear" class="studio-input" style="height:38px;">
                        </div>
                    </div>
                </div>

                <!-- 🎨 Block Preview Section -->
                <div class="studio-form-card" style="margin-top:20px; background:rgba(var(--primary-rgb), 0.02);">
                    <label style="display:block; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:15px;">ตัวอย่างบล็อก (Real Blockly Preview)</label>
                    <div id="studio-block-preview-container" style="width:100%; height:180px; background:var(--bg-panel); border-radius:15px; border:1px dashed var(--border-light); overflow:hidden; position:relative;">
                        <div id="studio-blockly-preview-div" style="width:100%; height:100%;"></div>
                        <div style="position:absolute; top:10px; right:10px; display:flex; flex-direction:column; gap:5px; z-index:10;">
                            <button class="btn-icon-subtle" onclick="window.zoomStudioPreview(1.2)" title="ขยาย" style="background:var(--bg-solid); width:32px; height:32px;"><i class="fa-solid fa-plus"></i></button>
                            <button class="btn-icon-subtle" onclick="window.zoomStudioPreview(0.8)" title="ย่อ" style="background:var(--bg-solid); width:32px; height:32px;"><i class="fa-solid fa-minus"></i></button>
                            <button class="btn-icon-subtle" onclick="window.resetStudioPreview()" title="รีเซ็ตตำแหน่ง" style="background:var(--bg-solid); width:32px; height:32px;"><i class="fa-solid fa-arrows-to-dot"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="studio-footer" style="display:flex; gap:12px; margin-top:35px; border-top:1px solid var(--border-light); padding-top:25px;">
            <button id="btnWizardBack" class="btn" style="flex:1; display:none; height:50px; font-weight:800; border-radius:14px; background:var(--bg-panel); border:1px solid var(--border-light);" onclick="goStudioStep(-1)">ย้อนกลับ</button>
            <button id="btnWizardNext" class="btn primary" style="flex:2.2; display:none; height:50px; font-weight:900; border-radius:14px; box-shadow:0 10px 20px rgba(var(--primary-rgb), 0.2);" onclick="goStudioStep(1)">ขั้นตอนถัดไป <i class="fa-solid fa-arrow-right" style="margin-left:8px; font-size:12px;"></i></button>
            <button id="btnWizardSave" class="btn primary" style="flex:2.2; display:none; height:50px; font-weight:900; border-radius:14px; box-shadow:0 10px 20px rgba(var(--primary-rgb), 0.25);" onclick="parseAndAddCustomBlock()">บันทึกและติดตั้งบล็อก</button>
        </div>


        <style>
            .studio-top-btn { width:42px; height:42px; border-radius:14px; background:var(--bg-panel); border:1px solid var(--border-light); color:var(--text-main); display:flex; align-items:center; justify-content:center; transition:all 0.2s; cursor:pointer; }
            .studio-top-btn:hover { background:var(--bg-hover); transform:translateY(-2px); box-shadow:0 5px 15px rgba(0,0,0,0.05); }
            .studio-list-item:hover { border-color:var(--primary-color); transform:translateX(5px); background:rgba(var(--primary-rgb), 0.02); }
            .studio-primary-btn { width:100%; height:55px; font-weight:900; font-size:16px; border-radius:18px; background:var(--primary-color); color:white; border:none; cursor:pointer; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 12px 28px rgba(var(--primary-rgb), 0.3); }
            .studio-primary-btn:hover { transform:scale(1.02) translateY(-3px); filter:brightness(1.1); box-shadow:0 15px 35px rgba(var(--primary-rgb), 0.4); }
            .studio-field label { display:block; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; height: 14px; }
            .studio-input, .studio-select, .studio-textarea { width:100%; background:var(--bg-panel); border:1px solid var(--border-light); border-radius:12px; padding:12px 15px; color:var(--text-main); font-size:14px; transition:all 0.2s; box-sizing:border-box; outline:none; }
            .studio-input:focus, .studio-select:focus, .studio-textarea:focus { border-color:var(--primary-color); box-shadow:0 0 0 4px rgba(var(--primary-rgb), 0.1); background:var(--bg-solid); }
            .studio-textarea { height:100px; resize:none; font-family:var(--font-code); line-height:1.6; }
            .studio-form-card { background:var(--bg-panel); padding:22px; border-radius:20px; border:1px solid var(--border-light); }
            .studio-role-card { padding:22px; background:rgba(var(--primary-rgb), 0.03); border:1.5px solid rgba(var(--primary-rgb), 0.1); border-radius:20px; margin-bottom:20px; transition:all 0.2s; }
            .studio-role-card:hover { border-color:var(--primary-color); background:rgba(var(--primary-rgb), 0.05); }
            .studio-check-wrapper { position:relative; width:22px; height:22px; }
            .studio-check-wrapper input { opacity:0; width:100%; height:100%; cursor:pointer; position:absolute; z-index:1; }
            .studio-check-custom { position:absolute; top:0; left:0; width:22px; height:22px; background:var(--bg-solid); border:2px solid var(--border-light); border-radius:7px; transition:all 0.2s; }
            .studio-check-wrapper input:checked + .studio-check-custom { background:var(--primary-color); border-color:var(--primary-color); }
            .studio-check-wrapper input:checked + .studio-check-custom::after { content:'\\f00c'; font-family:'Font Awesome 6 Free'; font-weight:900; color:white; font-size:12px; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); }
            
            /* ✨ Drag & Drop Enhancements (Gap Placeholder) */
            .studio-list-item { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
            .studio-list-item.dragging { opacity: 0.2; transform: scale(0.95); }
            
            .studio-list-item.drag-over-top { margin-top: 75px !important; }
            .studio-list-item.drag-over-top::before {
                content: 'วางตรงนี้';
                position: absolute;
                top: -63px;
                left: 0;
                right: 0;
                height: 55px;
                border: 2px dashed var(--primary-color);
                border-radius: 16px;
                background: rgba(var(--primary-rgb), 0.05);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 800;
                color: var(--primary-color);
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .studio-list-item.drag-over-bottom { margin-bottom: 75px !important; }
            .studio-list-item.drag-over-bottom::after {
                content: 'วางตรงนี้';
                position: absolute;
                bottom: -63px;
                left: 0;
                right: 0;
                height: 55px;
                border: 2px dashed var(--primary-color);
                border-radius: 16px;
                background: rgba(var(--primary-rgb), 0.05);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 800;
                color: var(--primary-color);
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            /* 🔥 Fix Back Button Hover Contrast */
            #btnWizardBack:hover { background:var(--bg-hover) !important; color:var(--text-main) !important; border-color:var(--primary-color) !important; }
            
            .btn-icon-subtle { padding:8px; border-radius:10px; border:none; background:transparent; color:var(--text-muted); cursor:pointer; transition:all 0.2s; }
            .btn-icon-subtle:hover { background:rgba(0,0,0,0.05); color:var(--text-main); }
            .btn-icon-subtle.danger:hover { color:var(--danger-color); background:rgba(255,0,0,0.05); }
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 10px; }

            /* ✨ Premium Custom Dropdown */
            .studio-custom-select { position: relative; width: 100%; }
            .studio-dropdown-menu { 
                position: absolute; top: 45px; margin-top: 8px; left: 0; right: 0; 
                background: var(--bg-solid); border: 1px solid var(--border-light); 
                border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); 
                z-index: 1000; display: none; overflow: hidden;
                animation: slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            
            .studio-dropdown-search { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-light); background: rgba(var(--primary-rgb), 0.02); }
            .studio-dropdown-search i { color: var(--text-muted); font-size: 12px; margin-right: 10px; }
            .studio-dropdown-search input { background: transparent; border: none; outline: none; color: var(--text-main); font-size: 13px; width: 100%; }
            
            .studio-dropdown-options { max-height: 200px; overflow-y: auto; padding: 8px; }
            .studio-dropdown-item { 
                padding: 10px 15px; border-radius: 10px; font-size: 13px; color: var(--text-main); 
                cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px;
                position: relative; z-index: 1002;
            }
            .studio-dropdown-item:hover { background: rgba(var(--primary-rgb), 0.1); color: var(--primary-color); }
            .studio-dropdown-item.active { background: var(--primary-color); color: white; }
            .studio-dropdown-item i { font-size: 12px; opacity: 0.6; }

            /* 🛡️ Fix clipping in Swal */
            .swal2-html-container { overflow: visible !important; }
            .studio-step-panel { padding-bottom: 20px; }
        </style>
        `,
        width: '560px',
        showConfirmButton: false,
        showCloseButton: true,
        background: 'var(--bg-solid)',
        color: 'var(--text-main)',
        padding: '2.2rem',
        didOpen: () => {
            window.goStudioStep = (dir) => {
                // 🧼 Clear any previous validation messages
                if (typeof Swal.resetValidationMessage === 'function') Swal.resetValidationMessage();

                const category = document.getElementById('cbCategory').value.trim();
                const isSetup = document.getElementById('cbIsSetup').checked;
                const code = document.getElementById('cbCode').value.trim();

                // 🛡️ Step 1 Validation: Category is mandatory
                if (window.studioStep === 1 && dir === 1 && !category) {
                    return Swal.showValidationMessage("โปรดเลือกหมวดหมู่บล็อกก่อนไปขั้นตอนถัดไปครับ");
                }

                // 🛡️ Step 2 Validation: Code and Duplicate Signature Check
                if (window.studioStep === 2 && dir === 1) {
                    if (!isSetup && !code) {
                        return Swal.showValidationMessage("โปรดใส่โค้ดการทำงานของบล็อกในส่วนนี้ก่อนครับ");
                    }

                    // 🛡️ Rule: Strict Function Signature Check (Redefinition Guard) - EARLY CHECK
                    if (!isSetup) {
                        let parsedName = "";
                        let args = [];
                        const mode = document.getElementById('cbMode').value;

                        if (mode === 'full') {
                            let cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
                            // 🔍 Find all functions and pick the LAST one (usually the main interface)
                            let matches = [...cleanCode.matchAll(/(\S+)\s+([a-zA-Z0-9_:]+)\s*\(([^)]*)\)\s*\{/g)];
                            if (matches.length > 0) {
                                let bestMatch = matches[matches.length - 1];
                                parsedName = bestMatch[2];
                                args = parseArgString(bestMatch[3]);
                            } else {
                                return Swal.showValidationMessage("รูปแบบผิดพลาด: ไม่พบฟังก์ชันที่ถูกต้องในโค้ดครับ");
                            }
                        } else {
                            let cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
                            let match = cleanCode.match(/([a-zA-Z0-9_:]+)\s*\(([^)]*)\)/);
                            if (match) {
                                parsedName = match[1];
                                args = parseArgString(match[2]);
                            }
                        }

                        if (parsedName && mode === 'full') {
                            const conflict = window.customBlocksData.find(cb => {
                                if (cb.id === window.editingBlockId || cb.isSetup || !cb.funcName) return false;
                                if (cb.funcName !== parsedName) return false;
                                
                                const cbArgs = cb.args || [];
                                if (cbArgs.length !== args.length) return false;
                                for (let i = 0; i < args.length; i++) {
                                    if (args[i].type !== cbArgs[i].type) return false;
                                }
                                return true;
                            });

                            if (conflict) {
                                // 💾 Capture current state to restore after alert
                                const currentState = {
                                    category: document.getElementById('cbCategory').value,
                                    categoryLabel: document.getElementById('cbCategoryLabel').innerText,
                                    isSetup: document.getElementById('cbIsSetup').checked,
                                    mode: document.getElementById('cbMode').value,
                                    modeLabel: document.getElementById('cbModeLabel').innerText,
                                    returnType: document.getElementById('cbReturnType').value,
                                    returnTypeLabel: document.getElementById('cbReturnTypeLabel').innerText,
                                    name: document.getElementById('cbName').value,
                                    headerCode: document.getElementById('cbHeaderCode').value,
                                    setupCode: document.getElementById('cbSetupCode').value,
                                    code: document.getElementById('cbCode').value,
                                    color: document.getElementById('cbColor').value,
                                    icon: document.getElementById('cbIcon').value,
                                    step: 2,
                                    editingBlockId: window.editingBlockId,
                                    tempStudioCategory: window.tempStudioCategory
                                };

                                Swal.fire({
                                    icon: "error",
                                    title: "ฟังก์ชันซ้ำซ้อน!",
                                    html: `ตรวจพบฟังก์ชันชื่อ <code style="color:var(--danger-color)">${parsedName}</code> ที่มีพารามิเตอร์เหมือนกันในหมวดหมู่ <b>"${conflict.category}"</b><br><br>C++ ไม่อนุญาตให้สร้างฟังก์ชันที่มี Signature ซ้ำกันครับ`,
                                    confirmButtonText: 'ตกลง ฉันจะแก้ไข',
                                    background: 'var(--bg-solid)',
                                    color: 'var(--text-main)',
                                }).then(() => {
                                    window.editingBlockId = currentState.editingBlockId;
                                    openCustomBlockManager(currentState);
                                });
                                return; // Stay at Step 2
                            }
                        }
                    }
                }
                
                // 🔄 RESET Logic when starting fresh from Step 0
                if (window.studioStep === 0 && dir === 1 && !window.editingBlockId) {
                    window.tempStudioCategory = null;
                    document.getElementById('cbCategory').value = "";
                    document.getElementById('cbCategoryLabel').innerText = "-- เลือกหมวดหมู่บล็อก --";
                    document.getElementById('cbCategoryLabel').style.opacity = "0.6";
                    document.getElementById('cbName').value = "";
                    document.getElementById('cbIsSetup').checked = false;
                    
                    // Reset Mode
                    document.getElementById('cbMode').value = "full";
                    document.getElementById('cbModeLabel').innerText = "สร้างฟังก์ชันใหม่ทั้งหมด";
                    
                    // Reset Return Type
                    document.getElementById('cbReturnType').value = "void";
                    document.getElementById('cbReturnTypeLabel').innerText = "ไม่มีการส่งค่า (Void)";

                    document.getElementById('cbHeaderCode').value = "";
                    document.getElementById('cbSetupCode').value = "";
                    document.getElementById('cbCode').value = "";
                    document.getElementById('cbColor').value = 210;
                    document.getElementById('cbIcon').value = "";
                    if(document.getElementById('cbColorPreview')) document.getElementById('cbColorPreview').style.background = `hsl(210, 70%, 50%)`;
                }

                window.studioStep += dir;
                
                // 🧹 CLEANUP Logic when returning to Dashboard
                if (window.studioStep <= 0) {
                    window.studioStep = 0;
                    window.editingBlockId = null;
                }

                updateWizardUI();
            };

            window.validateStudioParam = (el) => {
                const type = el.getAttribute('data-type').toLowerCase().trim();
                const val = el.value;
                let error = "";
                
                const isUnsigned = /byte|uint|unsigned/.test(type);
                const isInteger = /int|long|short|byte|uint/.test(type);
                const isFloat = /float|double/.test(type);

                if (isInteger) {
                    if (/[^0-9\-]/.test(val)) error = "ต้องเป็นจำนวนเต็มเท่านั้น (ตัวเลข 0-9)";
                    if (isUnsigned && val.includes('-')) error = "ประเภทนี้ห้ามมีค่าติดลบ";
                } else if (isFloat) {
                    if (/[^0-9\.\-]/.test(val)) error = "ต้องเป็นตัวเลขทศนิยมที่ถูกต้อง";
                } else if (type === 'bool' || type === 'boolean') {
                    const v = val.toLowerCase();
                    if (!['0', '1', 'true', 'false', ''].includes(v)) error = "ต้องเป็น true, false, 0 หรือ 1 เท่านั้น";
                }

                // 🎨 Visual Feedback
                if (error) {
                    el.classList.add('studio-input-error');
                    el.style.borderColor = "var(--danger-color)";
                    el.title = error; 
                    
                    let parent = el.parentElement;
                    let icon = parent.querySelector('.studio-error-icon');
                    if (!icon) {
                        icon = document.createElement('i');
                        icon.className = 'fa-solid fa-circle-exclamation studio-error-icon';
                        // 📏 Position it at the end of the input inside its wrapper
                        icon.style.cssText = 'position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--danger-color); font-size:14px; pointer-events:auto; cursor:help; z-index:10;';
                        parent.appendChild(icon);
                    }
                    icon.title = error;
                } else {
                    el.classList.remove('studio-input-error');
                    el.style.borderColor = "";
                    el.title = "";
                    let icon = el.parentElement.querySelector('.studio-error-icon');
                    if (icon) icon.remove();
                }
            };

            window.addNewCategoryPrompt = () => {
                const selContainer = document.getElementById('category-select-wrapper');
                const addContainer = document.getElementById('category-add-wrapper');
                selContainer.style.display = 'none';
                addContainer.style.display = 'flex';
                document.getElementById('newCategoryName').focus();
            };

            window.confirmNewCategory = () => {
                const name = document.getElementById('newCategoryName').value.trim();
                if (!name) return;
                
                window.tempStudioCategory = name; // Remember this temporarily

                // Update hidden input and label
                document.getElementById('cbCategory').value = name;
                document.getElementById('cbCategoryLabel').innerText = name;
                document.getElementById('cbCategoryLabel').style.opacity = "1";
                
                window.cancelNewCategory();
                updateWizardUI();
            };

            // 🧊 Custom Dropdown Logic
            const trigger = document.getElementById('cbCategoryTrigger');
            const dropdown = document.getElementById('cbCategoryDropdown');
            const optionsList = document.getElementById('cbCategoryOptions');
            const searchInput = document.getElementById('cbCategorySearch');
            const hiddenInput = document.getElementById('cbCategory');
            const label = document.getElementById('cbCategoryLabel');

            const renderCategories = (filter = "") => {
                let categories = Array.from(new Set((window.customBlocksData || []).map(b => b.category)));
                
                // 📂 Merge with temporary category if exists
                if (window.tempStudioCategory && !categories.includes(window.tempStudioCategory)) {
                    categories.push(window.tempStudioCategory);
                }

                optionsList.innerHTML = categories
                    .filter(cat => cat && cat.toLowerCase().includes(filter.toLowerCase()))
                    .map(cat => `
                        <div class="studio-dropdown-item ${hiddenInput.value === cat ? 'active' : ''}" onclick="window.selectStudioCategory('${cat.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-folder"></i> ${cat}
                        </div>
                    `).join('');
                
                if (optionsList.innerHTML === "") {
                    optionsList.innerHTML = `<div style="padding:20px; text-align:center; font-size:12px; color:var(--text-muted);">ไม่พบหมวดหมู่</div>`;
                }
            };

            window.selectStudioCategory = (val) => {
                // 🧠 Forget temporary category if user picks something else
                if (window.tempStudioCategory && val !== window.tempStudioCategory) {
                    window.tempStudioCategory = null;
                }

                hiddenInput.value = val;
                label.innerText = val;
                label.style.opacity = "1";
                dropdown.style.display = 'none';
                updateWizardUI();
            };

            // 🛠️ Reusable Dropdown Toggle
            const setupCustomDropdown = (triggerId, dropdownId) => {
                const trigger = document.getElementById(triggerId);
                const dropdown = document.getElementById(dropdownId);
                if (!trigger || !dropdown) return;
                trigger.onclick = (e) => {
                    e.stopPropagation();
                    const isOpen = dropdown.style.display === 'block';
                    
                    // 🛡️ Close others and reset z-index to prevent "piercing"
                    document.querySelectorAll('.studio-dropdown-menu').forEach(d => d.style.display = 'none');
                    document.querySelectorAll('.studio-custom-select').forEach(s => s.style.zIndex = '1');
                    
                    if (!isOpen) {
                        dropdown.style.display = 'block';
                        trigger.parentElement.style.zIndex = '1001'; // Bring the current dropdown to front
                        
                        if (triggerId === 'cbCategoryTrigger') {
                            renderCategories();
                            searchInput.value = "";
                            setTimeout(() => searchInput.focus(), 100);
                        }
                    } else {
                        dropdown.style.display = 'none';
                        trigger.parentElement.style.zIndex = '1';
                    }
                };
            };

            setupCustomDropdown('cbCategoryTrigger', 'cbCategoryDropdown');
            setupCustomDropdown('cbModeTrigger', 'cbModeDropdown');
            setupCustomDropdown('cbReturnTypeTrigger', 'cbReturnTypeDropdown');
            setupCustomDropdown('cbLayoutTrigger', 'cbLayoutDropdown');

            window.selectStudioLayout = (val, labelText) => {
                document.getElementById('cbLayout').value = val;
                document.getElementById('cbLayoutLabel').innerText = labelText;
                document.getElementById('cbLayoutDropdown').style.display = 'none';
                document.querySelectorAll('#cbLayoutDropdown .studio-dropdown-item').forEach(item => {
                    item.classList.toggle('active', item.innerText.includes(labelText));
                });
                if (typeof updateWizardUI === 'function') updateWizardUI();
            };

            window.selectStudioMode = (val, labelText) => {
                document.getElementById('cbMode').value = val;
                document.getElementById('cbModeLabel').innerText = labelText;
                document.getElementById('cbModeDropdown').style.display = 'none';
                
                // Update active state in UI
                document.querySelectorAll('#cbModeDropdown .studio-dropdown-item').forEach(item => {
                    item.classList.toggle('active', item.innerText.includes(labelText));
                });

                updateWizardUI();
            };

            window.selectStudioReturnType = (val, labelText) => {
                document.getElementById('cbReturnType').value = val;
                document.getElementById('cbReturnTypeLabel').innerText = labelText;
                document.getElementById('cbReturnTypeDropdown').style.display = 'none';

                // Update active state in UI
                document.querySelectorAll('#cbReturnTypeDropdown .studio-dropdown-item').forEach(item => {
                    item.classList.toggle('active', item.innerText.includes(labelText));
                });

                updateWizardUI();
            };

            const isStudioNameDuplicate = (name, category, excludeId = null) => {
                return (window.customBlocksData || []).some(b => 
                    b.name === name && 
                    b.category === category && 
                    b.id !== excludeId
                );
            };

            const getUniqueStudioName = (baseName, category, excludeId = null) => {
                if (!isStudioNameDuplicate(baseName, category, excludeId)) return baseName;
                let counter = 1;
                while (isStudioNameDuplicate(`${baseName}_B${counter}`, category, excludeId)) {
                    counter++;
                }
                return `${baseName}_B${counter}`;
            };

            searchInput.oninput = (e) => renderCategories(e.target.value);

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                document.querySelectorAll('.studio-dropdown-menu').forEach(d => d.style.display = 'none');
                document.querySelectorAll('.studio-custom-select').forEach(s => s.style.zIndex = '1');
            });

            // 🔄 Restore state if provided
            if (restoredState) {
                window.editingBlockId = restoredState.editingBlockId || null;
                document.getElementById('cbCategory').value = restoredState.category || "";
                document.getElementById('cbCategoryLabel').innerText = restoredState.categoryLabel || "-- เลือกหมวดหมู่บล็อก --";
                document.getElementById('cbCategoryLabel').style.opacity = restoredState.categoryLabel ? "1" : "0.6";
                document.getElementById('cbIsSetup').checked = !!restoredState.isSetup;
                document.getElementById('cbMode').value = restoredState.mode || "full";
                document.getElementById('cbModeLabel').innerText = restoredState.modeLabel || "สร้างฟังก์ชันใหม่ทั้งหมด";
                document.getElementById('cbReturnType').value = restoredState.returnType || "void";
                document.getElementById('cbReturnTypeLabel').innerText = restoredState.returnTypeLabel || "ไม่มีการส่งค่า (Void)";
                document.getElementById('cbName').value = restoredState.name || "";
                document.getElementById('cbHeaderCode').value = restoredState.headerCode || "";
                document.getElementById('cbSetupCode').value = restoredState.setupCode || "";
                document.getElementById('cbCode').value = restoredState.code || "";
                document.getElementById('cbColor').value = restoredState.color || 210;
                document.getElementById('cbIcon').value = restoredState.icon || "";
                
                if(document.getElementById('cbColorPreview')) {
                    document.getElementById('cbColorPreview').style.background = `hsl(${restoredState.color || 210}, 70%, 50%)`;
                }
                window.studioStep = restoredState.step || 0;
            }

            window.cancelNewCategory = () => {
                document.getElementById('category-select-wrapper').style.display = 'flex';
                document.getElementById('category-add-wrapper').style.display = 'none';
                document.getElementById('newCategoryName').value = '';
            };

            window.updateWizardUI = () => {
                // 🔍 Capture current values before re-rendering (prevents data loss on layout change)
                document.querySelectorAll('.param-default-input').forEach(inp => {
                    const pIdx = inp.getAttribute('data-idx');
                    if (pIdx !== null) {
                        if (!window.studioParamMetadata) window.studioParamMetadata = {};
                        window.studioParamMetadata[pIdx] = window.studioParamMetadata[pIdx] || {};
                        window.studioParamMetadata[pIdx].defaultVal = inp.value;
                        window.studioParamMetadata[pIdx].inputType  = inp.dataset.inputType || window.studioParamMetadata[pIdx].inputType;
                        window.studioParamMetadata[pIdx].options    = inp.dataset.options   || window.studioParamMetadata[pIdx].options;
                    }
                });

                if (typeof Swal.resetValidationMessage === 'function') Swal.resetValidationMessage();
                
                const cat = document.getElementById('cbCategory').value.trim();
                const isSetup = document.getElementById('cbIsSetup').checked;
                const mode = document.getElementById('cbMode').value;
                const codeValue = document.getElementById('cbCode').value.trim();
                const nameInput = document.getElementById('cbName');
                const autoHint = document.getElementById('labelAutoHint');
                
                // Panels visibility
                document.querySelectorAll('.studio-step-panel').forEach((p, i) => p.style.display = (i === window.studioStep ? 'block' : 'none'));
                document.getElementById('wizard-flow').style.display = (window.studioStep > 0 ? 'block' : 'none');
                
                if (window.studioStep === 1) {
                    const setupCard = document.getElementById('setup-choice-card');
                    const modeReturnFields = document.getElementById('mode-return-fields');
                    if (modeReturnFields) modeReturnFields.style.display = isSetup ? 'none' : 'grid';

                    if (setupCard) {
                        const hasSetup = cat ? (window.customBlocksData || []).some(b => b.category === cat && b.isSetup && b.id !== window.editingBlockId) : false;
                        if (!cat || hasSetup) {
                            setupCard.style.display = 'none';
                            if (hasSetup) document.getElementById('cbIsSetup').checked = false;
                        } else {
                            setupCard.style.display = 'block';
                        }
                    }
                }

                if (window.studioStep > 0) {
                    document.getElementById('current-step-num').innerText = window.studioStep;
                    for(let i=1; i<=3; i++) {
                        const pb = document.getElementById(`pb-${i}`);
                        if (pb) {
                            pb.style.background = (i <= window.studioStep ? 'var(--primary-color)' : 'var(--border-light)');
                            pb.style.opacity = (i <= window.studioStep ? '1' : '0.4');
                        }
                    }
                }

                if (window.studioStep === 2) {
                    const setupFields = document.getElementById('setup-fields');
                    const normalFields = document.getElementById('normal-fields');
                    const codeArea = document.getElementById('cbCode');
                    
                    if (isSetup) {
                        setupFields.style.display = 'block';
                        normalFields.style.display = 'none'; 
                    } else {
                        setupFields.style.display = 'none';
                        normalFields.style.display = 'block';

                        if (mode === 'full') {
                            codeArea.placeholder = "void myFunctionName(int arg1, String arg2) {\n  // เขียนโค้ดที่ต้องการให้ทำงานในส่วนนี้\n}";
                        } else if (mode === 'call') {
                            codeArea.placeholder = "myFunctionName(arg1, arg2)";
                        } else {
                            codeArea.placeholder = "analogWrite({0}, {1});";
                        }
                    }
                    
                    const mainLabel = document.getElementById('cbMainLabel');
                    if (mainLabel) mainLabel.innerHTML = isSetup ? 'Setup Logic (Optional)' : 'โค้ดฟังก์ชัน / รูปแบบฟังก์ชัน <span style="color:var(--danger-color);">*</span>';
                }

                if (window.studioStep === 3) {
                    let extractedName = "";
                    let args = [];

                    if (!isSetup) {
                        let cleanCode = codeValue.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
                        if (mode === 'full') {
                            let matches = [...cleanCode.matchAll(/(\S+)\s+([a-zA-Z0-9_:]+)\s*\(([^)]*)\)\s*\{/g)];
                            if (matches.length > 0) {
                                let bestMatch = matches[matches.length - 1];
                                extractedName = bestMatch[2];
                                args = parseArgString(bestMatch[3]);
                            }
                        } else if (mode === 'call') {
                            let match = cleanCode.match(/([a-zA-Z0-9_:]+)\s*\(([^)]*)\)/);
                            if (match) {
                                extractedName = match[1];
                                args = parseArgString(match[2]);
                            }
                        }
                        
                        nameInput.disabled = true;
                        const prevAutoName = nameInput.getAttribute('data-auto-name');
                        if (nameInput.value === "" || nameInput.value === "\u0e23\u0e30\u0e1a\u0e1a\u0e08\u0e30\u0e15\u0e31\u0e49\u0e07\u0e0a\u0e37\u0e48\u0e2d\u0e43\u0e2b\u0e49\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34" || nameInput.value.includes("\u0e01\u0e23\u0e38\u0e13\u0e32\u0e43\u0e2a\u0e48\u0e42\u0e04\u0e49\u0e14") || nameInput.value === prevAutoName) {
                            let baseName = extractedName || "\u0e1a\u0e25\u0e47\u0e2d\u0e01\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e40\u0e2d\u0e07";
                            let finalName = getUniqueStudioName(baseName, cat, window.editingBlockId);
                            nameInput.value = finalName;
                            nameInput.setAttribute('data-auto-name', finalName);
                        }
                        nameInput.style.opacity = "0.6";
                        if (autoHint) {
                            autoHint.style.display = "inline";
                            autoHint.innerText = "(\u0e14\u0e36\u0e07\u0e08\u0e32\u0e01\u0e42\u0e04\u0e49\u0e14\u0e43\u0e2b\u0e49\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34)";
                        }
                    } else {
                        nameInput.disabled = false;
                        nameInput.style.opacity = "1";
                        if (autoHint) autoHint.style.display = "none";
                    }

                    // ✨ Real Blockly Preview
                    window.zoomStudioPreview = (amount) => {
                        if (!window.studioPreviewWorkspace) return;
                        const ws = window.studioPreviewWorkspace;
                        const metrics = ws.getMetrics();
                        ws.zoom(metrics.viewWidth / 2, metrics.viewHeight / 2, amount > 1 ? 1 : -1);
                    };

                    window.renderPreview = () => {
                        const previewDiv = document.getElementById('studio-blockly-preview-div');
                        if (!previewDiv || typeof Blockly === 'undefined') return;

                        // 🔄 Self-retry until div has actual size (waits for Swal animation)
                        if (previewDiv.offsetWidth === 0 || previewDiv.offsetHeight === 0) {
                            setTimeout(window.renderPreview, 80);
                            return;
                        }

                        // Track if we are creating the workspace fresh this call
                        let wasNewWorkspace = !window.studioPreviewWorkspace;
                        
                        // 🔥 CRITICAL FIX: If the div is empty but we have a workspace, the DOM was recreated by Swal!
                        if (window.studioPreviewWorkspace && previewDiv.childNodes.length === 0) {
                            try { window.studioPreviewWorkspace.dispose(); } catch(e) {}
                            window.studioPreviewWorkspace = null;
                            wasNewWorkspace = true;
                        }

                        if (!window.studioPreviewWorkspace) {
                            previewDiv.innerHTML = ''; // 🧹 Clear residual SVG from previous dispose
                            window.studioPreviewWorkspace = Blockly.inject('studio-blockly-preview-div', {
                                readOnly: true,
                                move: { scrollbars: true, drag: true, wheel: true },
                                zoom: { controls: false, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 }
                            });
                        }
                        
                        const ws = window.studioPreviewWorkspace;
                        Blockly.svgResize(ws);
                        const scrollX = ws.scrollX || 0;
                        const scrollY = ws.scrollY || 0;
                        const currentScale = ws.scale || 1.0;

                        Blockly.Events.disable();
                        try {
                            ws.clear();
                            const blockName = (document.getElementById('cbName').value || "My Block").trim();
                            const blockColor = document.getElementById('cbColor').value || 210;
                            const blockIcon = (document.getElementById('cbIcon').value || "fa-cube").trim();
                            const retType = document.getElementById('cbReturnType').value;
                            const layout = document.getElementById('cbLayout').value;
                            const isValueBlock = retType !== 'void';
                            const isInline = layout !== 'vertical';

                            const paramInputs = document.querySelectorAll('.param-default-input');
                            const previewArgs = args.map((a, i) => {
                                const inp = Array.from(paramInputs).find(p => parseInt(p.dataset.idx) === i);
                                let inputType = "field_input";
                                let options = "";
                                let defaultVal = a.defaultVal || (a.type === 'String' ? '""' : '0');

                                // 1. Check Metadata (Session state)
                                if (window.studioParamMetadata && window.studioParamMetadata[i]) {
                                    inputType = window.studioParamMetadata[i].inputType || inputType;
                                    options = window.studioParamMetadata[i].options || options;
                                    if (window.studioParamMetadata[i].defaultVal !== undefined) {
                                        defaultVal = window.studioParamMetadata[i].defaultVal;
                                    }
                                } else if (inp) {
                                    inputType = inp.dataset.inputType || inputType;
                                    options = inp.dataset.options || options;
                                }

                                // 2. 🔥 LIVE OVERRIDE: Use current DOM value if Step 3 is active
                                if (inp) {
                                    defaultVal = inp.value;
                                }

                                return { name: a.name, type: a.type, inputType, options, defaultVal };
                            });

                            const blockId = "studio_preview_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
                            const jsonDef = {
                                "type": blockId, "message0": `${blockName.replace(/%/g, '%%')} %1`, 
                                "args0": [{ "type": "field_label", "text": "", "class": `fa-solid ${blockIcon}` }],
                                "colour": parseInt(blockColor), "inputsInline": isInline, "tooltip": "", "helpUrl": ""
                            };
                            if (isValueBlock) jsonDef.output = retType;
                            else { jsonDef.previousStatement = null; jsonDef.nextStatement = null; }

                            previewArgs.forEach((arg, i) => {
                                // Prepare Argument Definition
                                let argDef;
                                if (arg.inputType === 'field_dropdown' && arg.options) {
                                    try {
                                        const opts = arg.options.split(',').filter(o => o.trim()).map(o => {
                                            const p = o.split(':');
                                            return [(p[0] || "Option").trim(), (p[1] || p[0] || "val").trim()];
                                        });
                                        if (opts.length === 0) opts.push(["Option", "val"]);
                                        argDef = { "type": "field_dropdown", "name": arg.name, "options": opts };
                                    } catch (e) { argDef = { "type": "field_input", "name": arg.name, "text": "Error" }; }
                                } else {
                                    argDef = { "type": "field_input", "name": arg.name, "text": (arg.defaultVal || "0").trim() };
                                }

                                if (isInline) {
                                    // Horizontal: Append to message0
                                    const pIdx = i + 2; 
                                    jsonDef.message0 += `  ${arg.name.replace(/%/g, '%%')} %${pIdx}`;
                                    jsonDef.args0.push(argDef);
                                } else {
                                    // Vertical: New row (messageX) for each argument
                                    const msgIdx = i + 1;
                                    jsonDef[`message${msgIdx}`] = `${arg.name.replace(/%/g, '%%')} %1`;
                                    jsonDef[`args${msgIdx}`] = [ argDef ];
                                }
                            });

                            let blockCreated = false;
                            try {
                                Blockly.defineBlocksWithJsonArray([jsonDef]);
                                const block = ws.newBlock(blockId);

                                // 🎯 Sync field values with the selected defaultVal (dropdowns & inputs)
                                previewArgs.forEach(arg => {
                                    const field = block.getField(arg.name);
                                    if (field) {
                                        try { field.setValue(arg.defaultVal); } catch(e) {}
                                    }
                                });

                                // 🎯 Center and Fit the block in the preview window
                                block.initSvg(); 
                                block.render();
                                
                                // Small delay to ensure render is complete before zoomToFit
                                setTimeout(() => {
                                    if (!window.studioPreviewWorkspace) return;
                                    const ws = window.studioPreviewWorkspace;
                                    Blockly.svgResize(ws);
                                    ws.scrollCenter();
                                    ws.zoomToFit();
                                    if (ws.getScale() > 1.1) ws.setScale(1.1);
                                }, 150); // Increased delay for smoother layout

                                blockCreated = true;
                                window.resetStudioPreview = () => {
                                    if (!window.studioPreviewWorkspace) return;
                                    const ws = window.studioPreviewWorkspace;
                                    try {
                                        Blockly.svgResize(ws);
                                        ws.scrollCenter();
                                        ws.zoomToFit();
                                        if (ws.getScale() > 1.1) ws.setScale(1.1);
                                    } catch(e) {}
                                };
                            } catch (err) { 
                                console.error("Blockly JSON Def:", JSON.stringify(jsonDef, null, 2));
                                console.error("Blockly error:", err); 
                                previewDiv.innerHTML = `<div style="padding:20px; color:red; font-weight:bold;">Blockly Error: ${err.message}</div>`;
                            }

                            if (wasNewWorkspace || !window.studioPreviewInitialized) {
                                if (window.resetStudioPreview) window.resetStudioPreview();
                                window.studioPreviewInitialized = true;
                            } else {
                                // On update: if block created, preserve scroll; if failed, reset view
                                if (blockCreated && ws.getTopBlocks().length > 0) {
                                    ws.setScale(currentScale);
                                    ws.scroll(scrollX, scrollY);
                                } else if (window.resetStudioPreview) {
                                    window.resetStudioPreview();
                                }
                            }
                        } catch (err) { 
                            console.error("Critical Preview Error:", err); 
                        } finally { 
                            Blockly.Events.enable(); 
                        }
                    };

                    renderPreview(); // self-retries if div not ready
                    document.getElementById('cbName').oninput = renderPreview;
                    document.getElementById('cbIcon').oninput = renderPreview;

                    const paramsContainer = document.getElementById('step3-params-container');
                    const paramsList = document.getElementById('params-list');
                    if (paramsContainer && paramsList) {
                        if (args.length > 0 && !isSetup) {
                            paramsContainer.style.display = 'block';
                            paramsList.innerHTML = args.map((arg, idx) => {
                                let inputType = arg.inputType || "field_input";
                                let options = arg.options || "";
                                let defaultVal = arg.defaultVal || (arg.type === 'String' ? '""' : '0');

                                // 🚀 Priority: Metadata (Current Session) > Saved Block > Code Parsing
                                if (window.studioParamMetadata && window.studioParamMetadata[idx]) {
                                    inputType = window.studioParamMetadata[idx].inputType || inputType;
                                    options = window.studioParamMetadata[idx].options || options;
                                    if (window.studioParamMetadata[idx].defaultVal !== undefined) {
                                        defaultVal = window.studioParamMetadata[idx].defaultVal;
                                    }
                                } else if (window.editingBlockId) {
                                    const cb = (window.customBlocksData || []).find(b => b.id === window.editingBlockId);
                                    if (cb && cb.args && cb.args[idx] && cb.args[idx].name === arg.name) {
                                        inputType = cb.args[idx].inputType || inputType;
                                        options = cb.args[idx].options || options;
                                        defaultVal = cb.args[idx].defaultVal || defaultVal;
                                    }
                                }

                                const isDropdown = inputType === 'field_dropdown';
                                const parsedOptions = options.split(',').filter(o => o.trim()).map(o => {
                                    const p = o.split(':');
                                    return { label: p[0].trim(), value: (p[1] || p[0]).trim() };
                                });

                                return `
                                    <div style="display:flex; flex-direction:column; gap:5px; padding:10px; background:rgba(var(--primary-rgb), 0.03); border-radius:12px; border:1px solid var(--border-light);">
                                        <div style="display:flex; align-items:center; gap:12px;">
                                            <div style="flex:1; font-size:12px; font-weight:800; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                                ${arg.name} <span style="opacity:0.5; font-weight:600; font-size:10px;">(${arg.type})</span>
                                            </div>
                                            <div style="display:flex; align-items:center; gap:8px; flex:1.5;">
                                                ${isDropdown && parsedOptions.length > 0 ? `
                                                    <select class="studio-input param-default-input" 
                                                            data-idx="${idx}" data-name="${arg.name}" data-type="${arg.type}" 
                                                            data-input-type="${inputType}" data-options="${options.replace(/"/g, '&quot;')}" 
                                                            style="height:35px; font-size:12px; padding:0 10px;">
                                                        <option value="" ${!String(defaultVal).trim() ? 'selected' : ''}>-- ไม่เลือก --</option>
                                                        ${parsedOptions.map(opt => `<option value="${opt.value}" ${String(opt.value).trim() === String(defaultVal).trim() ? 'selected' : ''}>${opt.label}</option>`).join('')}
                                                    </select>
                                                ` : `
                                                    <input type="text" class="studio-input param-default-input" 
                                                            data-idx="${idx}" data-name="${arg.name}" data-type="${arg.type}" 
                                                            data-input-type="${inputType}" data-options="${options.replace(/"/g, '&quot;')}"
                                                            value="${defaultVal}" oninput="window.validateStudioParam(this); renderPreview();"
                                                            placeholder="ค่าเริ่มต้น" style="height:35px; font-size:12px; padding:0 10px; width:100%;">
                                                `}
                                                <button class="btn-icon-subtle" onclick="window.configureStudioParam(${idx})" title="ตั้งค่าตัวเลือก" style="width:35px; height:35px; background:var(--primary-color); color:white; border-radius:10px;">
                                                    <i class="fa-solid ${isDropdown ? 'fa-list-check' : 'fa-plus'}"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                            document.querySelectorAll('.param-default-input').forEach(inp => { 
                                const updateFn = (e) => {
                                    const pIdx = e.target.getAttribute('data-idx');
                                    if (pIdx !== null) {
                                        if (!window.studioParamMetadata) window.studioParamMetadata = {};
                                        window.studioParamMetadata[pIdx] = window.studioParamMetadata[pIdx] || {};
                                        window.studioParamMetadata[pIdx].defaultVal = e.target.value;
                                        window.studioParamMetadata[pIdx].inputType  = e.target.dataset.inputType || window.studioParamMetadata[pIdx].inputType;
                                        window.studioParamMetadata[pIdx].options    = e.target.dataset.options   || window.studioParamMetadata[pIdx].options;
                                    }
                                    renderPreview();
                                };
                                inp.oninput = updateFn;
                                inp.onchange = updateFn;
                            });
                        } else { paramsContainer.style.display = 'none'; }
                    }

                    const colorRange = document.getElementById('cbColor');
                    const colorPreview = document.getElementById('cbColorPreview');
                    if (colorRange && colorPreview) {
                        colorPreview.style.background = `hsl(${colorRange.value}, 70%, 50%)`;
                        colorRange.oninput = () => {
                            colorPreview.style.background = `hsl(${colorRange.value}, 70%, 50%)`;
                            renderPreview();
                        };
                    }
                    if (typeof renderPreview === 'function') renderPreview();
                }


                document.getElementById('studio-footer').style.display = (window.studioStep > 0 ? 'flex' : 'none');
                document.getElementById('btnWizardBack').style.display = (window.studioStep > 0 ? 'block' : 'none');
                document.getElementById('btnWizardNext').style.display = (window.studioStep > 0 && window.studioStep < 3 ? 'block' : 'none');
                document.getElementById('btnWizardSave').style.display = (window.studioStep === 3 ? 'block' : 'none');
                if (window.studioStep < 0) window.studioStep = 0; 
            };

            document.getElementById('cbIsSetup').addEventListener('change', updateWizardUI);

            if (window.editingBlockId || restoredState) {
                let cb = window.editingBlockId ? window.customBlocksData.find(b => b.id === window.editingBlockId) : restoredState;
                if (cb) {
                    const catVal = cb.category || "";
                    document.getElementById('cbCategory').value = catVal;
                    document.getElementById('cbCategoryLabel').innerText = catVal || "-- เลือกหมวดหมู่บล็อก --";
                    document.getElementById('cbCategoryLabel').style.opacity = catVal ? "1" : "0.6";

                    document.getElementById('cbName').value = cb.name || "";
                    document.getElementById('cbIsSetup').checked = !!cb.isSetup;

                    // Init Mode
                    const modeVal = cb.mode || "full";
                    const modeLabels = { "full": "สร้างฟังก์ชันใหม่ทั้งหมด", "call": "เรียกใช้ฟังก์ชันที่มีอยู่แล้ว", "manual": "กำหนดเอง (Manual Template)" };
                    window.selectStudioMode(modeVal, modeLabels[modeVal] || "สร้างฟังก์ชันใหม่ทั้งหมด");

                    // Init Return Type
                    const retVal = cb.returnType || "void";
                    const retLabels = { "void": "ไม่มีการส่งค่า (Void)", "Number": "ตัวเลข (Number)", "String": "ข้อความ (String)", "Boolean": "จริง/เท็จ (Boolean)" };
                    window.selectStudioReturnType(retVal, retLabels[retVal] || "ไม่มีการส่งค่า (Void)");

                    document.getElementById('cbHeaderCode').value = cb.headerCode || "";
                    document.getElementById('cbSetupCode').value = cb.setupCode || "";
                    document.getElementById('cbCode').value = cb.code || "";
                    document.getElementById('cbColor').value = cb.color || 210;
                    document.getElementById('cbIcon').value = cb.icon || "";
                    if(document.getElementById('cbColorPreview')) document.getElementById('cbColorPreview').style.background = `hsl(${cb.color || 210}, 70%, 50%)`;

                    // Init Layout
                    const layoutVal = cb.layout || "horizontal";
                    const layoutLabels = { "horizontal": "แนวนอน (Horizontal)", "vertical": "แนวตั้ง (Vertical)" };
                    window.selectStudioLayout(layoutVal, layoutLabels[layoutVal] || "แนวนอน (Horizontal)");
                }
            } else if (!restoredState) {
                // Ensure label is reset for new blocks (only if not restoring from a previous state)
                document.getElementById('cbCategoryLabel').innerText = "-- เลือกหมวดหมู่บล็อก --";
                document.getElementById('cbCategoryLabel').style.opacity = "0.6";
            }
            updateWizardUI();
        },
        didClose: () => { 
            if (window.studioPreviewWorkspace) {
                window.studioPreviewWorkspace.dispose();
                window.studioPreviewWorkspace = null;
            }
            window.studioPreviewInitialized = false;
            window.editingBlockId = null; 
            window.isEditingCustomBlocks = false;
            window.studioStep = 0;
        }
    });
}





function editCustomBlock(id) {
    window.editingBlockId = id;
    
    // 🧠 Pre-load parameter metadata for editing session (0-based)
    const cb = window.customBlocksData.find(b => b.id === id);
    if (cb && cb.args) {
        window.studioParamMetadata = {};
        cb.args.forEach((arg, i) => {
            window.studioParamMetadata[i] = {
                defaultVal: arg.defaultVal,
                options: arg.options || "",
                inputType: arg.inputType || 'field_input'
            };
        });
    }
    
    openCustomBlockManager();
}

function toggleBlockVisibility(id) {
    let cb = window.customBlocksData.find(b => b.id === id);
    if (cb) {
        cb.hidden = !cb.hidden;
        if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();
        openCustomBlockManager(); // Refresh Dashboard to show new icon state
    }
}

// 🧊 Drag & Drop Logic for Studio Items
// 🧪 Studio Param Helpers & Validation
window.validateStudioParam = (input) => {
    const type = input.dataset.type;
    let val = input.value;
    let isValid = true;

    // 🏷️ If this is an option row (Label:Value), only validate the Value part
    let checkVal = val;
    if (input.classList.contains('opt-val') && val.includes(':')) {
        checkVal = val.split(':').slice(1).join(':').trim();
    }

    // 🛡️ Logic-based Validation
    // Skip strict numeric validation if it's an option row for a dropdown
    // Dropdown labels can be text (e.g. "Fast"), while values will be mapped appropriately.
    if (!input.classList.contains('opt-val')) {
        if (["int", "short", "long", "byte", "unsigned int"].includes(type)) {
            isValid = /^-?\d*$/.test(checkVal);
        } else if (["float", "double"].includes(type)) {
            isValid = /^-?\d*\.?\d*$/.test(checkVal);
        } else if (type === "bool") {
            isValid = ["true", "false", "0", "1", ""].includes(checkVal.toLowerCase());
        }
    }

    // 🎨 UI Feedback
    let warning = input.parentElement.querySelector('.studio-input-warning');
    if (!isValid && checkVal !== "") {
        input.classList.add('studio-input-error');
        if (!warning) {
            warning = document.createElement('i');
            warning.className = 'fa-solid fa-circle-exclamation studio-input-warning';
            warning.style.cssText = 'position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--danger-color); font-size:14px; pointer-events:none; animation:fadeIn 0.2s;';
            input.parentElement.appendChild(warning);
        }
        input.style.borderColor = "var(--danger-color)";
    } else {
        input.classList.remove('studio-input-error');
        if (warning) warning.remove();
        input.style.borderColor = "";
    }
};

window.setStudioParamType = (idx, type) => {
    const inputs = document.querySelectorAll('.param-default-input');
    const input = Array.from(inputs).find(i => parseInt(i.dataset.idx) === idx);
    if (input) {
        // Find actual argument in current context
        // We need to re-render Step 3 to update the card structure
        // Save current data first
        const currentInputs = document.querySelectorAll('.param-default-input');
        const currentOptions = document.querySelectorAll('.param-options-input');
        
        // We'll use a trick: update the dataset and trigger updateWizardUI
        // But better is to update window.tempArgs if it exists or similar
        // For now, let's just use the DOM and re-call the wizard update
        
        // Since updateWizardUI re-scans the signature, we can't easily persist 
        // the type change unless we store it in a global temp object
        if (!window.studioParamMetadata) window.studioParamMetadata = {};
        window.studioParamMetadata[idx] = window.studioParamMetadata[idx] || {};
        window.studioParamMetadata[idx].inputType = type;
        
        updateWizardUI();
    }
};

window.syncStudioParamOptions = (idx, val) => {
    if (!window.studioParamMetadata) window.studioParamMetadata = {};
    window.studioParamMetadata[idx] = window.studioParamMetadata[idx] || {};
    window.studioParamMetadata[idx].options = val;
    
    // We need to update the default value selector if it's a dropdown
    // Simple way: re-render UI (careful with focus)
    // To avoid losing focus, we can just update the select element
    const select = document.querySelector(`select.param-default-input[data-idx="${idx}"]`);
    if (select) {
        const parsed = val.split(',').filter(o => o.trim()).map(o => {
            const p = o.split(':');
            return { label: p[0].trim(), value: (p[1] || p[0]).trim() };
        });
        const currentVal = select.value;
        select.innerHTML = parsed.map(opt => `<option value="${opt.value}" ${opt.value == currentVal ? 'selected' : ''}>${opt.label} (${opt.value})</option>`).join('');
    }
    renderPreview();
};

window.configureStudioParam = async (idx) => {
    // 🔍 Capture ALL current parameter default values to prevent state loss
    document.querySelectorAll('.param-default-input').forEach(inp => {
        const pIdx = inp.getAttribute('data-idx');
        if (pIdx !== null) {
            if (!window.studioParamMetadata) window.studioParamMetadata = {};
            window.studioParamMetadata[pIdx] = window.studioParamMetadata[pIdx] || {};
            window.studioParamMetadata[pIdx].defaultVal = inp.value;
        }
    });

    const inputs = document.querySelectorAll('.param-default-input');
    const input = Array.from(inputs).find(i => parseInt(i.getAttribute('data-idx')) === idx);
    if (!input) return;

    const name = input.getAttribute('data-name');
    const paramType = input.getAttribute('data-type') || 'int';
    let currentInputType = input.getAttribute('data-input-type') || 'field_input';
    let currentOptions = input.getAttribute('data-options') || '';

    // 💾 Capture current Studio state to restore later
    const currentState = {
        category: document.getElementById('cbCategory').value,
        categoryLabel: document.getElementById('cbCategoryLabel').innerText,
        isSetup: document.getElementById('cbIsSetup').checked,
        mode: document.getElementById('cbMode').value,
        modeLabel: document.getElementById('cbModeLabel').innerText,
        returnType: document.getElementById('cbReturnType').value,
        returnTypeLabel: document.getElementById('cbReturnTypeLabel').innerText,
        name: document.getElementById('cbName').value,
        headerCode: document.getElementById('cbHeaderCode').value,
        setupCode: document.getElementById('cbSetupCode').value,
        code: document.getElementById('cbCode').value,
        color: document.getElementById('cbColor').value,
        icon: document.getElementById('cbIcon').value,
        step: window.studioStep,
        editingBlockId: window.editingBlockId,
        tempStudioCategory: window.tempStudioCategory
    };

    // 🧬 Parse initial options
    let optionRows = currentOptions.split(',').filter(o => o.trim()).map(o => {
        const parts = o.split(':');
        return { label: parts[0].trim(), value: (parts[1] || parts[0]).trim() };
    });
    if (optionRows.length === 0 && currentInputType === 'field_dropdown') optionRows = [{ label: '', value: '' }];

    const result = await Swal.fire({
        title: '',
        html: `
            <div id="option-builder" style="text-align:left; padding:5px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                    <div>
                        <div style="font-size:20px; font-weight:900; color:var(--text-main); letter-spacing:-0.5px;">ตั้งค่าตัวเลือก</div>
                        <div style="font-size:11px; color:var(--primary-color); font-weight:800; text-transform:uppercase; letter-spacing:1px;">PARAMETER: ${name}</div>
                    </div>
                    <button class="btn-plus-modern" id="studio-add-opt-btn" onclick="addStudioOptionRow()" title="เพิ่มตัวเลือก" style="display:${currentInputType === 'field_dropdown' ? 'flex' : 'none'};">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>

                <div class="studio-field" style="margin-bottom:25px;">
                    <label style="font-size:10px; opacity:0.6;">รูปแบบการแสดงผล</label>
                    <div class="modern-segment-control">
                        <div class="segment-item ${currentInputType === 'field_input' ? 'active' : ''}" onclick="setModernInputType('field_input')">
                            <i class="fa-solid fa-keyboard"></i> <span>ช่องกรอกอิสระ</span>
                        </div>
                        <div class="segment-item ${currentInputType === 'field_dropdown' ? 'active' : ''}" onclick="setModernInputType('field_dropdown')">
                            <i class="fa-solid fa-list-ul"></i> <span>รายการตัวเลือก</span>
                        </div>
                    </div>
                    <input type="hidden" id="modern-type" value="${currentInputType}">
                </div>

                <div id="options-list-container" style="display:${currentInputType === 'field_dropdown' ? 'block' : 'none'};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:0 5px;">
                        <div style="display:flex; gap:12px; width:100%; align-items:center;">
                            <label style="width:22px; font-size:9px; font-weight:900; color:var(--primary-color); text-align:center; opacity:0.8; letter-spacing:0.5px;">SET</label>
                            <label style="flex:1; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px;">รายการตัวเลือก (Enter เพื่อเพิ่ม)</label>
                        </div>
                    </div>
                    <div id="studio-options-rows" style="display:flex; flex-direction:column; gap:10px; max-height:240px; overflow-y:auto; padding:5px 8px 5px 5px; margin-left:-5px;" class="custom-scrollbar">
                        <!-- Rows injected here -->
                    </div>
                </div>
            </div>

            <style>
                .btn-plus-modern { width:42px; height:42px; background:var(--primary-color); color:white; border:none; border-radius:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow:0 8px 20px rgba(var(--primary-rgb), 0.2); }
                .btn-plus-modern:hover { transform:scale(1.1) rotate(90deg); filter:brightness(1.1); }
                
                .modern-segment-control { display:flex; background:rgba(var(--primary-rgb), 0.04); border-radius:14px; padding:4px; gap:4px; border:1px solid var(--border-light); }
                .segment-item { flex:1; padding:10px; border-radius:10px; font-size:12px; font-weight:800; text-align:center; cursor:pointer; transition:all 0.2s; color:var(--text-muted); display:flex; align-items:center; justify-content:center; gap:8px; }
                .segment-item i { font-size:14px; opacity:0.4; }
                .segment-item:hover { color:var(--text-main); }
                .segment-item.active { background:var(--bg-panel); color:var(--primary-color); box-shadow:0 4px 12px rgba(0,0,0,0.08); border:1px solid var(--border-light); }
                .segment-item.active i { opacity:1; }

                .option-row-modern { display:flex; gap:10px; align-items:center; animation: rowFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1); padding:4px; border-radius:14px; transition:all 0.2s; }
                .option-row-modern:hover { background:rgba(var(--primary-rgb), 0.02); }
                .option-row-modern input { 
                    flex:1; 
                    height:44px !important; 
                    font-size:14px !important; 
                    border-radius:12px !important; 
                    border:1.5px solid var(--border-light) !important; 
                    background:var(--bg-panel) !important; 
                    color:var(--text-main) !important;
                    transition:all 0.2s !important;
                    padding:0 15px !important;
                }
                .option-row-modern input::placeholder { color:var(--text-muted); opacity:0.4; }
                .option-row-modern input:focus { 
                    border-color:var(--primary-color) !important; 
                    background:var(--bg-solid) !important;
                    box-shadow:0 0 0 4px rgba(var(--primary-rgb), 0.12) !important; 
                }
                
                .btn-del-modern { width:44px; height:44px; background:rgba(var(--danger-rgb), 0.06); color:var(--danger-color); border:none; border-radius:12px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
                .btn-del-modern:hover { background:var(--danger-color); color:white; transform:scale(1.05); }

                .studio-radio-wrapper { position:relative; width:22px; height:22px; flex-shrink:0; margin-left:2px; }
                .studio-radio-wrapper input { opacity:0; width:100%; height:100%; cursor:pointer; position:absolute; z-index:1; margin:0; }
                .studio-radio-custom { position:absolute; top:0; left:0; width:22px; height:22px; background:var(--bg-solid); border:2.5px solid var(--border-light); border-radius:50%; transition:all 0.2s; }
                .studio-radio-wrapper input:checked + .studio-radio-custom { border-color:var(--primary-color); background:var(--primary-color); box-shadow:inset 0 0 0 4.5px var(--bg-solid); }
                
                @keyframes rowFadeIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
            </style>
        `,
        showCancelButton: true,
        confirmButtonText: 'บันทึกการตั้งค่า',
        cancelButtonText: 'ยกเลิก',
        width: '520px',
        background: 'var(--bg-solid)',
        color: 'var(--text-main)',
        didOpen: () => {
            const list = document.getElementById('studio-options-rows');

            // 🔒 Block Enter key from confirming the Swal dialog while typing in option rows
            document.querySelector('.swal2-popup').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target && e.target.classList.contains('opt-val')) {
                    e.stopPropagation();
                }
            }); // Bubble phase - let children handle it first

            window.setModernInputType = (type) => {
                document.getElementById('modern-type').value = type;
                document.querySelectorAll('.segment-item').forEach(it => {
                    const isTarget = (type === 'field_input' && it.innerText.includes('ช่องกรอก')) || 
                                   (type === 'field_dropdown' && it.innerText.includes('รายการ'));
                    it.classList.toggle('active', isTarget);
                });
                document.getElementById('options-list-container').style.display = type === 'field_dropdown' ? 'block' : 'none';
                document.getElementById('studio-add-opt-btn').style.display = type === 'field_dropdown' ? 'flex' : 'none';
                
                if (type === 'field_dropdown' && list.children.length === 0) {
                    window.addStudioOptionRow();
                }
            };

            window.addStudioOptionRow = (label = '', isDefault = false, targetRow = null) => {
                const row = document.createElement('div');
                row.className = 'option-row-modern';
                
                const currentParamDefault = String(input.value || "").trim();
                const rowVal = label.includes(':') ? label.split(':').slice(1).join(':').trim() : label.trim();
                const shouldBeDefault = isDefault || (rowVal === currentParamDefault && rowVal !== "");

                row.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px; flex:1;">
                        <div class="studio-radio-wrapper" title="ตั้งเป็นค่าเริ่มต้น">
                            <input type="radio" name="default-param-opt" class="opt-default-radio" ${shouldBeDefault ? 'checked' : ''}>
                            <div class="studio-radio-custom"></div>
                        </div>
                        <div style="position:relative; flex:1; display:flex; align-items:center;">
                            <input type="text" class="studio-input opt-val" 
                                   placeholder="ระบุตัวเลือก..." 
                                   data-type="${paramType}"
                                   value="${label}" 
                                   oninput="window.validateStudioParam(this)"
                                   onkeydown="if(event.key==='Enter') { event.preventDefault(); event.stopPropagation(); window.addStudioOptionRow('', false, this.closest('.option-row-modern')); }">
                        </div>
                    </div>
                    <button class="btn-del-modern" onclick="event.preventDefault(); const wasChecked = this.parentElement.querySelector('.opt-default-radio').checked; this.parentElement.remove(); if(document.getElementById('studio-options-rows').children.length === 0) window.addStudioOptionRow(); else if(wasChecked) { const remaining = document.querySelectorAll('.opt-default-radio'); if(remaining.length > 0) remaining[0].checked = true; }" title="ลบ"><i class="fa-solid fa-trash-can"></i></button>
                `;
                
                if (targetRow) {
                    targetRow.insertAdjacentElement('afterend', row);
                } else {
                    list.appendChild(row);
                }

                const inputEl = row.querySelector('.opt-val');
                setTimeout(() => inputEl.focus(), 10);
                
                if (label) window.validateStudioParam(inputEl);

                const container = document.getElementById('studio-options-rows');
                if (!targetRow) container.scrollTop = container.scrollHeight;
            };

            // Init rows
            if (optionRows.length > 0) {
                optionRows.forEach(r => window.addStudioOptionRow(r.label + (r.value !== r.label ? ':' + r.value : '')));
            }
            
            // 🎯 Auto-check first row if none is default
            const radios = list.querySelectorAll('.opt-default-radio');
            if (radios.length > 0 && !Array.from(radios).some(r => r.checked)) {
                radios[0].checked = true;
            }
        },
        preConfirm: () => {
            const type = document.getElementById('modern-type').value;
            const rows = document.querySelectorAll('.option-row-modern');
            
            // 🛑 Block saving if there are validation errors
            const errorInputs = document.querySelectorAll('.studio-input-error');
            if (type === 'field_dropdown' && errorInputs.length > 0) {
                Swal.showValidationMessage('กรุณาแก้ไขข้อมูลให้ถูกต้องตามประเภทตัวแปร (' + paramType + ')');
                errorInputs[0].focus(); // 🎯 Jump to first error
                return false;
            }

            // 🛑 Filter and Clean options
            let defaultVal = "";
            const optionsArray = Array.from(rows)
                .map(row => {
                    const val = row.querySelector('.opt-val').value.trim();
                    if (row.querySelector('.opt-default-radio').checked) {
                        // Extract value if it's Label:Value
                        defaultVal = val.includes(':') ? val.split(':').slice(1).join(':').trim() : val;
                    }
                    return val;
                })
                .filter(v => v !== ""); // Remove empty strings

            // 🛑 Block saving if dropdown has 0 valid options
            if (type === 'field_dropdown' && optionsArray.length === 0) {
                Swal.showValidationMessage('กรุณาเพิ่มตัวเลือกอย่างน้อย 1 รายการ');
                return false;
            }

            return { type, options: optionsArray.join(', '), defaultVal };
        }
    });

    if (result.value) {
        if (!window.studioParamMetadata) window.studioParamMetadata = {};
        window.studioParamMetadata[idx] = {
            inputType: result.value.type,
            options: result.value.options,
            defaultVal: result.value.defaultVal
        };
    }

    // 🔄 RESTORE Studio Wizard Session
    openCustomBlockManager(currentState);
};

window.onStudioItemDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
    e.target.classList.add('dragging');
    
    // Create an auto-scroll interval
    window.studioScrollInterval = setInterval(() => {
        const container = document.getElementById('studio-list-container');
        if (!container || !window.lastDragY) return;
        const rect = container.getBoundingClientRect();
        const threshold = 50;
        if (window.lastDragY < rect.top + threshold) container.scrollTop -= 5;
        else if (window.lastDragY > rect.bottom - threshold) container.scrollTop += 5;
    }, 16);
};

window.onStudioItemDragOver = (e, index) => {
    e.preventDefault();
    window.lastDragY = e.clientY;
    
    const item = e.target.closest('.studio-list-item');
    if (!item || item.classList.contains('dragging')) return;
    
    const rect = item.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    // Clear previous indicators on OTHER items
    document.querySelectorAll('.studio-list-item').forEach(el => {
        if (el !== item) el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    if (e.clientY < midpoint) {
        item.classList.add('drag-over-top');
        item.classList.remove('drag-over-bottom');
    } else {
        item.classList.add('drag-over-bottom');
        item.classList.remove('drag-over-top');
    }
};

window.onStudioItemDragLeave = (e) => {
    const item = e.target.closest('.studio-list-item');
    if (item) {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
    }
};

window.onStudioItemDrop = (e, targetIndex) => {
    e.preventDefault();
    clearInterval(window.studioScrollInterval);
    
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex === targetIndex) {
        openCustomBlockManager(); // Clean UI
        return;
    }

    const rect = e.target.closest('.studio-list-item').getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    let finalTarget = (e.clientY < midpoint) ? targetIndex : targetIndex + 1;
    if (sourceIndex < finalTarget) finalTarget--;

    const items = window.customBlocksData;
    const [movedItem] = items.splice(sourceIndex, 1);
    items.splice(finalTarget, 0, movedItem);

    if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();
    
    // 💾 Debounced Save (prevent spam/network suspension)
    if (window.studioSaveTimer) clearTimeout(window.studioSaveTimer);
    window.studioSaveTimer = setTimeout(() => {
        if (typeof saveProject === 'function') saveProject();
    }, 1000);
    openCustomBlockManager();
};

window.addEventListener('dragend', () => {
    clearInterval(window.studioScrollInterval);
    document.querySelectorAll('.studio-list-item').forEach(el => {
        el.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    });
});

function moveCustomBlock(id, dir) {
    // Keep this for potential programmatic use
    const index = window.customBlocksData.findIndex(b => b.id === id);
    if (index === -1) return;
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= window.customBlocksData.length) return;
    const temp = window.customBlocksData[index];
    window.customBlocksData[index] = window.customBlocksData[newIndex];
    window.customBlocksData[newIndex] = temp;
    if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();
    openCustomBlockManager();
}


function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function validateCustomBlockCode(code) {
    if (!code || typeof code !== 'string') throw new Error('Invalid code input');
    const dangerousPatterns = [/eval\s*\(/gi, /exec\s*\(/gi, /system\s*\(/gi, /__.*__/gi, /process\./gi, /require\s*\(/gi, /import\s+/gi];
    for (let pattern of dangerousPatterns) {
        if (pattern.test(code)) throw new Error('Dangerous code pattern detected');
    }
    if (code.length > 5000) throw new Error('Code too large (max 5000 characters)');
    return true;
}

const VALID_TYPES = ['int', 'float', 'double', 'bool', 'char', 'void', 'String', 'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t', 'short', 'long', 'unsigned int', 'byte'];
function validateArgType(type) {
    if (!type || typeof type !== 'string') return false;
    // Enhanced: Allow pointers, references, arrays, and custom type names
    return /^[a-zA-Z0-9_:\*\&\s\[\]]+$/.test(type.trim());
}

async function parseAndAddCustomBlock() {
    let name = document.getElementById('cbName').value.trim();
    let category = document.getElementById('cbCategory').value.trim() || "My Blocks";
    let mode = document.getElementById('cbMode').value;
    let returnType = document.getElementById('cbReturnType').value;
    let layout = document.getElementById('cbLayout').value || "horizontal";
    let color = parseInt(document.getElementById('cbColor').value);
    let icon = document.getElementById('cbIcon').value.trim();
    let headerCode = document.getElementById('cbHeaderCode').value.trim();
    let setupCode = document.getElementById('cbSetupCode').value.trim();
    let code = document.getElementById('cbCode').value.trim();
    let isSetup = document.getElementById('cbIsSetup').checked;

    if (!category) return Swal.fire("แจ้งเตือน", "โปรดเลือกหรือสร้างหมวดหมู่", "warning");
    
    // 🛡️ Rule: For Normal Blocks, Code is mandatory. For Setup, it's optional.
    if (!isSetup && !code) {
        Swal.fire("แจ้งเตือน", "โปรดระบุโค้ดการทำงานของบล็อกในส่วนนี้ก่อนครับ", "warning").then(() => openCustomBlockManager());
        return;
    }

    // 🛡️ Rule: Block Name Uniqueness within the same category
    const isStudioNameDuplicate = (n, c, excludeId = null) => {
        return (window.customBlocksData || []).some(b => b.name === n && b.category === c && b.id !== excludeId);
    };

    if (isStudioNameDuplicate(name, category, window.editingBlockId)) {
        Swal.fire({
            title: "ชื่อบล็อกซ้ำ!",
            text: `ในหมวดหมู่ "${category}" มีบล็อกชื่อ "${name}" อยู่แล้ว โปรดเปลี่ยนชื่อใหม่ครับ`,
            icon: "warning",
            confirmButtonText: "ตกลง ฉันจะแก้ไข",
            background: "var(--bg-solid)",
            color: "var(--text-main)"
        }).then(() => {
            // Re-open at Step 3 and focus name input
            const currentState = { category, isSetup, mode, returnType, color, icon, headerCode, setupCode, code, name, step: 3, editingBlockId: window.editingBlockId };
            openCustomBlockManager(currentState);
            setTimeout(() => {
                const ni = document.getElementById('cbName');
                if (ni) { ni.focus(); ni.select(); }
            }, 300);
        });
        return;
    }

    // 🛡️ Rule: For Setup blocks, at least Header or Setup code should exist (optional but good practice)
    if (isSetup && !headerCode && !setupCode && !code) {
        Swal.fire("แจ้งเตือน", "โปรดระบุโค้ดอย่างน้อยหนึ่งส่วน (Header, Setup หรือ Main Code)", "warning").then(() => openCustomBlockManager());
        return;
    }


    // 🛡️ Rule: Only one Setup block per category
    if (isSetup) {
        const existingSetup = window.customBlocksData.find(b => b.category === category && b.isSetup && b.id !== window.editingBlockId);
        if (existingSetup) {
            Swal.fire("บล็อกตั้งค่าซ้ำ", `หมวดหมู่ "${category}" มีบล็อกตั้งค่าอยู่แล้วคือ "${existingSetup.name}"<br><br>คุณสามารถมีบล็อก Setup ได้เพียงตัวเดียวต่อหนึ่งหมวดหมู่ครับ`, "error").then(() => openCustomBlockManager());
            return;
        }
    }

    let parsedName = "";
    let args = [];

    // 🛡️ Skip function parsing if it's a Setup block and no main code is provided
    if (isSetup && !code) {
        parsedName = name || "setup_block";
    } else {
        let cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        if (mode === 'full') {
            let matches = [...cleanCode.matchAll(/(\S+)\s+([a-zA-Z0-9_:]+)\s*\(([^)]*)\)\s*\{/g)];
            if (matches.length === 0) {
                Swal.fire("รูปแบบผิดพลาด", "Mode Full ต้องมีรูปแบบ [ประเภทคืนค่า] [ชื่อฟังก์ชัน](...) { ... }", "error").then(() => openCustomBlockManager());
                return;
            }
            let bestMatch = matches[matches.length - 1];
            parsedName = bestMatch[2];
            args = parseArgString(bestMatch[3]);
        } else if (mode === 'call') {
            let match = cleanCode.match(/([a-zA-Z0-9_:]+)\s*\(([^)]*)\)/);
            if (!match) {
                Swal.fire("รูปแบบผิดพลาด", "Mode Call ต้องมีรูปแบบ name(int arg1, ...)", "error").then(() => openCustomBlockManager());
                return;
            }
            parsedName = match[1];
            args = parseArgString(match[2]);
        } else {
            let match = cleanCode.match(/([a-zA-Z0-9_:]+)\s*\(([^)]*)\)/);
            if (match) {
                parsedName = match[1];
                args = parseArgString(match[2]);
            }
        }
    }

    // 🛡️ Rule: Strict Function Signature Check (Redefinition Guard) - ONLY FOR FULL MODE
    if (!isSetup && parsedName && mode === 'full') {
        const conflict = window.customBlocksData.find(cb => {
            if (cb.id === window.editingBlockId || cb.isSetup || !cb.funcName) return false;
            if (cb.funcName !== parsedName) return false;
            
            // If name matches, check parameter types (Overloading rules)
            const cbArgs = cb.args || [];
            if (cbArgs.length !== args.length) return false;
            for (let i = 0; i < args.length; i++) {
                if (args[i].type !== cbArgs[i].type) return false;
            }
            return true;
        });

        if (conflict) {
            Swal.fire({
                title: "ฟังก์ชันซ้ำซ้อน!",
                html: `ตรวจพบฟังก์ชันชื่อ <code style="color:var(--danger-color)">${parsedName}</code> ที่มีพารามิเตอร์เหมือนกันในหมวดหมู่ <b>"${conflict.category}"</b><br><br>C++ ไม่อนุญาตให้สร้างฟังก์ชันที่มี Signature ซ้ำกันครับ`,
                icon: "error"
            }).then(() => openCustomBlockManager());
            return;
        }
    }

    // Default Display Name if empty
    if (!name) name = parsedName || "My Block";

    // 🔧 Grab Parameter Default Values & Advanced Settings - Priority: studioParamMetadata > DOM
    if (args.length > 0 && !isSetup) {
        document.querySelectorAll('.param-default-input').forEach((input, idx) => {
            if (args[idx]) {
                let val = input.value;
                
                // 🛡️ Auto-select first option for dropdowns if empty
                const inputType = args[idx].inputType || (window.studioParamMetadata && window.studioParamMetadata[idx] ? window.studioParamMetadata[idx].inputType : "field_input");
                const options = args[idx].options || (window.studioParamMetadata && window.studioParamMetadata[idx] ? window.studioParamMetadata[idx].options : "");
                
                if (!val && inputType === 'field_dropdown' && options) {
                    const firstOpt = options.split(',')[0].split(':');
                    val = (firstOpt[1] || firstOpt[0] || "0").trim();
                }
                
                args[idx].defaultVal = val || "0";
                // 🌟 studioParamMetadata is the truth source (set by configureStudioParam)
                if (window.studioParamMetadata && window.studioParamMetadata[idx]) {
                    args[idx].inputType = window.studioParamMetadata[idx].inputType || "field_input";
                    args[idx].options   = window.studioParamMetadata[idx].options   || "";
                } else {
                    // Fallback to DOM attribute (first-time, no modal opened yet)
                    args[idx].inputType = input.getAttribute('data-input-type') || "field_input";
                    args[idx].options   = input.getAttribute('data-options')    || "";
                }
                console.log(`[Studio Save] arg[${idx}] "${args[idx].name}" → inputType:${args[idx].inputType}, options:"${args[idx].options}"`);
            }
        });

        // 🛡️ Safety: also cover params not yet rendered in DOM (edge case)
        args.forEach((arg, idx) => {
            if (!arg.inputType && window.studioParamMetadata && window.studioParamMetadata[idx]) {
                arg.inputType = window.studioParamMetadata[idx].inputType || "field_input";
                arg.options   = window.studioParamMetadata[idx].options   || "";
            }
        });
    }

    let blockData = {
        id: window.editingBlockId || Date.now().toString(),
        name, 
        funcName: isSetup ? "" : parsedName, 
        category, mode, returnType, layout, color, icon, headerCode, setupCode, 
        code: isSetup ? "" : code, 
        args: isSetup ? [] : args, 
        isSetup,
        hidden: false
    };

    if (window.editingBlockId) {
        let idx = window.customBlocksData.findIndex(cb => cb.id === window.editingBlockId);
        if (idx > -1) window.customBlocksData[idx] = blockData;
        window.editingBlockId = null;
    } else {
        window.customBlocksData.push(blockData);
    }

    if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();
    if (typeof generateAndPreviewCode === 'function') generateAndPreviewCode(); // 🔥 SYNC code preview immediately
    if (typeof saveProject === 'function') saveProject(); // 💾 Persist changes
    
    // 🔥 Success & Redirect
    await Swal.fire({ title: 'บันทึกสำเร็จ!', icon: 'success', timer: 1000, showConfirmButton: false });
    
    window.studioStep = 0;
    openCustomBlockManager();
}

function parseArgString(argsRaw) {
    if (!argsRaw || argsRaw.trim() === "") return [];
    
    // 1. Strip comments (inline and block)
    let clean = argsRaw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    
    let args = [];
    // 2. Split by comma - Smart parsing for templates <...>, brackets (...), and quotes "..."
    let argParts = [];
    let currentPart = "";
    let inQuotes = false;
    let bracketLevel = 0;
    
    for (let i = 0; i < clean.length; i++) {
        let char = clean[i];
        if (char === '"') inQuotes = !inQuotes;
        if (!inQuotes) {
            if (char === '<' || char === '(' || char === '[') bracketLevel++;
            if (char === '>' || char === ')' || char === ']') bracketLevel--;
        }
        
        if (char === ',' && !inQuotes && bracketLevel === 0) {
            argParts.push(currentPart);
            currentPart = "";
        } else {
            currentPart += char;
        }
    }
    argParts.push(currentPart);
    
    argParts.forEach((part) => {
        part = part.trim();
        if (!part || part === '...') {
            if (part === '...') args.push({ name: '...', type: 'variadic', defaultVal: '' });
            return;
        }

        // 3. Handle default values: int a = 10 -> keep "int a", defaultVal = 10
        let [decl, defaultVal] = part.split('=');
        decl = decl.trim();

        // 4. Extract Type and Name
        let words = decl.split(/\s+/);
        if (words.length >= 2) {
            let namePart = words.pop();
            let typePart = words.join(' ');

            // 🎯 Handle Function Pointers: void (*callback)(int)
            let funcPtrMatch = namePart.match(/\(\*([a-zA-Z0-9_]+)\)\s*\(.*\)/);
            if (funcPtrMatch) {
                namePart = funcPtrMatch[1];
                typePart += " (function pointer)";
            }

            // 📦 Handle array notation: int arr[5] or int matrix[3][3]
            let arrayMatch = namePart.match(/^([a-zA-Z0-9_]+)(\[.*\])$/);
            if (arrayMatch) {
                namePart = arrayMatch[1];
                typePart += " " + arrayMatch[2];
            }

            // 🔗 Handle pointer/ref sticking to name: int *ptr or String &ref
            if (namePart.startsWith('*') || namePart.startsWith('&')) {
                typePart += " " + namePart[0];
                namePart = namePart.substring(1);
            }

            if (validateArgType(typePart)) {
                args.push({ 
                    name: namePart, 
                    type: typePart.trim(), 
                    defaultVal: (defaultVal ? defaultVal.trim() : "") 
                });
            }
        }
    });
    return args;
}


async function deleteCustomBlock(id) {
    let cb = window.customBlocksData.find(b => b.id === id);
    const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันการลบ',
        text: `คุณต้องการลบบล็อก "${cb ? cb.name : id}" ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'ลบเลย',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    });

    if (!isConfirmed) return;

    let blocks = window.workspace.getAllBlocks(false);
    blocks.forEach(b => { if (b.type === 'custom_' + id) b.dispose(true); });
    window.customBlocksData = window.customBlocksData.filter(cb => cb.id !== id);
    if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();
    
    // 🧩 Update code view
    if (typeof generateAndPreviewCode === 'function') generateAndPreviewCode();

    openCustomBlockManager();
}

function downloadCustomBlocks() {
    if (!window.customBlocksData || window.customBlocksData.length === 0) {
        Swal.fire({
            title: "ไม่พบข้อมูลบล็อก",
            text: "คุณยังไม่มีบล็อกเสริมที่สร้างไว้สำหรับดาวน์โหลดครับ โปรดสร้างบล็อกก่อนครับ",
            icon: "info",
            confirmButtonText: "ตกลง",
            background: 'var(--bg-solid)',
            color: 'var(--text-main)'
        }).then(() => {
            openCustomBlockManager(); // 🔥 กลับมาหน้า Dashboard
        });
        return;
    }
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([JSON.stringify(window.customBlocksData, null, 2)], { type: 'application/json' }));
    a.download = 'MyCustomBlocks.json'; 
    a.click();
}

function importCustomBlocks(e) {
    let file = e.target.files[0]; 
    if (!file) return;

    let reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (!Array.isArray(imported)) throw new Error("Format invalid");

            // 🔍 Helper to check if two signatures are identical for Arduino (Name + Arg Types/Count)
            const isSignatureMatch = (b1, b2) => {
                if (!b1.funcName || !b2.funcName || b1.funcName !== b2.funcName) return false;
                const args1 = b1.args || [];
                const args2 = b2.args || [];
                if (args1.length !== args2.length) return false;
                
                // Check each argument's type and check-type (Arduino doesn't care about parameter names, just types)
                for (let i = 0; i < args1.length; i++) {
                    if (args1[i].type !== args2[i].type) return false;
                    if (args1[i].check !== args2[i].check) return false;
                }
                return true;
            };

            // 🔍 Pre-Scan all blocks for conflicts
            const scanResults = imported.map((cb, i) => {
                let existingByName = window.customBlocksData.findIndex(exist => exist.name === cb.name);
                let existingSetupIdx = window.customBlocksData.findIndex(exist => exist.category === cb.category && exist.isSetup);
                let sameFuncIdx = window.customBlocksData.findIndex(exist => isSignatureMatch(exist, cb));
                
                let status = "new";
                let conflictText = "—";
                let isSignatureConflict = false;
                let isSetupConflict = false;

                if (cb.isSetup && existingSetupIdx > -1) { 
                    status = "conflict"; 
                    conflictText = "Setup ซ้ำ"; 
                    isSetupConflict = true; 
                } else if (sameFuncIdx > -1 && cb.funcName !== "") { 
                    // 🛡️ If the code signature is the same, we MUST force overwrite regardless of the block name
                    status = "conflict"; 
                    conflictText = "Signature ซ้ำ"; 
                    isSignatureConflict = true;
                } else if (existingByName > -1) { 
                    status = "conflict"; 
                    conflictText = "ชื่อซ้ำ"; 
                }
                
                return { cb, status, conflictText, originalIndex: i, isSetupConflict, isSignatureConflict, existingSetupIdx, sameFuncIdx, existingByName };
            });

            // 📊 Build the Table UI
            let tableHtml = `
                <div style="text-align:left; margin-bottom:15px;">
                    <div style="font-size:13px; color:var(--text-muted); margin-bottom:10px;">พบทั้งหมด ${imported.length} บล็อก (Setup จะถูกบังคับเขียนทับหากหมวดหมู่ซ้ำ)</div>
                    <div style="max-height:450px; overflow-y:auto; border:1px solid var(--border-light); border-radius:12px;" class="custom-scrollbar">
                        <table style="width:100%; border-collapse:collapse; font-size:13px;">
                            <thead style="position:sticky; top:0; background:var(--bg-hover); z-index:10; border-bottom:2px solid var(--border-light);">
                                <tr>
                                    <th style="padding:12px; text-align:left; width:40px;"><input type="checkbox" id="import_select_all" checked onchange="document.querySelectorAll('.import-row-check').forEach(c => { c.checked = this.checked; c.dispatchEvent(new Event('change')); })"></th>
                                    <th style="padding:12px; text-align:left;">ชื่อบล็อก / หมวดหมู่</th>
                                    <th style="padding:12px; text-align:left;">สถานะ</th>
                                    <th style="padding:12px; text-align:left;">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            scanResults.forEach((res, i) => {
                const color = res.status === 'conflict' ? '#ef4444' : (res.status === 'warning' ? '#f59e0b' : '#10b981');
                tableHtml += `
                    <tr style="border-bottom:1px solid var(--border-light); transition:background 0.2s;" onmouseover="this.style.background='rgba(var(--primary-rgb), 0.03)'" onmouseout="this.style.background='transparent'">
                        <td style="padding:12px;">
                            <input type="checkbox" class="import-row-check" id="check_${i}" checked 
                                onchange="const s = document.getElementById('wrapper_${i}'); const d = document.getElementById('dash_${i}'); if(this.checked){ s.style.display='block'; d.style.display='none'; }else{ s.style.display='none'; d.style.display='inline'; }">
                        </td>
                        <td style="padding:12px;">
                            <div style="font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:5px;">
                                ${res.cb.isSetup ? '<i class="fa-solid fa-gears" style="color:#6366f1; font-size:10px;"></i>' : ''}
                                ${escapeHtml(res.cb.name)}
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);">${res.cb.category}</div>
                        </td>
                        <td style="padding:12px;"><span style="color:${color}; font-weight:800; font-size:11px;">${res.conflictText}</span></td>
                        <td style="padding:12px; min-width:100px;">
                            <span id="dash_${i}" style="display:none; color:var(--text-muted);">❌</span>
                            <div id="wrapper_${i}">
                                ${res.status === 'new' ? '<span style="color:#10b981; font-weight:800;">ใหม่</span>' : `
                                <select id="action_${i}" style="background:var(--bg-solid); color:var(--text-main); border:1px solid var(--border-light); border-radius:6px; padding:4px; font-size:12px; outline:none; width:100%;">
                                    <option value="overwrite" selected>เขียนทับ</option>
                                    ${(res.isSetupConflict || res.isSignatureConflict) ? '' : '<option value="copy">สร้างสำเนา</option>'}
                                </select>
                                `}
                            </div>
                        </td>
                    </tr>
                `;
            });

            tableHtml += `</tbody></table></div></div>`;

            const result = await Swal.fire({
                title: 'จัดการการนำเข้าบล็อก',
                html: tableHtml,
                width: '850px',
                showCancelButton: true,
                confirmButtonText: 'เริ่มนำเข้าข้อมูล',
                cancelButtonText: 'ยกเลิก',
                background: 'var(--bg-solid)',
                color: 'var(--text-main)'
            });

            if (result.isConfirmed) {
                for (let i = 0; i < scanResults.length; i++) {
                    const isSelected = document.getElementById(`check_${i}`).checked;
                    if (!isSelected) continue;

                    let res = scanResults[i];
                    let cb = res.cb;
                    let action = document.getElementById(`action_${i}`) ? document.getElementById(`action_${i}`).value : 'new';

                    // 🛡️ Signature/Setup Safe-Logic: Find the correct target for Overwrite
                    let targetIdx = -1;
                    if (action === 'overwrite') {
                        if (cb.isSetup) targetIdx = res.existingSetupIdx;
                        else if (res.isSignatureConflict) targetIdx = res.sameFuncIdx;
                        else targetIdx = res.existingByName;
                    }
                    
                    if (action === 'overwrite' && targetIdx > -1) {
                        // 🔑 KEY FIX: Preserve the existing block's ID to keep Workspace blocks alive
                        // but update everything else (name, category, logic, inputs)
                        const originalId = window.customBlocksData[targetIdx].id;
                        window.customBlocksData[targetIdx] = { ...cb, id: originalId };
                    } else {
                        let newCb = { ...cb };
                        // If it's a copy OR a name collision we didn't overwrite
                        if (action === 'copy' || res.existingByName > -1) {
                            let count = 1;
                            let baseName = cb.name;
                            let baseFunc = cb.funcName;
                            while(window.customBlocksData.some(exist => exist.name === (baseName + (count === 1 ? "_Copy" : "_Copy" + count)))) {
                                count++;
                            }
                            newCb.id = Date.now().toString() + i;
                            newCb.name = baseName + (count === 1 ? "_Copy" : "_Copy" + count);
                            if (newCb.funcName) newCb.funcName = baseFunc + (count === 1 ? "_copy" : "_copy" + count);
                        }
                        window.customBlocksData.push(newCb);
                    }
                }

                // 🔄 Robust Refresh Sequence
                if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();
                if (typeof generateAndPreviewCode === 'function') generateAndPreviewCode(); // 🔥 NEW: Force code update
                if (typeof saveProject === 'function') await saveProject();
                
                await Swal.fire("สำเร็จ", "จัดการนำเข้าเรียบร้อยแล้ว", "success");
                
                // Force a total UI re-render of the studio
                openCustomBlockManager(); 
            }
        } catch (e) { 
            console.error(e);
            Swal.fire('ข้อผิดพลาด', 'ไฟล์ไม่ถูกต้องหรือระบบขัดข้อง', 'error'); 
        }
    };
    reader.readAsText(file); 
    e.target.value = '';
}

// =========================================
// 🔍 Workspace Find Widget Logic (VS Code Style)
// =========================================

let findResults = [];
let findIndex = -1;
let currentGlowTimeout = null;

function toggleFindWidget() {
    const widget = document.getElementById('workspaceFindWidget');
    if (widget.style.display === 'none') {
        widget.style.display = 'block';
        const input = document.getElementById('workspaceFindInput');
        input.focus();
        input.select();
        handleWorkspaceFind();
        
        // 👂 Start listening for workspace changes to live update search
        if (window.workspace) {
            window.workspace.addChangeListener(onWorkspaceChangeSearch);
        }
    } else {
        closeFindWidget();
    }
}

function onWorkspaceChangeSearch(event) {
    if (event.isUiEvent) return;
    const widget = document.getElementById('workspaceFindWidget');
    if (widget && widget.style.display !== 'none') {
        if (window.searchUpdateTimer) clearTimeout(window.searchUpdateTimer);
        window.searchUpdateTimer = setTimeout(() => {
            handleWorkspaceFind(true); // ✨ Preserve current focus during live updates
        }, 300);
    }
}

function closeFindWidget() {
    const widget = document.getElementById('workspaceFindWidget');
    if (widget) widget.style.display = 'none';
    const resultsDropdown = document.getElementById('workspaceFindResults');
    if (resultsDropdown) resultsDropdown.style.display = 'none';
    
    // 🛑 Stop listening to changes when closed
    if (window.workspace) {
        window.workspace.removeChangeListener(onWorkspaceChangeSearch);
    }
    
    clearBlockGlow();
    // 🧹 Deselect everything to be clean
    if (window.workspace) {
        const selected = Blockly.getSelected();
        if (selected) selected.unselect();
    }
}

function handleWorkspaceFind(preserveFocus = false) {
    const input = document.getElementById('workspaceFindInput');
    const resultsDropdown = document.getElementById('workspaceFindResults');
    if (!input || !resultsDropdown || !window.workspace) return;
    
    const q = input.value.toLowerCase().trim();
    
    // 🛡️ Pre-check: Remember the ID of the block we are CURRENTLY on
    const currentId = (preserveFocus && findResults.length > 0 && findIndex >= 0) ? findResults[findIndex].id : null;
    
    findResults = [];
    resultsDropdown.innerHTML = '';
    
    if (q !== '') {
        const allBlocks = window.workspace.getAllBlocks(false);
        allBlocks.forEach(block => {
            let visualName = "";
            try {
                visualName = block.toString();
                if (block.type === 'procedures_defnoreturn' || block.type === 'procedures_defreturn') {
                    const nameField = block.getField('NAME');
                    if (nameField) visualName = nameField.getText();
                } else if (block.type === 'variables_get' || block.type === 'variables_set') {
                    const varField = block.getField('VAR');
                    if (varField) visualName = varField.getText();
                }
            } catch(e) {
                visualName = block.type;
            }

            let extraInfo = "";
            block.inputList.forEach(input => {
                input.fieldRow.forEach(field => {
                    extraInfo += " " + field.getText();
                });
            });

            const combinedText = (visualName + " " + extraInfo).toLowerCase();

            if (combinedText.includes(q)) {
                findResults.push({ id: block.id, name: visualName, type: block.type, color: block.getColour() });
            }
        });
    }

    if (findResults.length > 0) {
        resultsDropdown.style.display = 'block';
        findResults.forEach((res, idx) => {
            const item = document.createElement('div');
            item.className = 'find-res-item';
            item.innerHTML = `
                <div class="res-icon" style="background:${res.color}20; color:${res.color}; border:1px solid ${res.color}40;">
                    <i class="fa-solid fa-cube"></i>
                </div>
                <div class="res-text">${res.name}</div>
            `;
            item.onclick = () => {
                findIndex = idx;
                focusAndGlowBlock(res.id);
                updateFindCount();
            };
            resultsDropdown.appendChild(item);
        });
        
        // 🧩 FIX: Better position preservation
        if (preserveFocus && currentId) {
            const newIdx = findResults.findIndex(r => r.id === currentId);
            if (newIdx !== -1) {
                findIndex = newIdx;
            } else {
                findIndex = 0;
            }
        } else {
            findIndex = 0;
        }
    } else {
        resultsDropdown.style.display = 'none';
        findIndex = -1;
        if (!preserveFocus) clearBlockGlow();
    }
    
    updateFindCount();
}

function moveFindSelection(dir) {
    if (findResults.length === 0) return;
    findIndex = (findIndex + dir + findResults.length) % findResults.length;
    focusAndGlowBlock(findResults[findIndex].id);
    updateFindCount();
}

function moveFindSelection(dir) {
    if (findResults.length === 0) return;
    findIndex = (findIndex + dir + findResults.length) % findResults.length;
    focusAndGlowBlock(findResults[findIndex].id);
    updateFindCount();
}

function updateFindCount() {
    const countLabel = document.getElementById('workspaceFindCount');
    const resultsDropdown = document.getElementById('workspaceFindResults');
    
    if (findResults.length > 0) {
        countLabel.innerText = `${findIndex + 1}/${findResults.length}`;
        countLabel.style.color = 'var(--primary-color)';
        
        // ✨ Highlight active item in dropdown
        if (resultsDropdown) {
            const items = resultsDropdown.querySelectorAll('.find-res-item');
            items.forEach((item, idx) => {
                if (idx === findIndex) {
                    item.classList.add('active');
                    // 📜 Auto-scroll into view
                    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                } else {
                    item.classList.remove('active');
                }
            });
        }
    } else {
        countLabel.innerText = `0/0`;
        countLabel.style.color = 'var(--text-light)';
    }
}

function focusAndGlowBlock(id) {
    if (!window.workspace) return;

    // 1. Cancel any pending removal of glow
    if (currentGlowTimeout) {
        clearTimeout(currentGlowTimeout);
        currentGlowTimeout = null;
    }

    // 2. Clear EVERYTHING: Glows, Selections, and Blockly Highlights
    clearBlockGlow();

    const block = window.workspace.getBlockById(id);
    if (block) {
        window.workspace.centerOnBlock(id);

        // Use select() sparingly, or unselect previous first
        const prevSelected = Blockly.getSelected();
        if (prevSelected) prevSelected.unselect();

        block.select();

        // 3. Apply yellow glow to ONLY the current block
        const svgGroup = block.getSvgRoot();
        if (svgGroup) {
            svgGroup.classList.add('block-glow-active');

            // 4. Set timer to remove it (Quick flash)
            currentGlowTimeout = setTimeout(() => {
                svgGroup.classList.remove('block-glow-active');
                currentGlowTimeout = null;
            }, 700);
        }
    }
}

function clearBlockGlow() {
    if (!window.workspace) return;

    // 1. Clear our custom CSS glow class from any element that might have it
    const glowingElements = document.querySelectorAll('.block-glow-active');
    glowingElements.forEach(el => el.classList.remove('block-glow-active'));

    // 2. 🚩 FORCED CLEANUP: Clear Blockly's native highlight state
    if (typeof window.workspace.highlightBlock === 'function') {
        window.workspace.highlightBlock(null);
    }

    // 3. 🧹 AGGRESSIVE BLOCK-BY-BLOCK RESET
    // This handles any external plugins or built-in features that might be highlighting blocks
    const allBlocks = window.workspace.getAllBlocks(false);
    allBlocks.forEach(b => {
        // Remove selection outline
        if (typeof b.unselect === 'function') b.unselect();
        // Remove glow effect
        if (typeof b.setGlowBlock === 'function') b.setGlowBlock(false);
        // Remove stack glow effect
        if (typeof b.setGlowStack === 'function') b.setGlowStack(false);

        // Ensure no leftover CSS classes on the SVG group
        const svg = b.getSvgRoot();
        if (svg) {
            svg.classList.remove('block-glow-active');
            // Some plugins might use 'blocklySelected' or 'blocklyHighlighted'
            svg.classList.remove('blocklyHighlighted');
        }
    });
}

// =========================================
// 🛡️ Workspace Protection (Healer)
// =========================================

function ensureEssentialBlocks() {
    if (!window.workspace) return;
    
    // Check for Setup
    const setupBlocks = window.workspace.getBlocksByType('arduino_setup');
    if (setupBlocks.length === 0) {
        const setup = window.workspace.newBlock('arduino_setup');
        setup.initSvg();
        setup.render();
        setup.moveBy(50, 50);
        setup.setDeletable(false);
        setup.setMovable(true); // Allow moving but not deleting
    }

    // Check for Loop
    const loopBlocks = window.workspace.getBlocksByType('arduino_loop');
    if (loopBlocks.length === 0) {
        const loop = window.workspace.newBlock('arduino_loop');
        loop.initSvg();
        loop.render();
        loop.moveBy(50, 250);
        loop.setDeletable(false);
        loop.setMovable(true);
    }
}

// Global Export Attachment
window.applyTheme = applyTheme;
window.toggleThemeDropdown = toggleThemeDropdown;
window.toggleThemeMode = toggleThemeMode;
window.changeThemeAccent = changeThemeAccent;
window.togglePanel = togglePanel;
window.openLibManager = openLibManager;
window.searchLib = searchLib;
window.installSpecificLib = installSpecificLib;
window.deleteLibrary = deleteLibrary;
window.uploadZipLibrary = uploadZipLibrary;
window.openFileManager = openFileManager;
window.newProject = newProject;
window.loadFile = loadFile;
window.deleteFile = deleteFile;
window.renameFile = renameFile;
window.renameProject = renameProject;
window.importFile = importFile;
window.downloadProject = downloadProject;
window.loadLocalFile = loadLocalFile;
window.updateBadge = updateBadge;
window.openCustomBlockManager = openCustomBlockManager;
window.importCustomBlocks = importCustomBlocks;
window.deleteCustomBlock = deleteCustomBlock;
window.editCustomBlock = editCustomBlock;
window.parseAndAddCustomBlock = parseAndAddCustomBlock;
window.downloadCustomBlocks = downloadCustomBlocks;
window.openBlockSearch = toggleFindWidget; // Alias for compatibility
window.toggleFindWidget = toggleFindWidget;
window.closeFindWidget = closeFindWidget;
window.handleWorkspaceFind = handleWorkspaceFind;
window.moveFindSelection = moveFindSelection;
window.ensureEssentialBlocks = ensureEssentialBlocks;

// --- Gemini AI Configuration ---
async function openGeminiConfig() {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    
    const { value: apiKey } = await Swal.fire({
        title: 'Gemini AI Configuration',
        html: `
            <div style="text-align: left; padding: 10px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-main);">Google Gemini API Key:</label>
                <div style="position: relative; display: flex; align-items: center;">
                    <input type="password" id="geminiApiKey" class="swal2-input" placeholder="Enter your API Key here..." value="${savedKey}" style="width: 100%; margin: 10px 0; box-sizing: border-box; padding-right: 50px !important;">
                    <i id="toggleGeminiKey" class="fa-solid fa-eye" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); z-index: 10; font-size: 16px;"></i>
                </div>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: 10px;">
                    <i class="fa-solid fa-circle-info"></i> API Key จะถูกเก็บไว้ใน Browser ของคุณเท่านั้น เพื่อใช้ในการเรียกฟีเจอร์ AI ช่วยวิเคราะห์โค้ด
                </p>
            </div>
        `,
        didOpen: () => {
            const input = document.getElementById('geminiApiKey');
            const icon = document.getElementById('toggleGeminiKey');
            icon.onclick = () => {
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                icon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
            };
        },
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'บันทึกคีย์',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: 'var(--primary-color)',
        background: window.currentThemeMode === 'dark' ? '#1e293b' : '#ffffff',
        color: window.currentThemeMode === 'dark' ? '#f8fafc' : '#0f172a',
        preConfirm: () => {
            return document.getElementById('geminiApiKey').value;
        }
    });

    if (apiKey !== undefined) {
        const sanitizedKey = apiKey.trim();
        localStorage.setItem('gemini_api_key', sanitizedKey);
        
        Swal.fire({
            icon: 'success',
            title: 'อัปเดต API Key สำเร็จ',
            text: sanitizedKey ? 'ระบบจะเริ่มใช้ API Key ใหม่ของคุณทันที' : 'ลบ API Key เรียบร้อยแล้ว',
            timer: 2000,
            showConfirmButton: false
        });
    }
}

// Global Export
window.openGeminiConfig = openGeminiConfig;

// 🛡️ Attach Healer to Workspace
if (window.workspace) {
    window.workspace.addChangeListener((e) => {
        if (e.type === Blockly.Events.BLOCK_DELETE) {
            ensureEssentialBlocks();
        }
    });
    // Initial check
    ensureEssentialBlocks();
}

