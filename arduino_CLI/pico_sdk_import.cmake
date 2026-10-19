# This is a generated file by Antigravity to import the Pico SDK
if (DEFINED ENV{PICO_SDK_PATH})
    set(PICO_SDK_PATH $ENV{PICO_SDK_PATH})
else()
    set(PICO_SDK_PATH "${CMAKE_CURRENT_LIST_DIR}/data/packages/rp2040/hardware/rp2040/5.5.1/pico-sdk")
endif()

if (NOT EXISTS "${PICO_SDK_PATH}/pico_sdk_init.cmake")
    message(FATAL_ERROR "Pico SDK not found at ${PICO_SDK_PATH}")
endif()

include(${PICO_SDK_PATH}/pico_sdk_init.cmake)
