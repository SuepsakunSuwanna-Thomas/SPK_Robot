#include "common.h"
#include <Arduino.h>

int selection_Encoder = 1;
#include <EEPROM.h>

// Variables
int degree_servo1 = 20;
int degree_servo2 = 45;
int Calibrate_EEPROM = 1;


#define SENSOR_COUNT 7
#define EEPROM_SIZE 512
#define EEPROM_ADDR_BASE 0

int L_1 = 700; int R_1 = 700;
int L_0 = 200; int R_0 = 400;

volatile bool req_reset = false;      
volatile bool bt_start_flag = false;

// Custom Functions


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
      wait_SW1();
}

void loop() {
  
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
