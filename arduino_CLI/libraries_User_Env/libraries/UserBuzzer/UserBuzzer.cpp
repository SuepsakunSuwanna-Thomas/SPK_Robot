#include "UserBuzzer.h"

UserBuzzer::UserBuzzer(int pin) {
    _pin = pin;
}

void UserBuzzer::begin() {
    pinMode(_pin, OUTPUT);
}

void UserBuzzer::play(int frequency, int duration) {
    tone(_pin, frequency, duration);
    delay(duration);
    noTone(_pin);
}

void UserBuzzer::successMelody() {
    play(1000, 100);
    delay(50);
    play(1500, 100);
    delay(50);
    play(2000, 150);
}

void UserBuzzer::alertMelody() {
    for(int i=0; i<3; i++) {
        play(500, 200);
        delay(100);
    }
}
