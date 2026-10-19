void _wait() {
  pinMode(3, INPUT_PULLUP);
  
  // รอแค่ตอนกดลงไป
  while (digitalRead(3) == HIGH); 
  delay(50); // กันสัญญาณรบกวน (Debounce)

  // เปลี่ยนเป็น OUTPUT ได้เลยทันทีแม้จะยังไม่ปล่อยปุ่ม
  // (ต้องมีตัวต้านทานคั่นในวงจรเท่านั้น!)
  pinMode(3, OUTPUT); 
}

// 1. อ่านค่าเฉลี่ยเซ็นเซอร์
int readAverage(int pin) {
  long s = 0;
  for (int i = 0; i < 50; i++) { s += ADC(pin); delay(10); }
  return s / 50;
}

// 2. ระบบจัดการ EEPROM
void saveCalibrationToEEPROM() {
  int addr = EEPROM_ADDR_BASE;
  for (int i = 0; i < SENSOR_COUNT; i++) {
    EEPROM.put(addr, _max_sensor_values[i]); addr += sizeof(int);
    EEPROM.put(addr, _min_sensor_values[i]); addr += sizeof(int);
  }
  EEPROM.commit();
}

void loadCalibrationFromEEPROM() {
  int addr = EEPROM_ADDR_BASE;
  for (int i = 0; i < SENSOR_COUNT; i++) {
    EEPROM.get(addr, _max_sensor_values[i]); addr += sizeof(int);
    EEPROM.get(addr, _min_sensor_values[i]); addr += sizeof(int);
  }
}

// 3. แสดงตารางสรุปผล (UI เดิมที่สวยงาม)
void showCalibrationRotated() {
  tft_.setRotation(2); tft_.fillScreen(0); tft_.setTextWrap(0);
  tft_.fillRect(0, 0, 128, 26, ST7735_BLUE); 
  tft_.setTextSize(2); tft_.setTextColor(-1); tft_.setCursor(4, 5);
  tft_.print("CAL RESULT");

  tft_.setTextSize(1); tft_.setTextColor(0xFFE0); // Yellow
  tft_.setCursor(5, 34); tft_.print("CH");
  tft_.setCursor(30, 34); tft_.print("MAX");
  tft_.setCursor(65, 34); tft_.print("MIN");
  tft_.setCursor(100, 34); tft_.print("DIF");
  tft_.drawFastHLine(0, 44, 128, 0x5AEB);

  for (int i = 0; i < SENSOR_COUNT; i++) {
    int y = 48 + (i * 13), d = _max_sensor_values[i] - _min_sensor_values[i];
    tft_.setTextColor(-1, 0); tft_.setCursor(5, y); tft_.print(i);
    tft_.setCursor(30, y); tft_.print(_max_sensor_values[i]);
    tft_.setCursor(65, y); tft_.print(_min_sensor_values[i]);
    tft_.setTextColor(0x07E0, 0); tft_.setCursor(100, y); tft_.print(d); 
  }
  tft_.drawFastHLine(0, 148, 128, -1);
  tft_.setTextColor(0x07FF); tft_.setCursor(10, 152); tft_.print("[ PRESS SW1 - OK ]");
  _wait();
}

// 4. ระบบ Calibrate อัตโนมัติ (ย่อข้อความสั้นสุด + ลบหน้าจอ Saved + จบด้วย wait_SW1)
void autoCalibrate() {
  tft_.setRotation(3); tft_.fillScreen(0); tft_.setTextWrap(0);
  
  // STEP 1: WHITE
  tft_.fillRect(0, 0, 160, 26, 0x03E0); // Green Header
  tft_.setTextSize(2); tft_.setTextColor(-1); tft_.setCursor(5, 5); tft_.print("1.WHITE"); 
  tft_.setTextColor(0xFFE0); tft_.setCursor(10, 65); tft_.print("READING...");
  for (int i = 0; i < SENSOR_COUNT; i++) _max_sensor_values[i] = readAverage(_sensorPins[i]);
  buzzer(700, 200);

  // STEP 2: BLACK
  tft_.fillScreen(0); tft_.fillRect(0, 0, 160, 26, 0xF800); // Red Header
  tft_.setTextColor(-1); tft_.setCursor(5, 5); tft_.print("2.BLACK");
  tft_.setCursor(15, 55); tft_.print("ON LINE");
  tft_.setTextColor(0x07FF); tft_.setCursor(15, 85); tft_.print("PRESS SW1");
  _wait();

  tft_.fillRect(0, 30, 160, 98, 0); 
  tft_.setTextColor(0xFFE0); tft_.setCursor(10, 65); tft_.print("READING...");
  for (int i = 0; i < SENSOR_COUNT; i++) _min_sensor_values[i] = readAverage(_sensorPins[i]);
  buzzer(700, 200);

  // สรุปผล
  showCalibrationRotated();

  // บันทึกค่า (ไม่มีหน้าจอแจ้งเตือน ใช้เสียงแทน)
  saveCalibrationToEEPROM(); 
  loadCalibrationFromEEPROM();
  buzzer(1000, 100); delay(100); buzzer(1000, 100);
  delay(5000);

  // จบการทำงาน
  tft_.setRotation(3); tft_.fillScreen(0);
  // wait_SW1(); // เรียกใช้งานฟังก์ชันภายนอกตามที่ระบุ
}

// 5. พิมพ์ค่าทาง Serial
void printCalibrationFromEEPROM() {
  Serial.println("\n--- EEPROM ---");
  for (int i = 0; i < SENSOR_COUNT; i++) {
    Serial.printf("S%d > MIN:%d | MAX:%d\n", i, _min_sensor_values[i], _max_sensor_values[i]);
  }
}