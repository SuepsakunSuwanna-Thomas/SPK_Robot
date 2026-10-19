#include <SoftwareSerial.h> // เพิ่มไลบรารีสำหรับการจำลองพอร์ต Serial

// สร้างออบเจ็กต์จำลองพอร์ต โดยให้ขา 39 เป็น RX และขา TX ใส่เป็น -1 เพราะไม่ได้ใช้ส่งข้อมูลกลับ
SoftwareSerial myHC05(39, -1); 

String bt_data = ""; 
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
    if (c == '\n' || c == '\r') {
      if (bt_data.length() > 0) {
        processBTCommand(bt_data);
        bt_data = "";
      }
    } else {
      bt_data += c;
      // ป้องกันข้อมูลขยะสะสมจนบอร์ดแฮงค์ หากข้อความยาวเกินไปให้ล้างทิ้ง
      if (bt_data.length() > 40) {
        bt_data = ""; 
      }
    }
  }

  // 2. ตรวจสอบการรับข้อมูลจากช่อง USB (คอมพิวเตอร์)
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (bt_data.length() > 0) {
        processBTCommand(bt_data);
        bt_data = "";
      }
    } else {
      bt_data += c;
      // ป้องกันข้อมูลขยะสะสมจนบอร์ดแฮงค์ หากข้อความยาวเกินไปให้ล้างทิ้ง
      if (bt_data.length() > 40) {
        bt_data = ""; 
      }
    }
  }

  // ระบบ Watchdog ตัดการทำงานเมื่อขาดการติดต่อจากหน้าเว็บ (ปล่อยมือ)
  if (is_bt_controlling && (millis() - last_bt_time > 300)) {
    ao();
    is_bt_controlling = false;
    Serial.println("-> Auto STOP: สัญญาณขาดหาย");
  }
}

void processBTCommand(String cmdLine) {
  cmdLine.trim();
  int idx = 0;
  String args[10];
  int startIdx = 0;
  for (int i = 0; i < cmdLine.length(); i++) {
    if (cmdLine.charAt(i) == ',') {
      args[idx++] = cmdLine.substring(startIdx, i);
      startIdx = i + 1;
    }
  }
  args[idx] = cmdLine.substring(startIdx);
  
  String cmd = args[1];
  last_bt_time = millis();

  Serial.println(">> รับคำสั่ง: " + cmdLine);

  if (cmd == "START") { 
    bt_start_flag = true; 
  }
  else if (cmd == "RST") { 
    // สั่งฮาร์ดรีเซ็ตทันทีที่อ่านเจอคำสั่ง ไม่ต้องรอการทำงานอื่น
    rp2040.reboot(); 
  }
  else if (cmd == "CAL") { 
    autoCalibrate(); 
  }
  else if (cmd == "PIDP") {
    is_bt_controlling = false;
    Fline_by_pass_tune(args[2].toInt(), args[3].toFloat(), args[4].toFloat(), args[5].toInt(), args[6].toInt());
    ao(); 
  }
  else if (cmd == "PIDH") {
    is_bt_controlling = true;  
    lineFollow_PID(args[2].toInt(), args[3].toFloat(), 0.0, args[4].toFloat());
  }
  else if (cmd == "STOP") { 
    is_bt_controlling = false; 
    ao(); 
  }
  else if (cmd == "SRV") { 
    servoRun(args[2].toInt(), args[3].toInt());
  }
  else if (cmd == "JOY") {
    is_bt_controlling = true;  
    motor(1, args[2].toInt() - L1);
    motor(2, args[3].toInt() - R1);
    motor(3, args[4].toInt() - L2);
    motor(4, args[5].toInt() - R2);
  }
  else if (cmd == "GYRO_RST") { 
    status_resetYaw = 1; 
  }
  else if (cmd == "ANGT") { 
    is_bt_controlling = false;
    turnByAngle_fix(args[2].toInt(), 0); 
    ao(); 
  }
  else if (cmd == "ANGW") {
    is_bt_controlling = true;  
    float kp_s = 1.5;
    float err = normalizeAngle(args[2].toInt() - Con_yaw_loop1);
    int spd = 40;
    motor(1, (spd + (kp_s * err)) - L1);
    motor(2, (spd - (kp_s * err)) - R1);
    motor(3, (spd + (kp_s * err)) - L2);
    motor(4, (spd - (kp_s * err)) - R2);
  }
}

void Fline_by_pass_tune(int spd, float kp, float kd, int count, int sn) {
  for (int i = 0; i < count; i++) {
    while (!(ADC(sn) < refSensor(sn))) {
      lineFollow_PID(spd, kp, 0.0, kd);
      checkBluetooth(); // รับคำสั่งตลอดเวลาเพื่อไม่ให้ค้าง
      delay(1);
    }
    while (ADC(sn) > refSensor(sn)) {
      fd(spd * 0.7);
      delay(10);
    }
  }
  ao();
}