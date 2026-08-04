#ifndef CAMPAIGN_DATA_H
#define CAMPAIGN_DATA_H

#include <stdint.h>

static const uint8_t LEVEL_SEEDS[55] = {
    3,56,4,2,55,5,6,7,8,9,12,
    13,14,11,10,15,17,18,19,16,23,20,
    22,65,57,26,29,25,28,27,34,32,31,
    33,30,36,35,37,39,38,40,42,43,44,
    41,46,47,45,48,49,54,50,51,52,53,
};

static const char *CHAPTER_NAMES[11] = {
    "MEADOW", "TWIN GROVE", "SUN TEMPLE", "MOON MARSH", "BLOOM VALE", "EMBER MINE", "QUIET PEAK", "STAR CIRCUS", "FIRE KEEP", "LUCKY SKY", "CROWN ROAD"
};

static const char *CHAPTER_POWERS[11] = {
    "GUIDE", "MULTI", "PYRAMID", "SPOOKY", "FLOWER", "BLAST", "ZEN", "MAGIC HAT", "FIREBALL", "LUCKY", "MASTER MIX"
};

static const char *LEVEL_ROLES[5] = {
    "INTRO", "PRACTICE", "COMBINE", "PRESSURE", "MASTERY"
};

#endif
