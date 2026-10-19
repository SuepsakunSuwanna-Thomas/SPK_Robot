void wait_SW1()
{
  loadCalibrationFromEEPROM();
  int state_waitSW1 = 0;
  const unsigned long longPressTime = 2000; // 2 วินาทีสำหรับกดค้าง
  unsigned long pressStart = 0;
  unsigned long lastScreenUpdate = 0;

  pinMode(3, INPUT_PULLUP);
  tft_.setTextSize(2);
  tft_.fillScreen(ST7735_BLACK);

  // --- สีแถบพื้นหลัง (สีน้ำเงินเข้มหม่นๆ) ---
  uint16_t barBgColor = 0x18E3;
  bt_start_flag = false;

  while (true){
  
    checkBluetooth();
    // ถ้ามีการกดปุ่มหรือสั่งจาก Web ให้หลุดลูปออกไปเช็คเงื่อนไขถัดไป
    if (digitalRead(3) == 0 || bt_start_flag)
    break;

    if (millis() - lastScreenUpdate >= 300)
    {
      lastScreenUpdate = millis();

      // 1. แสดงค่า ADC (พื้นหลังดำปกติ)
      tft_.setTextColor(ST7735_WHITE, ST7735_BLACK);

      drawString("0=" + String(ADC(0)) + "  ", 0, 0);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("1=" + String(ADC(1)) + "  ", 80, 0);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("2=" + String(ADC(2)) + "  ", 0, 17);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("3=" + String(ADC(3)) + "  ", 80, 17);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("4=" + String(ADC(4)) + "  ", 0, 34);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("5=" + String(ADC(5)) + "  ", 80, 34);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("6=" + String(ADC(6)) + "  ", 0, 51);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("7=" + String(ADC(7)) + "  ", 80, 51);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("8=" + String(ADC(8)) + "  ", 0, 68);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("9=" + String(ADC(9)) + "  ", 80, 68);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("10=" + String(ADC(10)) + " ", 0, 85);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      drawString("G=" + String((int)Con_yaw_loop1) + "  ", 80, 85);
      if (digitalRead(3) == 0 || bt_start_flag)
      break;

      // --- 2. วาดแถบพื้นหลังทึบและข้อความกะพริบ ---
      tft_.fillRect(0, 102, 160, 26, barBgColor);
      state_waitSW1 = !state_waitSW1;

      if (state_waitSW1)
      {
        tft_.setTextColor(ST7735_YELLOW, barBgColor);
      }
      else
      {
        tft_.setTextColor(ST7735_WHITE, barBgColor);
      }
      drawString("SW1 OR WEB", 20, 107);
    }
  }

  // ==========================================
  //  ตรวจจับ Long Press (สำหรับปุ่มบนบอร์ด)
  // ==========================================
  if (digitalRead(3) == 0)
  {
    pressStart = millis();
    while (digitalRead(3) == 0)
    {
      // เมื่อกดค้างจนครบเวลา (2 วินาที)
      if (millis() - pressStart >= longPressTime)
      {
        if (Calibrate_EEPROM == 1)
        {
          // ถ้าเป็น 1 ให้เข้าไป Calibrate
          autoCalibrate();
          tft_.fillScreen(ST7735_BLACK);
          digitalWrite(3, LOW);
          pinMode(3, OUTPUT);
          return; // จบการทำงานกลับไปยังจุดที่เรียกใช้ wait_SW1 ทันที
        }
        else
        {
          // ถ้าเป็น 0 ให้เด้งหลุดออกจากลูปทันที (ทำงานเหมือนกดสั้น)
          break;
        }
      }
    }
  }

  // ==========================================
  //  ส่วนเริ่มทำงานปกติ (Short Press หรือ สั่งจาก Web หรือ Calibrate_EEPROM == 0)
  // ==========================================
  digitalWrite(3, LOW);
  pinMode(3, OUTPUT);

  tft_.fillScreen(ST7735_BLACK);

  // เสียง Buzzer 4 จังหวะ
  buzzer(500, 100);
  delay(200);
  buzzer(700, 100);
  delay(200);
  buzzer(1000, 100);
  delay(200);
  buzzer(2000, 100);
  delay(500);

  bt_start_flag = false;
  
  // Timer logic for autonomous run
  extern unsigned long run_start_time;
  run_start_time = millis();
}

void resetDriveEncoder()
{
  resetEncoder(selection_Encoder); // ระบุหมายเลขมอเตอร์ (1 หรือ 2)
}

// ฟังก์ชันวิ่งตรง
void f(int speeds, int pulses)
{
  resetDriveEncoder();
  Serial.println(get_pulse_Encoder(1));

  // วิ่งตามเส้นจนค่า encoder >= pulses
  while (get_pulse_Encoder(1) < pulses)
  {
    fd(speeds);
    delay(1);
  }
  ao();
}

// ฟังก์ชันวิ่งเลี้ยวขวา
void R_2(int speeds, int pulses)
{
  if (pulses == 0)
  {
    pulses = R_0;
  }
  else if (pulses == 1)
  {
    pulses = R_1;
  }

  resetDriveEncoder();
  Serial.println(get_pulse_Encoder(1));

  while (get_pulse_Encoder(1) < pulses)
  {
    lineFollow_PID(speeds, 0.45, 0.0, 16.5);
    delay(1);
  }
  ao();
  delay(10);
  turnRight(40);
  delay(30);
}

// ฟังก์ชันวิ่งเลี้ยวซ้าย
void L_2(int speeds, int pulses)
{
  if (pulses == 0)
  {
    pulses = L_0;
  }
  else if (pulses == 1)
  {
    pulses = L_1;
  }

  resetDriveEncoder();
  Serial.println(get_pulse_Encoder(1));

  while (get_pulse_Encoder(1) < pulses)
  {
    lineFollow_PID(speeds, 0.45, 0.0, 15.8);
    delay(1);
  }
  ao();
  delay(10);
  delay(20);
}

void repeatPattern(int rounds)
{
  for (int i = 0; i < rounds; i++)
  {
    Fline_by_pass(100, 3, 0);
    turnLeft(43);
    Fline_by_pass(100, 2, 0);
    turnLeft(43);
    Fline_by_pass(100, 3, 0);
    turnLeft(43);
    Fline_by_pass(100, 2, 0);
    turnLeft(43);
    //   Fline_by_time(50, 0.45, 8.5, 300);
    //   turnLeft_by_stop();
    //   // delay(1000);
    // Fline_by_pass(100,3,0);
    //   Fline_by_time(50, 0.45, 8.5, 300);
    //   turnLeft_by_stop();
  }
}

bool readSensor(int ch)
{
  int value = ADC(ch);
  return (value <= refSensor(ch)); // true = ดำ, false = ขาว
}

void checkLine()
{
  bool s3 = readSensor(3);
  bool s4 = readSensor(4);

  // ✅ ถ้าเซ็นเซอร์ 3 และ 4 เจอดำพร้อมกัน = อยู่ตรงเส้น
  if (s3 && s4)
  {
    ao();
    return;
  }

  // ถ้าเส้นอยู่ทางซ้าย (sensor 0,1,2)
  if (readSensor(0) || readSensor(1) || readSensor(2))
  {
    // หมุนซ้ายจนกว่า sensor 3 และ 4 จะเจอดำพร้อมกัน
    while (!(readSensor(3) && readSensor(4)))
    {
      sl(20);
      delay(5);
    }
    ao();
    return;
  }

  // ถ้าเส้นอยู่ทางขวา (sensor 5,6)
  if (readSensor(5) || readSensor(6))
  {
    // หมุนขวาจนกว่า sensor 3 และ 4 จะเจอดำพร้อมกัน
    while (!(readSensor(3) && readSensor(4)))
    {
      sr(20);
      delay(5);
    }
    ao();
    return;
  }
}

void Fline_by_pass2(int maxspeeds, int lowspeeds, int count, int Numsensor, float max_distance)
{
  for (int i = 0; i < count; i++)
  {
    float current_speed = maxspeeds; // ความเร็วปกติ 100%

    // ถ้าเป็นทางแยกที่ 3 (i == 2) ให้ค่อยๆ ลดความเร็ว
    if (i == count - 1)
    {
      // คำนวณระยะทางระหว่างทางแยกที่ count และ count-1
      float distance = 0;
      // float max_distance = 500; // ระยะทางที่ต้องการลดความเร็ว (ปรับค่าได้)

      while (!(ADC(Numsensor) < refSensor(Numsensor)))
      {
        // คำนวณความเร็วแบบ linear interpolation
        current_speed = maxspeeds * (1 - (distance / max_distance)) + (maxspeeds * (lowspeeds / 100) * (distance / max_distance));

        // lineFollow_PID(current_speed, 0.58, 0.00, 11.05);
        lineFollow_PID_auto(current_speed);
        delay(1);
        distance++;

        // จำกัดระยะทางสูงสุด
        if (distance >= max_distance)
        distance = max_distance;
      }
    }
    else
    {
      // ทางแยกที่ 1 และ 2 ใช้ความเร็วเต็ม
      while (!(ADC(Numsensor) < refSensor(Numsensor)))
      {
        // lineFollow_PID(current_speed, 0.58, 0.00, 11.05);
        lineFollow_PID_auto(current_speed);
        delay(1);
      }
    }

    // เคลื่อนที่ผ่านทางแยก
    while (ADC(Numsensor) < refSensor(Numsensor))
    {
      fd(current_speed * 0.9);
      delay(1);
    }
  }
  ao();
  delay(10);
}

void lineFollow_PID_auto(int speed)
{
  float KP = 0.38; // 0.3//0.58//0.4//0.58
  float KD;
  // lineFollow_PID(speeds, 0.45, 0.0, 15.8);

  if (speed >= 100)
  {
    KD = 12.3; // 14.7//15.5//11.05//16.8//13.5
  }
  else if (speed >= 90)
  {
    KD = 14.5;
  }
  else if (speed >= 80)
  {
    KD = 12.9;
  }
  else if (speed >= 70)
  {
    KD = 10.5;
  }
  else if (speed >= 60)
  {
    KD = 8.8; // 8.8
  }
  else if (speed >= 50)
  {
    KD = 7.5;
  }
  else if (speed >= 40)
  {
    KD = 7.5;
  }
  else if (speed >= 30)
  {
    KD = 5.5;
  }
  else if (speed >= 20)
  {
    KD = 3.2;
  }
  else if (speed >= 10)
  {
    KD = 1.0;
  }
  else
  {
    KD = 6.10; // ค่ามาตรฐาน
  }

  lineFollow_PID(speed, KP, 0.0, KD); // 17.5//18.5
}

void Fline(int speeds, int Numsensor)
{
  while (!(ADC(Numsensor) < refSensor(Numsensor)))
  {
    lineFollow_PID_auto(speeds); // kp=0.35,kd=3.15
    delay(1);
  }
  ao();
  delay(1);
}

void back(int speeds, int Numsensor)
{
  while (!(ADC(Numsensor) < refSensor(Numsensor)))
  {
    bk(speeds);
    delay(1);
  }
  ao();
  delay(1);
}

void BackUntilWhite(int Numsensor)
{
  while (ADC(Numsensor) > refSensor(Numsensor))
  {
    bk(30);
    delay(5);
  }
  bk(20);
  delay(70);
  ao();
}

void Fline_by_time(int RUN_PID_speed, float RUN_PID_KP, float RUN_PID_KD, unsigned long duration)
{
  unsigned long startTime = millis();

  while (true)
  {
    unsigned long elapsed = millis() - startTime;
    unsigned long remaining = duration - elapsed;

    int setpoint = ((_NumofSensor - 1) * 100) / 2;
    int present_position = readline();

    errors = present_position - setpoint;
    derivative = errors - _previous_error;
    output = RUN_PID_KP * errors + RUN_PID_KD * derivative;

    // ลดความเร็วเมื่อใกล้ครบเวลา
    int currentMaxSpeed = RUN_PID_speed;
    if (remaining < 400)
    {
      currentMaxSpeed = map(remaining, 400, 0, RUN_PID_speed, 20);
    }

    int motorL = constrain(currentMaxSpeed + output, -currentMaxSpeed, currentMaxSpeed);
    int motorR = constrain(currentMaxSpeed - output, -currentMaxSpeed, currentMaxSpeed);

    motor(1, motorL - L1);
    motor(2, motorR - R1);
    motor(3, motorL - L2);
    motor(4, motorR - R2);

    _previous_error = errors; // update ค่าไว้ใช้รอบต่อไป

    if (remaining <= 3)
    {
      ao();
      break;
    }
  }
  ao();
  delay(1);
}

void Follow_Notline(int speeds, unsigned long duration)
{
  // เดินหน้าไม่เดินบนเส้น แตเดินตามเวลาที่กำหนด
  unsigned long startTime;
  bool isRunning = false;
  if (!isRunning)
  {
    startTime = millis(); // เริ่มจับเวลาเมื่อเริ่มทำงานครั้งแรก
    isRunning = true;
  }
  while (true)
  {
    // คำนวณเวลาที่เหลือ
    unsigned long elapsed = millis() - startTime;
    unsigned long remaining = duration - elapsed;
    int currentMaxSpeed = speeds;
    if (remaining < 500)
    { // เริ่มลดความเร็วในช่วง 400 มิลลิวินาทีสุดท้าย
    currentMaxSpeed = map(remaining, 500, 0, speeds, 0);
  }
  int motorL = currentMaxSpeed;
  int motorR = currentMaxSpeed - 1;
  motor(1, motorL - L1);
  motor(2, motorR - R1);
  motor(3, motorL - L2);
  motor(4, motorR - R2);

  // หยุดการทำงานเมื่อครบเวลา
  if (remaining <= 3)
  {
    ao();
    isRunning = false; // รีเซ็ตสถานะ
    break;
  }
}
ao();
delay(1);
}

void Fline_by_pass(int speeds, int count, int Numsensor)
{
  for (int i = 0; i < count; i++)
  {
    // รอจนกว่าจะเจอเส้นดำ
    while (!(ADC(Numsensor) < refSensor(Numsensor)))
    {
      lineFollow_PID_auto(speeds);
      delay(1);
    }
    // วิ่งต่อจนกว่าจะพ้นเส้นดำ
    while (ADC(Numsensor) < refSensor(Numsensor))
    {
      fd(speeds * 0.7);
      delay(10); // ปรับค่าได้ 50–120 ms
    }
  }
  ao(); // ค่อยหยุด
  delay(1);
}

void Backword_Notline(int speeds, unsigned long duration)
{
  // เดินหน้าไม่เดินบนเส้น แตเดินตามเวลาที่กำหนด
  unsigned long startTime;
  bool isRunning = false;
  if (!isRunning)
  {
    startTime = millis(); // เริ่มจับเวลาเมื่อเริ่มทำงานครั้งแรก
    isRunning = true;
  }
  while (true)
  {
    // คำนวณเวลาที่เหลือ
    unsigned long elapsed = millis() - startTime;
    unsigned long remaining = duration - elapsed;
    int currentMaxSpeed = speeds;
    if (remaining < 500)
    { // เริ่มลดความเร็วในช่วง 400 มิลลิวินาทีสุดท้าย
    currentMaxSpeed = map(remaining, 500, 0, speeds, 0);
  }
  int motorL = currentMaxSpeed;
  int motorR = currentMaxSpeed - 1;
  // motor(1, -motorL);
  // motor(2, -motorR);
  motor(1, -motorL - L1);
  motor(2, -motorR + R1);
  motor(3, -motorL + L2);
  motor(4, -motorR + R2);

  // หยุดการทำงานเมื่อครบเวลา
  if (remaining <= 3)
  {
    ao();
    isRunning = false; // รีเซ็ตสถานะ
    break;
  }
}
ao();
delay(1);
}

void turnLeft(int speeds)
{
  do
  {
    lineFollow_PID_auto(speeds);
  } while (!(ADC(0) < refSensor(0)));
  ao();
  delay(50);
  while (!(ADC(0) < refSensor(0)) && !(ADC(1) < refSensor(1)))
  {
    sl(80);
    delay(1);
  }
  while (!(ADC(1) < refSensor(1)) && !(ADC(2) < refSensor(2)))
  {
    sl(25);
    delay(1);
  }
  ao();
  delay(30);
}

void turnLeft_by_stop()
{
  while (!(ADC(0) < refSensor(0)))
  {
    sl(45);
    delay(1);
  }
  while (!(ADC(1) < refSensor(1)) || !(ADC(2) < refSensor(2)))
  {
    sl(25);
    delay(1);
  }
  ao();
  delay(20);
}

void turnLeft_by_ST(int speeds, unsigned long duration)
{
  // เลี้ยวซ้าย จาก  ตำแหน่งหยุดนิ่ง ตามเวลาที่ต้องการ (ST ย่อมาจาก  stop and time)
  unsigned long startTime;
  bool isRunning = false;
  if (!isRunning)
  {
    startTime = millis(); // เริ่มจับเวลาเมื่อเริ่มทำงานครั้งแรก
    isRunning = true;
  }
  while (true)
  {
    // คำนวณเวลาที่เหลือ
    unsigned long elapsed = millis() - startTime;
    unsigned long remaining = duration - elapsed;

    // คำนวณความเร็วที่ปรับตามเวลา (ลดความเร็วเมื่อใกล้จบ)
    int currentMaxSpeed = speeds;
    if (remaining < duration)
    {
      // เริ่มลดความเร็วในช่วง xxx วินาที
      currentMaxSpeed = map(remaining, duration, 0, speeds, 0);
    }
    // สั่งงานมอเตอร์
    sl(currentMaxSpeed);
    // หยุดการทำงานเมื่อครบเวล
    delay(1);
  }
}

///******เลี้ยวขวาด้วยเงื่อนไขต่างๆ**********/////

void turnRight(int speeds)
{
  do
  {
    lineFollow_PID_auto(speeds);
  } while (!(ADC(6) < refSensor(6)));
  ao();
  delay(40);
  while (!(ADC(6) < refSensor(6)) && !(ADC(5) < refSensor(5)))
  {
    sr(70);
    delay(1);
  }
  while (!(ADC(5) < refSensor(5)) && !(ADC(4) < refSensor(4)))
  {
    sr(15);
    delay(1);
  }
  ao();
  delay(40);
}

void turnRight_by_stop()
{
  while (!(ADC(6) < refSensor(6)))
  {
    sr(45);
    delay(1);
  }
  while (!(ADC(5) < refSensor(5)) || !(ADC(4) < refSensor(4)))
  {
    sr(25);
    delay(1);
  }
  ao();
  delay(20);
}
/////****************ปรับปรุง  2 พฤษภาคม  2568 ****************//////
void turnRight_by_ST(int speeds, unsigned long duration)
{
  // เลี้ยวขวา จากตำแหน่ง หยุดนิ่ง ตามเวลาที่ต้องการ
  unsigned long startTime;
  bool isRunning = false;
  if (!isRunning)
  {
    startTime = millis(); // เริ่มจับเวลาเมื่อเริ่มทำงานครั้งแรก
    isRunning = true;
  }
  while (true)
  {
    // คำนวณเวลาที่เหลือ
    unsigned long elapsed = millis() - startTime;
    unsigned long remaining = duration - elapsed;

    // คำนวณความเร็วที่ปรับตามเวลา (ลดความเร็วเมื่อใกล้จบ)
    int currentMaxSpeed = speeds;
    if (remaining < duration)
    {
      // เริ่มลดความเร็วในช่วง xxx วินาที
      currentMaxSpeed = map(remaining, duration, 0, speeds, 0);
    }
    // สั่งงานมอเตอร์
    sr(currentMaxSpeed);
    // หยุดการทำงานเมื่อครบเวลา
    if (remaining <= 3)
    {
      ao();
      isRunning = false; // รีเซ็ตสถานะ
      break;
    }
  }
  ao();
  delay(1);
}

void up()
{
  servoRun(2, 90);
   delay(500);
  servoRun(1, 180);
  delay(500);
  servoRun(2, 40);
  delay(500);
  servoRun(1, 145);
}
void down()
{
  servoRun(1, 180);
  delay(500);
  servoRun(2, 80);
  delay(500);
  servoRun(1, 145);
}

void show_run_time()
{
  extern unsigned long run_start_time;
  if (run_start_time > 0)
  {
    unsigned long run_time = millis() - run_start_time;
    tft_.fillScreen(ST7735_BLACK);
    tft_.setTextSize(2);
    tft_.setTextColor(ST7735_GREEN, ST7735_BLACK);
    if (run_time >= 60000)
    {
      int m = run_time / 60000;
      int s = (run_time % 60000) / 1000;
      tft_.setCursor(5, 50);
      tft_.print("TIME: "); tft_.print(m); tft_.print("m "); tft_.print(s); tft_.print("s");
    }
    else
    {
      int s = run_time / 1000;
      int ms = run_time % 1000;
      tft_.setCursor(5, 50);
      tft_.print("TIME: "); tft_.print(s); tft_.print("."); tft_.print(ms); tft_.print("s");
    }
  }
}