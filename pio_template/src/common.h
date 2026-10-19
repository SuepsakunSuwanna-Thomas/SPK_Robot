#ifndef COMMON_H
#define COMMON_H

#include <Arduino.h>
#include <EEPROM.h>

// --- Shared Globals (Externally defined in main file) ---
// These must be declared BEFORE including library headers that might use them
extern int selection_Encoder;
extern int degree_servo1;
extern int degree_servo2;
extern int Calibrate_EEPROM;

extern int L_1, R_1, L_0, R_0;
extern volatile bool req_reset;
extern volatile bool bt_start_flag;

#define SENSOR_COUNT 7
#define EEPROM_SIZE 512
#define EEPROM_ADDR_BASE 0

// --- Robot Libraries (Inline-ified for multi-file support) ---
#include "puppybot6.h"
#include "PuppyBotIMU.h"
#include "PuppyBotTurnPID.h"

// --- Project Function Prototypes (Defined in .ino files) ---

// From EEPROM.ino
void _wait();
int readAverage(int pin);
void saveCalibrationToEEPROM();
void loadCalibrationFromEEPROM();
void showCalibrationRotated();
void autoCalibrate();
void printCalibrationFromEEPROM();

// From BT.ino
void setupBT();
void checkBluetooth();
void processBTCommand(const char* cmdLine);
void Fline_by_pass_tune(int spd, float kp, float kd, int count, int sn);

// From All_function.ino
void wait_SW1();
void updateSensorDisplay();
void updateYawDisplay();
void updatePromptBar(int state, uint16_t barBgColor);
void resetDriveEncoder();
void f(int speeds, int pulses);
void R_2(int speeds, int pulses);
void L_2(int speeds, int pulses);
void repeatPattern(int rounds);
bool readSensor(int ch);
void checkLine();
void Fline_by_pass2(int maxspeeds, int lowspeeds, int count, int Numsensor, float max_distance);
void lineFollow_PID_auto(int speed);
void Fline(int speeds, int Numsensor);
void back(int speeds, int Numsensor);
void BackUntilWhite(int Numsensor);
void Fline_by_time(int RUN_PID_speed, float RUN_PID_KP, float RUN_PID_KD, unsigned long duration);
void Follow_Notline(int speeds, unsigned long duration);
void Fline_by_pass(int speeds, int count, int Numsensor);
void Backword_Notline(int speeds, unsigned long duration);
void turnLeft(int speeds);
void turnLeft_by_stop();
void turnLeft_by_ST(int speeds, unsigned long duration);
void turnRight(int speeds);
void turnRight_by_stop();
void turnRight_by_ST(int speeds, unsigned long duration);
void up();
void down();

// Special functions defined in All_function.ino but sometimes called as PID
void lineFollow_PID(int RUN_PID_speed, float RUN_PID_KP, float RUN_PID_KI, float RUN_PID_KD);

#endif
