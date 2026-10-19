#ifndef USER_BUZZER_H
#define USER_BUZZER_H

#include <Arduino.h>

class UserBuzzer {
public:
    UserBuzzer(int pin);
    void begin();
    void play(int frequency, int duration);
    void successMelody();
    void alertMelody();

private:
    int _pin;
};

#endif
