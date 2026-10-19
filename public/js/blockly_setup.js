/**
 * Blockly Setup - Handles block definitions, workspace initialization, and events
 */

// --- Block Definitions ---
Blockly.Blocks['arduino_setup'] = {
    init: function () {
        this.appendDummyInput().appendField("⚙️ Setup");
        this.appendStatementInput("SETUP_CODE").setCheck(null);
        this.setColour(210);
        this.setDeletable(false);
        this.contextMenu = false;
    }
};

Blockly.Blocks['arduino_loop'] = {
    init: function () {
        this.appendDummyInput().appendField("🔄 Loop");
        this.appendStatementInput("LOOP_CODE").setCheck(null);
        this.setColour(120);
        this.setDeletable(false);
        this.contextMenu = false;
    }
};

Blockly.Blocks['config_servo1'] = {
    init: function () {
        this.appendDummyInput().appendField("Servo 1 Degree =").appendField(new Blockly.FieldNumber(110), "DEG1");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setDeletable(false);
        this.setMovable(false);
    }
};

Blockly.Blocks['config_servo2'] = {
    init: function () {
        this.appendDummyInput().appendField("Servo 2 Degree =").appendField(new Blockly.FieldNumber(45), "DEG2");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setDeletable(false);
        this.setMovable(false);
    }
};

Blockly.Blocks['config_calibrate'] = {
    init: function () {
        this.appendDummyInput().appendField("Calibrate EEPROM =").appendField(new Blockly.FieldDropdown([["ON", "1"], ["OFF", "0"]]), "VAL");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
        this.setDeletable(false);
        this.setMovable(false);
    }
};

Blockly.Blocks['config_turn_pid'] = {
    init: function () {
        this.appendDummyInput().appendField("PID Turn (Err").appendField(new Blockly.FieldNumber(1), "ERR").appendField("Min").appendField(new Blockly.FieldNumber(15), "MIN").appendField("Max").appendField(new Blockly.FieldNumber(60), "MAX").appendField("KP").appendField(new Blockly.FieldNumber(1.3), "KP").appendField("KD").appendField(new Blockly.FieldNumber(0.5), "KD").appendField(")");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    }
};

Blockly.Blocks['wait_sw1'] = {
    init: function () {
        this.appendDummyInput().appendField("Wait SW1");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
    }
};

Blockly.Blocks['move_fline'] = {
    init: function () {
        this.appendDummyInput().appendField("Follow Line Speed").appendField(new Blockly.FieldNumber(50), "SPEED").appendField("Pin").appendField(new Blockly.FieldNumber(0), "SENSOR");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['move_notline'] = {
    init: function () {
        this.appendDummyInput().appendField("Forward Notline Speed").appendField(new Blockly.FieldNumber(50), "SPEED").appendField("Time(ms)").appendField(new Blockly.FieldNumber(1000), "DUR");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['move_fline_pass'] = {
    init: function () {
        this.appendDummyInput().appendField("Follow Line Bypass Speed").appendField(new Blockly.FieldNumber(100), "SPEED").appendField("Count").appendField(new Blockly.FieldNumber(1), "COUNT").appendField("Pin").appendField(new Blockly.FieldNumber(0), "SENSOR");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['turn_left'] = {
    init: function () {
        this.appendDummyInput().appendField("Turn Left Speed").appendField(new Blockly.FieldNumber(40), "SPEED");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['turn_left_stop'] = {
    init: function () {
        this.appendDummyInput().appendField("Turn Left Stop");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['turn_left_st'] = {
    init: function () {
        this.appendDummyInput().appendField("Turn Left ST Speed").appendField(new Blockly.FieldNumber(40), "SPEED").appendField("Time(ms)").appendField(new Blockly.FieldNumber(500), "DUR");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['turn_right'] = {
    init: function () {
        this.appendDummyInput().appendField("Turn Right Speed").appendField(new Blockly.FieldNumber(40), "SPEED");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['turn_right_stop'] = {
    init: function () {
        this.appendDummyInput().appendField("Turn Right Stop");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['turn_right_st'] = {
    init: function () {
        this.appendDummyInput().appendField("Turn Right ST Speed").appendField(new Blockly.FieldNumber(40), "SPEED").appendField("Time(ms)").appendField(new Blockly.FieldNumber(500), "DUR");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
    }
};

Blockly.Blocks['check_line'] = {
    init: function () {
        this.appendDummyInput().appendField("Check Line");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
    }
};

Blockly.Blocks['servo_run'] = {
    init: function () {
        this.appendDummyInput().appendField("Servo CH").appendField(new Blockly.FieldNumber(1), "CH").appendField("Degree").appendField(new Blockly.FieldNumber(90), "ANGLE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
    }
};

Blockly.Blocks['delay_custom'] = {
    init: function () {
        this.appendDummyInput().appendField("Delay(ms)").appendField(new Blockly.FieldNumber(1000), "MS");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(290);
    }
};


// --- Workspace Initialization ---
const workspace = Blockly.inject('blocklyDiv', {
    toolbox: '<xml></xml>',
    theme: Blockly.Theme.defineTheme('modernTheme', {
        'base': Blockly.Themes.Classic,
        'componentStyles': {
            'workspaceBackgroundColour': 'transparent',
            'flyoutBackgroundColour': 'var(--bg-solid)',
            'flyoutOpacity': 0.98,
            'scrollbarOpacity': 0.3
        }
    }),
    zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2, pinch: true },
    move: { scrollbars: true, drag: true, wheel: true },
    trashcan: true,
    toolboxPosition: 'start',
    horizontalLayout: false
});

window.workspace = workspace;

// 🛡️ Flyout Width Guard
// Caps flyout width to 50% of the visible workspace area (max 460px).
// Without this, a wide custom block (many inline params) causes blocklyFlyoutBackground
// to expand almost full-screen, making it nearly impossible to drag blocks out.
(function installFlyoutWidthGuard() {
    const flyout = workspace.getFlyout();
    if (!flyout || typeof flyout.getWidth !== 'function') return;

    const _origGetWidth = flyout.getWidth.bind(flyout);
    flyout.getWidth = function () {
        const area = document.getElementById('blocklyDiv');
        const maxW = area
            ? Math.min(Math.floor(area.offsetWidth * 0.50), 460)
            : 460;
        return Math.min(_origGetWidth(), maxW);
    };
})();

// --- Workspace Helpers ---

if (Blockly.ZoomControls) {
    Blockly.ZoomControls.prototype.resetZoom_ = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const ws = this.workspace_;
        const setup = ws.getBlocksByType('arduino_setup')[0];
        const loop = ws.getBlocksByType('arduino_loop')[0];
        ws.setScale(1.0);
        if (setup && loop) {
            const sXY = setup.getRelativeToSurfaceXY();
            const lXY = loop.getRelativeToSurfaceXY();
            const metrics = ws.getMetrics();
            const midX = (sXY.x + lXY.x) / 2;
            const midY = (sXY.y + lXY.y) / 2;
            const targetX = (metrics.viewWidth / 2) - midX;
            const targetY = (metrics.viewHeight / 2) - midY;
            ws.scroll(targetX, targetY);
        } else if (setup) {
            ws.centerOnBlock(setup.id);
        }
    };
}

const originalGetMetrics = workspace.getMetrics.bind(workspace);
workspace.getMetrics = function () {
    const m = originalGetMetrics();
    const div = document.getElementById('blocklyDiv');
    const actualWidth = div ? div.offsetWidth : m.viewWidth;
    const actualHeight = div ? div.offsetHeight : m.viewHeight;

    m.viewWidth = actualWidth;
    m.viewHeight = actualHeight;
    m.absoluteLeft = 0;
    m.absoluteTop = 0;
    m.toolboxWidth = 0;
    m.flyoutWidth = 0;

    // Force stability by ignoring any automated view offsets
    m.viewLeft = -workspace.scrollX;
    m.viewTop = -workspace.scrollY;

    return m;
};

// --- Change Listener ---
let codeGenDebounceTimer;
workspace.addChangeListener((event) => {
    if (event.isUiEvent) return;

    // --- 🛡️ Warning: Manual Edit Mode is Active ---
    if (window.isManualEditing && !window.isEditingCustomBlocks) {
        // Debounce warning to avoid spamming while dragging
        const now = Date.now();
        if (!window._lastManualEditWarning || (now - window._lastManualEditWarning > 5000)) {
            if (typeof window.showStatusNotify === 'function') {
                window.showStatusNotify('คำเตือน', 'คุณอยู่ในโหมดแก้ไขโค้ดเอง! การเปลี่ยนบล็อกจะไม่ส่งผลต่อโค้ดที่คุณพิมพ์อยู่', 'warning');
            }
            window._lastManualEditWarning = now;
        }
    }
    if (event.type === Blockly.Events.BLOCK_CREATE) {
        const block = workspace.getBlockById(event.blockId);
        if (block && (block.type === 'arduino_setup' || block.type === 'arduino_loop')) {
            const allBlocks = workspace.getBlocksByType(block.type);
            if (allBlocks.length > 1) {
                block.dispose(true);
                Swal.fire({
                    title: `<div style="display:flex; align-items:center; gap:18px; text-align:left; padding-left:10px;"><div style="font-size:38px; color:#eab308;"><i class="fa-solid fa-clone fa-bounce"></i></div><span style="font-weight:800; font-size:24px; color:#eab308;">บล็อกนี้มีอยู่แล้ว!</span></div>`,
                    html: `<div style="text-align:left; padding: 0 0 10px 65px; margin-top:-10px;"><div style="font-size:15px; font-weight:600; color:var(--text-main); margin-bottom:6px;">ไม่สามารถสร้างบล็อก <span style="color:var(--primary-color);">${block.type === 'arduino_setup' ? 'Setup' : 'Loop'}</span> เพิ่มได้</div><div style="font-size:13px; color:var(--text-light); opacity:0.8; line-height:1.5;">ระบบอนุญาตให้มีบล็อกหลักได้เพียง 1 บล็อกเท่านั้น โปรดจัดระเบียบโค้ดที่มีอยู่เดิมในพื้นที่ทำงานของคุณ</div></div>`,
                    confirmButtonText: 'รับทราบ',
                    background: 'var(--bg-panel)', width: '450px'
                });
                return;
            }
        }
    }
    window.hasUnsavedChanges = true;
    if (typeof triggerAutoSave === 'function') triggerAutoSave();
    if (codeGenDebounceTimer) clearTimeout(codeGenDebounceTimer);
    codeGenDebounceTimer = setTimeout(() => {
        if (typeof window.generateAndPreviewCode === 'function') window.generateAndPreviewCode();
    }, 400);
});

workspace.addChangeListener((event) => {
    if (event.type === Blockly.Events.CLICK && !event.blockId) {
        const flyout = workspace.getFlyout();
        if (flyout && flyout.isVisible()) {
            flyout.hide();
            window.currentCategoryId = null;
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        }
    }
});

// --- Category & Toolbox Glue ---

const categoryBlocksXML = {
    'setup': `<xml><block type="config_turn_pid"></block></xml>`,
    'movement': `<xml><block type="move_fline"></block><block type="move_notline"></block><block type="move_fline_pass"></block></xml>`,
    'turn': `<xml><block type="turn_left"></block><block type="turn_left_stop"></block><block type="turn_left_st"></block><block type="turn_right"></block><block type="turn_right_stop"></block><block type="turn_right_st"></block></xml>`,
    'action': `<xml><block type="servo_run"></block><block type="wait_sw1"></block><block type="check_line"></block><block type="delay_custom"></block><block type="serial_print"></block><block type="serial_println"></block></xml>`,

    'logic': `<xml><block type="controls_if"></block><block type="logic_compare"></block><block type="logic_operation"></block><block type="logic_boolean"></block></xml>`,
    'loops': `<xml><block type="controls_repeat_ext"></block><block type="controls_whileUntil"></block></xml>`,
    'math': `<xml><block type="math_number"></block><block type="math_arithmetic"></block><block type="math_single"></block></xml>`
};

function loadCategory(catId, btnElement, forceRefresh = false) {
    const flyout = workspace.getFlyout();

    // 🛡️ If already open and NOT a force refresh, toggle it off
    if (window.currentCategoryId === catId && !forceRefresh) {
        flyout.hide();
        window.currentCategoryId = null;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        return;
    }

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    window.currentCategoryId = catId;
    if (btnElement) btnElement.classList.add('active');

    if (catId === 'variables') {
        const flyoutInfo = Blockly.Variables.flyoutCategory(workspace);
        if (Array.isArray(flyoutInfo)) {
            flyout.show(flyoutInfo);
        } else {
            flyout.show(flyoutInfo); // Fallback for older XML
        }
    }
    else if (catId === 'functions') {
        const flyoutInfo = Blockly.Procedures.flyoutCategory(workspace);
        if (Array.isArray(flyoutInfo)) {
            flyout.show(flyoutInfo);
        } else {
            flyout.show(flyoutInfo); // Fallback for older XML
        }
    }
    else if (catId.startsWith('custom_')) {
        let categoryName = catId.replace('custom_', '');
        let xmlStr = '<xml>';
        window.customBlocksData.forEach(cb => {
            if (cb.category === categoryName && !cb.hidden) {
                xmlStr += `<block type="custom_${cb.id}">`;
                if (cb.args) {
                    cb.args.forEach(arg => {
                        if (arg.inputType === 'field_dropdown' || arg.inputType === 'field_input') {
                            // Internal Fields: use <field> tag
                            xmlStr += `<field name="${arg.name}">${arg.defaultVal || (arg.inputType === 'field_input' ? '0' : '')}</field>`;
                        } else {
                            // External Value Inputs: use <value> with <shadow>
                            xmlStr += `<value name="${arg.name}"><shadow type="math_number"><field name="NUM">${arg.defaultVal || 0}</field></shadow></value>`;
                        }
                    });
                }
                xmlStr += `</block>`;
            }
        });
        xmlStr += '</xml>';
        flyout.show(Blockly.utils.xml.textToDom(xmlStr));
    } else {
        flyout.show(Blockly.utils.xml.textToDom(categoryBlocksXML[catId]));
    }

    // ✨ Force background to resize and reposition
    if (flyout.isVisible()) {
        flyout.position();
        if (typeof flyout.reflow === 'function') flyout.reflow();
    }

    flyout.autoClose = false;
}

Blockly.Blocks['serial_print'] = {
    init: function () {
        this.appendValueInput("VALUE").appendField("Serial Print");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
    }
};

Blockly.Blocks['serial_println'] = {
    init: function () {
        this.appendValueInput("VALUE").appendField("Serial Println");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
    }
};

function renderCustomCategories() {
    const container = document.getElementById('dynamicCustomCategories');
    if (!container) return;
    container.innerHTML = '';
    if (!window.customBlocksData || window.customBlocksData.length === 0) return;

    let customCategoriesObj = {};
    window.customBlocksData.forEach(cb => {
        if (!cb.hidden) {
            if (!customCategoriesObj[cb.category]) customCategoriesObj[cb.category] = [];
            customCategoriesObj[cb.category].push(cb);
        }
    });

    let html = '<div class="nav-label">ส่วนเสริม (Extensions)</div>';
    for (let cat in customCategoriesObj) {
        html += `<button class="nav-btn" onclick="loadCategory('custom_${cat}', this)">
                    <div class="nav-btn-icon"><i class="fa-solid fa-puzzle-piece"></i></div>
                    <span>${cat}</span>
                 </button>`;
    }
    container.innerHTML = html;
}

function reloadCustomBlocks() {
    if (!window.customBlocksData) return;
    window.customBlocksData.forEach(cb => {
        Blockly.Blocks[`custom_${cb.id}`] = {
            init: function () {
                const isValueBlock = cb.returnType && cb.returnType !== 'void';
                const isInline = cb.layout !== 'vertical';

                let jsonDef = {
                    "type": `custom_${cb.id}`,
                    "message0": `${(cb.name || "").replace(/%/g, '%%')} %1`,
                    "args0": [{ "type": "field_label", "text": "", "class": `fa-solid ${cb.icon || (cb.isSetup ? 'fa-gear' : 'fa-cube')}` }],
                    "colour": cb.color !== undefined ? cb.color : 230,
                    "inputsInline": isInline,
                    "tooltip": "",
                    "helpUrl": ""
                };

                if (isValueBlock) jsonDef.output = cb.returnType === 'Boolean' ? 'Boolean' : 'Number';
                else { jsonDef.previousStatement = null; jsonDef.nextStatement = null; }

                if (cb.args) {
                    cb.args.forEach((arg, i) => {
                        let argDef;
                        if (arg.inputType === 'field_dropdown') {
                            try {
                                const optSource = arg.options || "";
                                // 🛠️ Robust splitting: handle both "Label:Value" and just "Value"
                                const opts = optSource.split(',').filter(o => o.trim()).map(o => {
                                    const p = o.split(':');
                                    const label = (p[0] || "Option").trim();
                                    const val = (p.length > 1 ? p[1] : p[0]).trim();
                                    return [label, val];
                                });
                                if (opts.length === 0) opts.push(["No Options", "val"]);
                                argDef = { "type": "field_dropdown", "name": arg.name, "options": opts };
                            } catch (e) {
                                console.error("Dropdown parse error:", e);
                                argDef = { "type": "field_input", "name": arg.name, "text": "Error" };
                            }
                        } else if (arg.inputType === 'field_input') {
                            argDef = { "type": "field_input", "name": arg.name, "text": (String(arg.defaultVal) || "0").trim() };
                        } else {
                            argDef = { "type": "input_value", "name": arg.name };
                        }

                        if (isInline) {
                            // Horizontal: Append to message0
                            const pIdx = i + 2;
                            jsonDef.message0 += `  ${arg.name.replace(/%/g, '%%')} %${pIdx}`;
                            jsonDef.args0.push(argDef);
                        } else {
                            // Vertical: New row for each arg
                            const msgIdx = i + 1;
                            jsonDef[`message${msgIdx}`] = `${arg.name.replace(/%/g, '%%')} %1`;
                            jsonDef[`args${msgIdx}`] = [argDef];
                        }
                    });
                }

                this.jsonInit(jsonDef);
            }
        };

        window.codeGenerator.forBlock[`custom_${cb.id}`] = function (block) {
            // 🛡️ Strict Parenting: Block must be inside Setup or Loop to generate code
            let root = block.getRootBlock();
            if (!root || (root.type !== 'arduino_setup' && root.type !== 'arduino_loop')) {
                return (cb.returnType && cb.returnType !== 'void') ? ['0', window.codeGenerator.ORDER_ATOMIC] : '';
            }

            let argsCode = (cb.args || []).map(arg => {
                let val = "";
                if (arg.inputType === 'field_dropdown' || arg.inputType === 'field_input') {
                    val = block.getFieldValue(arg.name);
                } else {
                    val = window.codeGenerator.valueToCode(block, arg.name, window.codeGenerator.ORDER_ATOMIC);
                }
                return val || arg.defaultVal || '0';
            });

            // Use cb.funcName if available, fallback to cb.name
            let funcNameToUse = cb.funcName || cb.name;

            // 🔥 Setup Block: Return EMPTY (Code is injected via header/setup sections instead)
            if (cb.isSetup) {
                return (cb.returnType && cb.returnType !== 'void') ? ['0', window.codeGenerator.ORDER_ATOMIC] : '';
            }

            if (cb.mode === 'manual') {
                let template = cb.code || "";
                argsCode.forEach((val, i) => {
                    template = template.replace(new RegExp(`\\{${i}\\}`, 'g'), val);
                });
                if (cb.returnType && cb.returnType !== 'void') {
                    return [template, window.codeGenerator.ORDER_ATOMIC];
                }
                return template + (template.trim().endsWith(';') ? '\n' : ';\n');
            } else {
                let callCode = `${funcNameToUse}(${argsCode.join(', ')});`;
                if (cb.returnType && cb.returnType !== 'void') {
                    return [`${funcNameToUse}(${argsCode.join(', ')})`, window.codeGenerator.ORDER_ATOMIC];
                }
                return callCode + '\n';
            }
        };
    });
    renderCustomCategories();
    if (window.currentCategoryId && window.currentCategoryId.startsWith('custom_')) {
        let activeBtn = document.querySelector(`.nav-btn[onclick*="'${window.currentCategoryId}'"]`);
        if (activeBtn) {
            loadCategory(window.currentCategoryId, activeBtn, true); // 🔥 Force refresh if still exists
        } else {
            // 🚫 Category is gone (all blocks hidden), hide the ghost flyout
            const flyout = workspace.getFlyout();
            if (flyout) flyout.hide();
            window.currentCategoryId = null;
        }
    }
}



function jumpToSetup() {
    const setupBlock = workspace.getBlocksByType('arduino_setup')[0];
    if (setupBlock) workspace.centerOnBlock(setupBlock.id);
}

function cleanUpWorkspace() {
    workspace.cleanUp();
}

// Global Export Attachment
window.loadCategory = loadCategory;
window.reloadCustomBlocks = reloadCustomBlocks;
window.renderCustomCategories = renderCustomCategories;
window.jumpToSetup = jumpToSetup;
window.cleanUpWorkspace = cleanUpWorkspace;
