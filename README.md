# 🤖 SPK_Robot - RP2350 Smart Farm & Robotics Web IDE

ระบบ **Web-based IDE** สำหรับการเขียนโปรแกรมควบคุมบอร์ด **RP2350 (Raspberry Pi Pico 2)** สำหรับหุ่นยนต์และการแข่งขัน ด้วยภาษาบล็อก (Blockly) และ C++ (Arduino) พร้อมขุมพลัง **Nitro Engine V6** ที่ช่วยคอมไพล์และอัปโหลดโค้ดลงบอร์ดได้อย่างรวดเร็ว

---

## 🌟 ฟีเจอร์เด่น (Key Features)

* **Visual Programming with Blockly**: เขียนโค้ดควบคุมหุ่นยนต์และเซนเซอร์ผ่านบล็อกคำสั่งที่ใช้งานง่าย
* **Hybrid Code Editor**: สลับดูโค้ดภาษา C++ Arduino แบบ Real-time และปรับแต่งโค้ดได้อิสระ
* **Nitro Engine V6 Elite**: ระบบ Incremental Compilation คอมไพล์และอัปโหลดไวสุดภายใน 3-5 วินาที
* **Double Entry Mode**: รองรับโหมดการทำงานคู่ (Main B และ Main T)
* **Auto Port Detection**: ค้นหาพอร์ตบอร์ด RP2350 และจัดการ Bootloader อัตโนมัติ
* **One-Click Startup**: สคริปต์ `Start_IDE.bat` ตรวจสอบสภาพแวดล้อม ติดตั้ง Dependency และเปิดหน้าเว็บให้อัตโนมัติ

---

## 💻 ความต้องการของระบบ (System Requirements)

* **ระบบปฏิบัติการ:** Windows 10 หรือ Windows 11 (64-bit)
* **เบราว์เซอร์:** Google Chrome, Microsoft Edge หรือเบราว์เซอร์ที่ใช้ Chromium
* **ซอฟต์แวร์ที่ต้องใช้:**
  * [Node.js](https://nodejs.org/) (เวอร์ชัน 18 ขึ้นไป แนะนำ LTS)
  * [Python](https://www.python.org/) (เวอร์ชัน 3.10 หรือ 3.11)
  * Git สำหรับ Windows

---

## 🚀 วิธีการติดตั้งและใช้งานบนเครื่องเพื่อน (Setup Guide for Friends)

### ขั้นตอนที่ 1: ดาวน์โหลดโปรเจกต์ (Clone Repository)
เปิดโปรแกรม **Command Prompt (CMD)** หรือ **PowerShell** แล้วรันคำสั่ง:
```bash
git clone https://github.com/SuepsakunSuwanna-Thomas/SPK_Robot.git
cd SPK_Robot
```
*(หรือกด **Code -> Download ZIP** บนหน้า GitHub แล้วแตกไฟล์ออกมา)*

---

### ขั้นตอนที่ 2: เตรียมเครื่องมือคอมไพเลอร์ (`portable_tools`)
เนื่องจากชุดคอมไพเลอร์ GCC, Pico SDK และ Arduino Core มีขนาดใหญ่ (~2.5 GB) ซึ่งเกินขีดจำกัดของ GitHub:

1. ขอโฟลเดอร์ **`portable_tools`** จากผู้พัฒนา (ก๊อบปี้ผ่าน Flash Drive หรือลิงก์ดาวน์โหลดสำรอง)
2. นำโฟลเดอร์ `portable_tools` ไปวางไว้ที่:
   ```text
   SPK_Robot/arduino_CLI/portable_tools
   ```
> ⚠️ **หมายเหตุ:** ภายใน `arduino_CLI/portable_tools/` จะต้องมี `arduino-cli.exe`, โฟลเดอร์ `gcc/`, `core/`, `picotool/` และ `arduino_data/`

---

### ขั้นตอนที่ 3: เปิดใช้งานโปรแกรม (Auto Launch)
ดับเบิ้ลคลิกไฟล์:
```text
Start_IDE.bat
```
ระบบจะทำงานตามลำดับดังนี้:
1. ตรวจสอบ Node.js และ Python (หากยังไม่มีจะติดตั้งให้อัตโนมัติผ่าน Windows winget)
2. ติดตั้ง Node Modules dependencies ที่จำเป็น (`npm install`)
3. สตาร์ตเซิร์ฟเวอร์ Backend ที่พอร์ต 3000
4. เปิดเบราว์เซอร์ Google Chrome ไปที่ `http://localhost:3000` โดยอัตโนมัติ

---

### หรือรันแบบ Manual ผ่าน Terminal:
```bash
npm install
node server.js
```
แล้วเปิดเบราว์เซอร์ไปที่: [http://localhost:3000](http://localhost:3000)

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
SPK_Robot/
├── Start_IDE.bat          # สคริปต์คลิกเดียวพร้อมใช้งาน (Auto-setup & Run)
├── server.js              # Node.js Express Backend API
├── package.json           # การตั้งค่า dependencies ของระบบ
├── public/                # หน้าเว็บและระบบหน้าบ้าน (HTML, CSS, Blockly JS, UI)
│   ├── index.html
│   ├── css/
│   └── js/
├── arduino_CLI/           # เครื่องมือและระบบคอมไพล์ Nitro V6
│   ├── ULTIMATE_NITRO_V6_ELITE.ps1
│   ├── FAST_UPLOAD.bat
│   ├── FORCE_REBUILD.bat
│   ├── libraries/         # ไลบรารีมาตรฐาน
│   ├── libraries_User/    # ไลบรารีที่ผู้ใช้ติดตั้งเพิ่ม
│   ├── sketch/            # ซอร์สโค้ด Arduino ชั่วคราว
│   └── portable_tools/    # ชุดคอมไพเลอร์แบบ Standalone (วางเพิ่มหลัง Clone)
└── saved_projects/        # โฟลเดอร์จัดเก็บไฟล์โปรเจกต์บล็อก (.rp2350)
```

---

## 🛠️ การแก้ไขปัญหาเบื้องต้น (Troubleshooting)

1. **เปิด Start_IDE.bat แล้วหน้าต่างปิดทันที:**
   * ตรวจสอบว่าในเครื่องมีสิทธิ์ติดตั้ง Winget หรือเปิด CMD ในโฟลเดอร์แล้วพิมพ์ `node server.js` เพื่อดูข้อความแจ้งเตือน
2. **คอมไพล์ไม่ผ่าน หรือแจ้งว่าไม่พบคอมไพเลอร์:**
   * ตรวจสอบว่าได้วางโฟลเดอร์ `portable_tools` ใน `arduino_CLI/` ครบถ้วนแล้วหรือไม่
3. **อัปโหลดโค้ดลงบอร์ดไม่สำเร็จ:**
   * เสียบสาย USB เข้ากับบอร์ด RP2350 (Pico 2)
   * กดปุ่ม **BOOTSEL** ค้างไว้ขณะเสียบสาย USB หากพอร์ตไม่ยอมสลับอัตโนมัติ
   * ตรวจสอบสาย USB ว่าเป็นสายดาต้า (Data Cable) ไม่ใช่สายชาร์จไฟธรรมดา

---

## 👥 ผู้พัฒนา (Author)
* **GitHub:** [@SuepsakunSuwanna-Thomas](https://github.com/SuepsakunSuwanna-Thomas)
* **Repository:** [SPK_Robot](https://github.com/SuepsakunSuwanna-Thomas/SPK_Robot)
