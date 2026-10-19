/**
 * Main Entry Point - Handles app initialization and lifecycle
 */

// Global State
window.currentProjectName = localStorage.getItem('rp_project_name') || "";
window.autoScroll = true;
window.customBlocksData = [];
window.editingBlockId = null;
window.isManualEditing = false;
window.originalBlocklyCode = "";
window.generatedCppCode = "";
window.generatedUserCode = "";
window.autoSaveTimer = null;
window.hasUnsavedChanges = false;
window.currentCategoryId = 'setup';
window.defaultWorkspaceXML = `<xml><block type="arduino_setup" deletable="false" x="50" y="50"><statement name="SETUP_CODE"><block type="config_servo1" deletable="false"><field name="DEG1">110</field><next><block type="config_servo2" deletable="false"><field name="DEG2">45</field><next><block type="config_calibrate" deletable="false"><field name="VAL">1</field><next><block type="wait_sw1"></block></next></block></next></block></next></block></statement></block><block type="arduino_loop" deletable="false" x="50" y="300"></block></xml>`;

// --- Lifecycle ---

window.onload = async () => {
    const lastFile = localStorage.getItem('rp_last_file');
    let loaded = false;

    // Ensure Flyout is hidden on start
    if (window.workspace && window.workspace.getFlyout()) window.workspace.getFlyout().hide();

    if (lastFile) {
        window.loadingLastFile = true;
        loaded = await loadFile(lastFile);
    }

    if (!loaded) {
        window.currentProjectName = "";
        updateBadge();
        if(window.workspace) {
            window.workspace.clear();
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(window.defaultWorkspaceXML), window.workspace);
        }
        if (typeof reloadCustomBlocks === 'function') reloadCustomBlocks();

        try {
            const data = await API.listFiles();
            if (data.files && data.files.length > 0) {
                openFileManager(true); // suppressed new project auto-prompt
            } else {
                newProject();
            }
        } catch (e) {
            newProject();
        }
    }

    // Restore scroll position
    const sx = localStorage.getItem('rp_scroll_x');
    const sy = localStorage.getItem('rp_scroll_y');
    if (sx !== null && sy !== null && window.workspace) {
        window.workspace.scroll(parseFloat(sx), parseFloat(sy));
    }

    // Apply color theme
    if (typeof applyTheme === 'function') applyTheme();

    // Remove loading state
    requestAnimationFrame(() => {
        const container = document.getElementById('container');
        if (container) container.classList.remove('is-loading');
    });

    if (window.workspace) {
        Blockly.svgResize(window.workspace);
        // 🛡️ Final Protection: Lock the starting state
        window.workspace.clearUndo();
        if (typeof window.ensureEssentialBlocks === 'function') window.ensureEssentialBlocks();
    }
};

// --- Core Helper Functions ---

async function performAutoSave() {
    if (!window.workspace) return;
    try {
        const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(window.workspace));
        const autoSaveData = JSON.stringify({
            blocks: xml, customBlocks: window.customBlocksData,
            name: window.currentProjectName || '', timestamp: Date.now()
        });
        localStorage.setItem('rp2350_autosave', autoSaveData);

        if (window.currentProjectName) {
            await API.saveProject(window.currentProjectName + '.rp2350', xml, window.customBlocksData, window.generatedCppCode);
            
            // 🧩 Also sync generated User Code (Custom Blocks) to the actual file for Source Manager
            if (window.generatedUserCode && typeof API.writeSrcFile === 'function') {
                await API.writeSrcFile('User.ino', window.generatedUserCode);
                
                // 🔄 CRITICAL: Sync with local Source Manager session if open
                if (window.srcSessions && window.srcSessions['User.ino']) {
                    const userModel = window.srcSessions['User.ino'];
                    if (userModel.getValue() !== window.generatedUserCode) {
                        userModel.setValue(window.generatedUserCode);
                        userModel.originalContent = window.generatedUserCode; // Mark as saved
                        
                        // Update UI dot if present
                        const dot = document.querySelector(`.unsaved-dot-User_ino`);
                        if (dot) dot.style.display = 'none';
                    }
                }
            }

            window.hasUnsavedChanges = false;
        }

        localStorage.setItem('rp_scroll_x', window.workspace.scrollX);
        localStorage.setItem('rp_scroll_y', window.workspace.scrollY);
    } catch (error) { }
}
window.saveProject = performAutoSave; // 🌍 Global helper

function autoSaveProject() {
    if (window.autoSaveTimer) clearInterval(window.autoSaveTimer);
    window.autoSaveTimer = setInterval(performAutoSave, 60000);
}
autoSaveProject();

function triggerAutoSave() {
    if (window.autoSaveDebounceTimer) clearTimeout(window.autoSaveDebounceTimer);
    window.autoSaveDebounceTimer = setTimeout(performAutoSave, 2000);
}

// Global Exports
window.triggerAutoSave = triggerAutoSave;

// ============================================================
// 🛡️ UNIVERSAL BLOCKLY RESIZE GUARDIAN
// Automatically re-measures workspace whenever ANYTHING changes
// the container size — Swal dialogs, panel toggles, etc.
// This is the permanent fix for the "sinking UI" bug.
// ============================================================
(function installBlocklyResizeGuardian() {
    let resizeDebounce = null;


    function safeResize() {
        if (!window.workspace) return;
        const div = document.getElementById('blocklyDiv');
        if (!div || div.offsetWidth === 0 || div.offsetHeight === 0) return;
        try { 
            Blockly.svgResize(window.workspace); 
            if (typeof window.workspace.resizeContents === 'function') {
                window.workspace.resizeContents();
            }
        } catch (e) { /* ignore */ }
    }

    function scheduledResize() {
        clearTimeout(resizeDebounce);
        resizeDebounce = setTimeout(() => {
            safeResize();
            // Second pass after browser fully settles
            requestAnimationFrame(safeResize);
        }, 50);
    }

    // 1️⃣ Watch blocklyDiv size changes directly
    const blocklyDiv = document.getElementById('blocklyDiv');
    if (blocklyDiv && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(scheduledResize);
        ro.observe(blocklyDiv);
    }

    // 2️⃣ Watch body class changes — catches swal2-shown being removed
    //    This is the KEY fix: when Swal closes, body loses 'swal2-shown'
    //    and the layout reverts. We catch that moment and resize.
    const bodyObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                const hadSwal = m.oldValue && m.oldValue.includes('swal2-shown');
                const hasSwal = document.body.classList.contains('swal2-shown');
                if (hadSwal && !hasSwal) {
                    // Swal just closed — body layout restored — resize now
                    scheduledResize();
                    setTimeout(safeResize, 200); // Extra pass for safety
                }
            }
        }
    });
    bodyObserver.observe(document.body, { attributes: true, attributeOldValue: true });

    // 3️⃣ Also catch native window resize events
    window.addEventListener('resize', scheduledResize);
})();

// Utils
function escapeHtml(unsafe) {
    if(!unsafe) return "";
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
window.escapeHtml = escapeHtml;
