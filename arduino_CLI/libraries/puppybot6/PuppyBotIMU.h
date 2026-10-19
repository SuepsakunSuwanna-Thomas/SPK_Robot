
#ifndef _PUPPYBOT_IMU_H
#define _PUPPYBOT_IMU_H
#pragma once
#include <ICM20948wire1.h>
#include <Wire.h>
#include "pio_encoder.h"
#ifndef I2C_ADDR
#define I2C_ADDR 0x69
#endif


namespace PuppyBotIMU {
    inline PioEncoder encoder_PIO_M1(17);
    inline PioEncoder encoder_PIO_M2(19);
    
    inline ICM20948 icm;
    inline float continuousYaw = 0;
    inline float offset_yaw = 0;
    inline float read_Yaw = 0;
    inline float newYaw = 0;
    inline float pitch = 0;
    inline float roll = 0;
    inline int state_begin_Encoder_M1 = 0;
    inline int state_begin_Encoder_M2 = 0;
    inline int Set_Mode_Gyro = 0;

    inline void setModeGyro(int modeGyro){
        Set_Mode_Gyro = modeGyro;
    }
    // void resetBoard() {
    //     Serial.println("Rebooting...");
    // }
    inline void init_encoder(int position_motor){
        if(position_motor == 1){
            encoder_PIO_M1.begin();
        }
        else{
            encoder_PIO_M2.begin();
        }
        
    }
    // อย่าลืมใส่บรรทัดนี้ไว้ด้านบนสุดของหมวดฟังก์ชัน (ถ้ามีอยู่แล้วไม่ต้องใส่ซ้ำครับ)
    float getYaw(); 

    inline void resetBoard() {
        Serial.println("Rebooting...");
        rp2040.reboot(); // สั่งรีเซ็ตบอร์ด RP2040/RP2350 จริงๆ ไม่ใช่แค่ปริ้นต์ข้อความ
    }

    inline void initIMU() {
        bool imu_ready = false;
        
        // วนลูปบังคับให้เซ็นเซอร์ต้องทำงานและอ่านค่าได้จริงๆ ถึงจะปล่อยผ่าน
        while (!imu_ready) {
            Serial.println("Starting IMU...");
            
            // --- 1. เคลียร์สายสัญญาณ I2C (I2C Bus Recovery) ---
            pinMode(6, INPUT_PULLUP); // SDA
            pinMode(7, INPUT_PULLUP); // SCL
            delay(10);
            
            pinMode(7, OUTPUT); 
            // กระตุ้น SCL จนกว่าเซ็นเซอร์จะยอมปล่อยสาย SDA (สูงสุด 20 ครั้ง)
            for (int i = 0; i < 20; i++) {
                if (digitalRead(6) == HIGH) break; // ถ้าสายว่างแล้วให้ออกทันที
                digitalWrite(7, LOW);
                delayMicroseconds(10);
                digitalWrite(7, HIGH);
                delayMicroseconds(10);
            }
            pinMode(7, INPUT_PULLUP);
            delay(50);
            
            // --- 2. เคลียร์ชิป I2C ของบอร์ด RP2350 (แก้ปัญหาบอร์ดค้าง) ---
            Wire1.end(); // สั่งปิดระบบ I2C เดิมที่อาจจะรวนอยู่
            delay(50);
            Wire1.setSDA(6);
            Wire1.setSCL(7);
            Wire1.begin();
            delay(100);

            // --- 3. เริ่มต้นเซ็นเซอร์ ---
            int code = icm.begin();
            
            if (code != ICM_SUCCESS) {
                Serial.print("Init Failed! Code: ");
                Serial.println(code);
                Serial.println("Retrying...");
                delay(1000);
                continue; // ถ้ารันไม่ผ่าน ให้วนลูปกลับไปทำข้อ 1 ใหม่เลย
            }
            
            icm.setFusionMode(FUSION_6_AXIS);
            Wire1.setClock(1000000);
            
            icm.startSensor(INV_SENSOR_TYPE_MAGNETOMETER, 16000);
            icm.startSensor(INV_SENSOR_TYPE_GAME_ROTATION_VECTOR, 16000);
            icm.startSensor(INV_SENSOR_TYPE_ROTATION_VECTOR, 16000);
            icm.setHighPowerMode(1);

            // --- 4. ดักจับอาการ "เซ็นเซอร์หลอกว่าทำงาน แต่ส่งค่า 0 ค้าง" ---
            Serial.println("Testing IMU Data...");
            float test_yaw = 0;
            bool data_is_valid = false;
            
            // ทดสอบดึงค่า 50 ครั้ง
            for(int i = 0; i < 50; i++) {
                float current_yaw = getYaw();
                
                // ถ้าค่ามีการเปลี่ยนแปลง หรือไม่ใช่ 0.00 เป๊ะๆ แปลว่าเซ็นเซอร์ทำงานจริงๆ
                if (current_yaw != 0.00 || (i > 0 && current_yaw != test_yaw)) {
                    data_is_valid = true;
                }
                test_yaw = current_yaw;
                delay(20); 
            }

            // ถ้าเช็ค 50 รอบแล้วยังเป็น 0.00 อยู่ แปลว่าเซ็นเซอร์ค้าง!
            if (!data_is_valid && test_yaw == 0.00) {
                Serial.println("Error: Data stuck at 0.00! Retrying...");
                delay(500);
                continue; // วนลูปกลับไปเตะสาย I2C ใหม่ตั้งแต่ข้อ 1
            }

            Serial.println("IMU Ready!");
            imu_ready = true; // ผ่านด่านทดสอบทั้งหมด อนุญาตให้ออกจากลูปได้
        }
    }
    inline void updateIMU_fine_offset_Yaw(int round) {
      for (int Rread = 0; Rread < round; Rread++) {
        icm.update();
        if (icm.available()) {
          float qx = icm.x();
          float qy = icm.y();
          float qz = icm.z();
          float qw = icm.w();
          read_Yaw = atan2(2.0 * (qw * qx + qy * qz), 1.0 - 2.0 * (qx * qx + qy * qy)) * 180.0 / PI;
          if (read_Yaw < 0) { read_Yaw += 360; }
          icm.clearAvailable();
        }
        delay(10);
      }
      offset_yaw = read_Yaw;
    }

    inline void updateIMU() {
        icm.update();
        float qx = icm.x();
        float qy = icm.y();
        float qz = icm.z();
        float qw = icm.w();
        newYaw = atan2(2.0 * (qw * qx + qy * qz), 1.0 - 2.0 * (qx * qx + qy * qy)) * 180.0 / PI;
        float sinp = 2 * (qw * qy - qz * qx);
        pitch = (fabs(sinp) >= 1) ? copysign(M_PI / 2, sinp) : asin(sinp);
        pitch *= 180.0 / M_PI;

        float siny_cosp = 2 * (qw * qz + qx * qy);
        float cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
        roll = atan2(siny_cosp, cosy_cosp) * 180.0 / M_PI;
    }

    inline float getYaw() {
        updateIMU();
        if (isnan(newYaw)) return read_Yaw;
        if (newYaw < 0) newYaw += 360;
        if (newYaw > 360) newYaw -= 360;
        read_Yaw = newYaw;
        return read_Yaw;
    }
    inline void updateContinuousYaw() {
    static float lastYaw = 0;
    static bool firstRun = true;

    updateIMU(); // อ่านค่าจาก IMU

    float currentYaw = getYaw();

    if (firstRun) {
      continuousYaw = currentYaw;
      lastYaw = currentYaw;
      firstRun = false;
      return;
    }
    float deltaYaw = currentYaw - lastYaw;
    if (deltaYaw > 180.0) deltaYaw -= 360.0;
    if (deltaYaw < -180.0) deltaYaw += 360.0;
    continuousYaw += deltaYaw;
    lastYaw = currentYaw;
  }
    inline int get_pulse_Encoder(int position_motor){
        int count_encoder = 0;
        if(position_motor == 1){
            if(state_begin_Encoder_M1 == 0){
            state_begin_Encoder_M1 = 1;
            encoder_PIO_M1.begin();
            }
            count_encoder =  encoder_PIO_M1.getCount();
        }
        else{
            if(state_begin_Encoder_M2 == 0){
            state_begin_Encoder_M2 = 1;
            encoder_PIO_M2.begin();
            }
            count_encoder =  encoder_PIO_M2.getCount();
        }
        return count_encoder;
    }
    inline void resetEncoder(int position_motor){
        if(position_motor == 1){
            encoder_PIO_M1.reset();
        }
        else{
            encoder_PIO_M2.reset();
        }
    }
    inline float getPitch() { updateIMU(); return pitch; }
    inline float getRoll() { updateIMU(); return roll; }
    inline float getOffsetYaw() { return offset_yaw; }
    inline float getContinuousYaw() { updateContinuousYaw(); return continuousYaw; }
    inline void resetContinuousYaw() { continuousYaw = getYaw(); }
}

using namespace PuppyBotIMU; 

#endif  


