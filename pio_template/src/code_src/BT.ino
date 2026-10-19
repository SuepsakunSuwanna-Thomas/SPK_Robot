#include "common.h"
#include <SoftwareSerial.h> // เพิ่มไลบรารีสำหรับการจำลองพอร์ต Serial

// สร้างออบเจ็กต์จำลองพอร์ต โดยให้ขา 39 เป็น RX และขา TX ใส่เป็น -1 เพราะไม่ได้ใช้ส่งข้อมูลกลับ
SoftwareSerial myHC05(39, -1); 

#define BT_BUFFER_SIZE 64
volatile char btBuffer[BT_BUFFER_SIZE];
volatile uint8_t btIndex = 0;

unsigned long last_bt_time = 0;      
bool is_bt_controlling = false;      

void setupBT() {
  // ตั้งค่าความเร็วช่อง USB (คอมพิวเตอร์)
  Serial.begin(115200);
  
  // ตั้งค่าความเร็วช่อง SoftwareSerial (Bluetooth ขา 39)
  myHC05.begin(9600);
  delay(100);
  
  // ล้างข้อมูลขยะที่อาจค้างอยู่ในบัฟเฟอร์ตอนบอร์ดรีบูตของทั้งสองพอร์ต
  while(myHC05.available()) myHC05.read(); 
  while(Serial.available()) Serial.read(); 
}

void checkBluetooth() {
  // 1. ตรวจสอบการรับข้อมูลจากช่อง Bluetooth (ขา 39)
  while (myHC05.available()) {
    char c = myHC05.read();
    if (btIndex >= BT_BUFFER_SIZE - 1) {
      btIndex = 0; // Reset buffer if overflow
      continue;
    }
    
    if (c == '\n' || c == '\r') {
      if (btIndex > 0) {
        btBuffer[btIndex] = '\0';
        processBTCommand((const char*)btBuffer);
        btIndex = 0;
      }
    } else {
      btBuffer[btIndex++] = c;
    }
  }

  // 2. ตรวจสอบการรับข้อมูลจากช่อง USB (คอมพิวเตอร์)
  while (Serial.available()) {
    char c = Serial.read();
    if (btIndex >= BT_BUFFER_SIZE - 1) {
      btIndex = 0; // Reset buffer if overflow
      continue;
    }
    
    if (c == '\n' || c == '\r') {
      if (btIndex > 0) {
        btBuffer[btIndex] = '\0';
        processBTCommand((const char*)btBuffer);
        btIndex = 0;
      }
    } else {
      btBuffer[btIndex++] = c;
    }
  }

  // ระบบ Watchdog ตัดการทำงานเมื่อขาดการติดต่อจากหน้าเว็บ (ปล่อยมือ)
  if (is_bt_controlling && (millis() - last_bt_time > 300)) {
    ao();
    is_bt_controlling = false;
    Serial.println("-> Auto STOP: สัญญาณขาดหาย");
  }
}

void processBTCommand(const char* cmdLine) {
  if (!cmdLine || strlen(cmdLine) == 0) return;
  
  char cmdCopy[BT_BUFFER_SIZE];
  strncpy(cmdCopy, cmdLine, BT_BUFFER_SIZE - 1);
  cmdCopy[BT_BUFFER_SIZE - 1] = '\0';
  
  // Trim whitespace
  char* trimmed = cmdCopy;
  while (*trimmed == ' ' || *trimmed == '\t') trimmed++;
  
  // Count commas
  int commaCount = 0;
  for (char* p = trimmed; *p; p++) {
    if (*p == ',') commaCount++;
  }
  
  if (commaCount < 1) {
    Serial.println("ERROR: Invalid format - missing command");
    return;
  }
  
  char* args[10];
  int argCount = 0;
  char* token = strtok(trimmed, ",");
  while (token && argCount < 10) {
    args[argCount++] = token;
    token = strtok(NULL, ",");
  }
  
  if (argCount < 2) {
    Serial.println("ERROR: Missing command");
    return;
  }
  
  String cmd = String(args[1]);
  last_bt_time = millis();

  Serial.println(">> รับคำสั่ง: " + String(cmdLine));

  if (cmd == "START") { 
    bt_start_flag = true; 
  }
  else if (cmd == "RST") { 
    rp2040.reboot(); 
  }
  else if (cmd == "CAL") { 
    autoCalibrate(); 
  }
  else if (cmd == "PIDP" && argCount >= 7) {
    is_bt_controlling = false;
    Fline_by_pass_tune(atoi(args[2]), atof(args[3]), atof(args[4]), atoi(args[5]), atoi(args[6]));
    ao(); 
  }
  else if (cmd == "PIDH" && argCount >= 5) {
    is_bt_controlling = true;
    lineFollow_PID(atoi(args[2]), atof(args[3]), 0.0, atof(args[4]));
  }
  else if (cmd == "STOP") { 
    is_bt_controlling = false; 
    ao(); 
  }
  else if (cmd == "SRV" && argCount >= 4) { 
    servoRun(atoi(args[2]), atoi(args[3]));
  }
  else if (cmd == "JOY" && argCount >= 6) {
    is_bt_controlling = true;  
    motor(1, atoi(args[2]) - L1);
    motor(2, atoi(args[3]) - R1);
    motor(3, atoi(args[4]) - L2);
    motor(4, atoi(args[5]) - R2);
  }
  else if (cmd == "GYRO_RST") { 
    status_resetYaw = 1; 
  }
  else if (cmd == "ANGT" && argCount >= 3) { 
    is_bt_controlling = false;
    turnByAngle_fix(atoi(args[2]), 0); 
    ao(); 
  }
  else if (cmd == "ANGW" && argCount >= 3) {
    is_bt_controlling = true;  
    float kp_s = 1.5;
    float err = normalizeAngle(atoi(args[2]) - Con_yaw_loop1);
    int spd = 40;
    motor(1, (spd + (kp_s * err)) - L1);
    motor(2, (spd - (kp_s * err)) - R1);
    motor(3, (spd + (kp_s * err)) - L2);
    motor(4, (spd - (kp_s * err)) - R2);
  }
  else {
    Serial.println("ERROR: Unknown command: " + cmd);
  }
}

void Fline_by_pass_tune(int spd, float kp, float kd, int count, int sn) {
  for (int i = 0; i < count; i++) {
    while (!(ADC(sn) < refSensor(sn))) {
      lineFollow_PID(spd, kp, 0.0, kd);
      checkBluetooth(); // รับคำสั่งตลอดเวลาเพื่อไม่ให้ค้าง
      delay(1);
    }
    while (ADC(sn) < refSensor(sn)) {
      fd(spd * 0.7);
      delay(10);
    }
  }
  ao();
}