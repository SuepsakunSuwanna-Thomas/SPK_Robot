/**
 * Generators - Defines how Blockly blocks are converted to C++ code for RP2350
 */

// Initialize the JavaScript generator (we reuse it for C++ generation)
window.codeGenerator = javascript.javascriptGenerator;

// --- Built-in Procedures ---
window.codeGenerator.forBlock['procedures_defnoreturn'] = function (block) {
    var funcName = window.codeGenerator.nameDB_.getName(block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
    var branch = window.codeGenerator.statementToCode(block, 'STACK');
    var args = [];
    var variables = block.getVars();
    for (var i = 0; i < variables.length; i++) {
        args[i] = 'int ' + window.codeGenerator.nameDB_.getName(variables[i], Blockly.VARIABLE_CATEGORY_NAME);
    }
    return `void ${funcName}(${args.join(', ')}) {\n${branch}}\n`;
};

window.codeGenerator.forBlock['procedures_callnoreturn'] = function (block) {
    var funcName = window.codeGenerator.nameDB_.getName(block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
    var args = [];
    var variables = block.arguments_ || [];
    for (var i = 0; i < variables.length; i++) {
        args[i] = window.codeGenerator.valueToCode(block, 'ARG' + i, window.codeGenerator.ORDER_NONE) || '0';
    }
    return `${funcName}(${args.join(', ')});\n`;
};

window.codeGenerator.forBlock['procedures_defreturn'] = function (block) {
    var funcName = window.codeGenerator.nameDB_.getName(block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
    var branch = window.codeGenerator.statementToCode(block, 'STACK');
    var returnValue = window.codeGenerator.valueToCode(block, 'RETURN', window.codeGenerator.ORDER_NONE) || '';
    if (returnValue) {
        returnValue = '  return ' + returnValue + ';\n';
    }
    var args = [];
    var variables = block.getVars();
    for (var i = 0; i < variables.length; i++) {
        args[i] = 'int ' + window.codeGenerator.nameDB_.getName(variables[i], Blockly.VARIABLE_CATEGORY_NAME);
    }
    var returnType = returnValue ? 'int' : 'void';
    return `${returnType} ${funcName}(${args.join(', ')}) {\n${branch}${returnValue}}\n`;
};

window.codeGenerator.forBlock['procedures_callreturn'] = function (block) {
    var funcName = window.codeGenerator.nameDB_.getName(block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
    var args = [];
    var variables = block.arguments_ || [];
    for (var i = 0; i < variables.length; i++) {
        args[i] = window.codeGenerator.valueToCode(block, 'ARG' + i, window.codeGenerator.ORDER_NONE) || '0';
    }
    return [`${funcName}(${args.join(', ')})`, window.codeGenerator.ORDER_FUNCTION_CALL];
};

// --- Core Arduino / Robot Blocks ---
window.codeGenerator.forBlock['arduino_setup'] = function (block) {
    const statements = window.codeGenerator.statementToCode(block, 'SETUP_CODE');
    return `//---SETUP_START---\n${statements}//---SETUP_END---\n`;
};

window.codeGenerator.forBlock['arduino_loop'] = function (block) {
    const statements = window.codeGenerator.statementToCode(block, 'LOOP_CODE');
    return `//---LOOP_START---\n${statements}//---LOOP_END---\n`;
};

window.codeGenerator.forBlock['config_servo1'] = function (block) {
    return `degree_servo1 = ${block.getFieldValue('DEG1')};\n`;
};

window.codeGenerator.forBlock['config_servo2'] = function (block) {
    return `degree_servo2 = ${block.getFieldValue('DEG2')};\n`;
};

window.codeGenerator.forBlock['config_calibrate'] = function (block) {
    return `Calibrate_EEPROM = ${block.getFieldValue('VAL')};\n`;
};

window.codeGenerator.forBlock['config_turn_pid'] = function (block) {
    const err = block.getFieldValue('ERR'),
          min = block.getFieldValue('MIN'),
          max = block.getFieldValue('MAX'),
          kp = block.getFieldValue('KP'),
          kd = block.getFieldValue('KD');
    return `set_data_for_turnDirection(${err}, ${min}, ${max}, ${kp}, ${kd});\n`;
};

window.codeGenerator.forBlock['wait_sw1'] = function (block) {
    return `wait_SW1();\n`;
};

window.codeGenerator.forBlock['move_fline'] = function (block) {
    return `Fline(${block.getFieldValue('SPEED')}, ${block.getFieldValue('SENSOR')});\n`;
};

window.codeGenerator.forBlock['move_notline'] = function (block) {
    return `Follow_Notline(${block.getFieldValue('SPEED')}, ${block.getFieldValue('DUR')});\n`;
};

window.codeGenerator.forBlock['move_fline_pass'] = function (block) {
    return `Fline_by_pass(${block.getFieldValue('SPEED')}, ${block.getFieldValue('COUNT')}, ${block.getFieldValue('SENSOR')});\n`;
};

window.codeGenerator.forBlock['turn_left'] = function (block) {
    return `turnLeft(${block.getFieldValue('SPEED')});\n`;
};

window.codeGenerator.forBlock['turn_left_stop'] = function (block) {
    return `turnLeft_by_stop();\n`;
};

window.codeGenerator.forBlock['turn_left_st'] = function (block) {
    return `turnLeft_by_ST(${block.getFieldValue('SPEED')}, ${block.getFieldValue('DUR')});\n`;
};

window.codeGenerator.forBlock['turn_right'] = function (block) {
    return `turnRight(${block.getFieldValue('SPEED')});\n`;
};

window.codeGenerator.forBlock['turn_right_stop'] = function (block) {
    return `turnRight_by_stop();\n`;
};

window.codeGenerator.forBlock['turn_right_st'] = function (block) {
    return `turnRight_by_ST(${block.getFieldValue('SPEED')}, ${block.getFieldValue('DUR')});\n`;
};

window.codeGenerator.forBlock['check_line'] = function (block) {
    return `checkLine();\n`;
};

window.codeGenerator.forBlock['servo_run'] = function (block) {
    return `servoRun(${block.getFieldValue('CH')}, ${block.getFieldValue('ANGLE')});\n`;
};

window.codeGenerator.forBlock['serial_print'] = function (block) {
    const val = window.codeGenerator.valueToCode(block, 'VALUE', window.codeGenerator.ORDER_ATOMIC) || '""';
    return `Serial.print(${val});\n`;
};

window.codeGenerator.forBlock['serial_println'] = function (block) {
    const val = window.codeGenerator.valueToCode(block, 'VALUE', window.codeGenerator.ORDER_ATOMIC) || '""';
    return `Serial.println(${val});\n`;
};
window.codeGenerator.forBlock['delay_custom'] = function (block) {
    return `delay(${block.getFieldValue('MS')});\n`;
};
