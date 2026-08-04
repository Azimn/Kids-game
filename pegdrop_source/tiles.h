#ifndef PEGDROP_TILES_H
#define PEGDROP_TILES_H
#include <stdint.h>
#define FONT_CHARS " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:-!."
#define TILE_COUNT 47
#define SPRITE_TILE_COUNT 7
#define TILE_BLUE 41
#define TILE_ORANGE 42
#define TILE_GREEN 43
#define TILE_PURPLE 44
#define TILE_HIT 45
#define TILE_BORDER 46
extern const uint8_t tiles_data[];
extern const uint8_t sprite_data[];
#endif
