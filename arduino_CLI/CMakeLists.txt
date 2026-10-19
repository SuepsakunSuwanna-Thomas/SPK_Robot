cmake_minimum_required(VERSION 3.13)

# 1. SDK Import
include(pico_sdk_import.cmake)

project(main_B C CXX ASM)

# 2. Specify Board (RP2350 for Pico 2)
set(PICO_BOARD pico2)
set(PICO_PLATFORM rp2350-arm-s)

# 3. Initialize SDK
set(PICOTOOL_EXECUTABLE "${CMAKE_CURRENT_LIST_DIR}/data/packages/rp2040/tools/pqt-picotool/2.1.0/picotool.exe" CACHE PATH "Force local picotool")
set(PICOTOOL_VERSION "2.1.1" CACHE STRING "Spoof version")
set(PICOTOOL_FETCH_FROM_GIT OFF CACHE BOOL "Disable fetching")
pico_sdk_init()

# 4. Define Executable
set(SOURCES
    sketch/main_B/main_B.ino
    sketch/main_B/All_function.ino
    sketch/main_B/BT.ino
    sketch/main_B/EEPROM.ino
    sketch/main_B/User.ino
    sketch/main_B/main_T.ino
)
set_source_files_properties(${SOURCES} PROPERTIES LANGUAGE CXX)
add_executable(main_B ${SOURCES})

# 5. Core Paths (Arduino-Pico 5.5.1)
set(ARDUINO_CORE_DIR "${CMAKE_CURRENT_LIST_DIR}/data/packages/rp2040/hardware/rp2040/5.5.1")
set(ARM_TOOLCHAIN_DIR "${CMAKE_CURRENT_LIST_DIR}/data/packages/rp2040/tools/pqt-gcc/4.1.0-1aec55e/bin")

# 6. Include Paths (Arduino & SDK)
target_include_directories(main_B PRIVATE
    ${ARDUINO_CORE_DIR}/cores/rp2040
    ${ARDUINO_CORE_DIR}/variants/rpipico2
    ${ARDUINO_CORE_DIR}/libraries/Wire/src
    ${ARDUINO_CORE_DIR}/libraries/SPI/src
    ${CMAKE_CURRENT_LIST_DIR}/libraries
    ${CMAKE_CURRENT_LIST_DIR}/sketch/main_B
)

# 7. Flags for Arduino Compatibility & Automatic Header
target_compile_definitions(main_B PRIVATE
    ARDUINO=10810
    ARDUINO_ARCH_RP2040
    ARDUINO_RASPBERRY_PI_PICO2
    PICO_RP2350=1
)
# Force include Arduino.h in every file (like Arduino IDE does)
target_compile_options(main_B PRIVATE -include "${ARDUINO_CORE_DIR}/cores/rp2040/Arduino.h")

# 8. Pico SDK Linking
target_link_libraries(main_B pico_stdlib hardware_gpio hardware_uart hardware_i2c hardware_spi)

# 9. Output UF2/ELF (Skipping automatic for speed/fixing)
# pico_add_extra_outputs(main_B)
