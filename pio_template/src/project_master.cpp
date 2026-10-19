#include "common.h"

// Unity Build - Compilation of all Arduino files as a single unit.
// Moving .ino files to code_src/ prevents PlatformIO from wasting time on auto-converting them.

#include "code_src/main_B.ino"
#include "code_src/main_T.ino"
#include "code_src/All_function.ino"
#include "code_src/BT.ino"
#include "code_src/EEPROM.ino"
#include "code_src/User.ino"
