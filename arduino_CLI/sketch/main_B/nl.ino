// ฟังก์ชันสำหรับเปลี่ยนสีพื้นหลังหน้าจอด้วยตัวเลข
void cc(int colorCode) {
  switch (colorCode) {
  case 0:
    tft_.fillScreen(ST7735_BLACK); // 0 = สีดำ
    break;
  case 1:
    tft_.fillScreen(ST7735_BLUE); // 1 = สีฟ้า/น้ำเงิน
    break;
  case 2:
    tft_.fillScreen(ST7735_GREEN); // 2 = สีเขียว
    break;
  case 3:
    tft_.fillScreen(ST7735_CYAN); // 3 = สีฟ้าอ่อน (Cyan)
    break;
  case 4:
    tft_.fillScreen(ST7735_RED); // 4 = สีแดง
    break;
  case 5:
    tft_.fillScreen(0xFD20); // 5 = สีส้ม (ใช้รหัสสี RGB565 แบบ Hex)
    break;
  case 6:
    tft_.fillScreen(ST7735_YELLOW); // 6 = สีเหลือง
    break;
  case 7:
    tft_.fillScreen(ST7735_MAGENTA); // 7 = สีม่วงแดง (Magenta)
    break;
  case 8:
    tft_.fillScreen(ST7735_WHITE); // 8 = สีขาว
    break;
  default:
    tft_.fillScreen(ST7735_BLACK); // ถ้าใส่เลขอื่นนอกจากนี้ ให้กลายเป็นสีดำ
    break;
  }
}