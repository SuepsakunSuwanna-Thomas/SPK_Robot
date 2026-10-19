import os
import subprocess
Import("env")

# 1. ระบุที่อยู่ไฟล์ ccache.exe ให้ตรงกับที่คุณวางไว้ใน Drive C
CCACHE_EXE = "C:\\ccache\\ccache.exe"

# 2. ตั้งค่าที่เก็บแคชไว้ใน RAM Disk (R:) เพื่อความเร็วสูงสุด
# (ถ้าไม่มีไดรฟ์ R: ให้ลบบรรทัดนี้ทิ้ง หรือเปลี่ยนเป็นที่อื่น)
os.environ["CCACHE_DIR"] = "R:\\.ccache"

try:
    # เช็คว่าไฟล์ ccache.exe มีอยู่จริงตามที่ระบุไหม
    if os.path.exists(CCACHE_EXE):
        # สั่งให้ PlatformIO ใช้ ccache นำหน้าคอมไพเลอร์เดิม
        env.Replace(CC=f"{CCACHE_EXE} {env.get('CC')}")
        env.Replace(CXX=f"{CCACHE_EXE} {env.get('CXX')}")
        env.Replace(AS=f"{CCACHE_EXE} {env.get('AS')}")
        
        print(f"--- [SUCCESS] ccache is enabled from {CCACHE_EXE} ---")
    else:
        print(f"--- [ERROR] ccache.exe NOT FOUND at {CCACHE_EXE} ---")
        print("--- Please check if you put ccache.exe in C:\\ccache\\ ---")
except Exception as e:
    print(f"--- [ERROR] ccache setup failed: {str(e)} ---")