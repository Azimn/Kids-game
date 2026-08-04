from pathlib import Path

p = Path("final_build/src/main.c")
s = p.read_text()

s = s.replace('#include "tiles.h"', '#include "tiles.h"\n#include "hUGEDriver.h"')
pos = s.index('typedef int16_t fx_t;')
s = s[:pos] + 'extern const hUGESong_t sample_song;\n\n' + s[pos:]
s = s.replace(
    'static uint8_t hud_level_cache,hud_balls_cache,hud_orange_cache,hud_label_cache,hud_force;',
    'static uint8_t hud_level_cache,hud_balls_cache,hud_orange_cache,hud_label_cache,hud_label_visible_cache,hud_force;'
)
s = s.replace(
    'static void invalidate_hud(void) { hud_force=1; hud_label_cache=255; }',
    'static void invalidate_hud(void) { hud_force=1; hud_label_cache=255; hud_label_visible_cache=255; }'
)
s = s.replace(
    'static void sfx_fail(void) { tone(0x220,0xC3); }',
    '''static void sfx_fail(void) { tone(0x220,0xC3); }
static void sfx_style_bonus(uint8_t label) {
    if(label==SHOT_SUPER) tone(0x7D0,0xF1);
    else if(label==SHOT_LONG) tone(0x790,0xE1);
}'''
)
s = s.replace(
    'if((uint16_t)(dx*dx+dy*dy)>100) { shot_score+=25000; shot_label=SHOT_LONG; shot_label_timer=90; }',
    'if((uint16_t)(dx*dx+dy*dy)>100) { shot_score+=25000; shot_label=SHOT_LONG; shot_label_timer=90; sfx_style_bonus(SHOT_LONG); }'
)
s = s.replace(
    'else if(shot_pegs>=15) { shot_label=SHOT_SUPER; shot_label_timer=110; }',
    'else if(shot_pegs>=15) { shot_label=SHOT_SUPER; shot_label_timer=110; sfx_style_bonus(SHOT_SUPER); }'
)

hs = s.index('static void draw_hud(void) {')
he = s.index('\n}\nstatic void draw_playfield', hs) + 2
hud = '''static void draw_hud(void) {
 uint8_t label=(shot_label_timer?shot_label:SHOT_NONE);
 uint8_t label_visible=(uint8_t)(shot_label_timer && ((shot_label_timer & 8u)!=0u));
 if(hud_force||hud_score_cache!=score){print_num(0,0,score,7);hud_score_cache=score;}
 if(hud_force||hud_level_cache!=(uint8_t)(level_index+1)){print_num(9,0,(uint32_t)(level_index+1),2);hud_level_cache=(uint8_t)(level_index+1);}
 if(hud_force||hud_balls_cache!=balls_left){print_num(13,0,balls_left,2);hud_balls_cache=balls_left;}
 if(hud_force||hud_orange_cache!=orange_remaining){print_num(17,0,orange_remaining,2);hud_orange_cache=orange_remaining;}
 if(hud_force||hud_label_cache!=label||hud_label_visible_cache!=label_visible){
     fill_bkg_rect(0,1,20,1,0);
     if(label!=SHOT_NONE && label_visible) print_at((uint8_t)((20-strlen(shot_label_text()))/2),1,shot_label_text());
     hud_label_cache=label;
     hud_label_visible_cache=label_visible;
 }
 hud_force=0;
}'''
s = s[:hs] + hud + s[he:]
s = s.replace(
    'SHOW_BKG;SHOW_SPRITES;SPRITES_8x8;apply_palettes();sound_init();state=STATE_TITLE;show_title();',
    'SHOW_BKG;SHOW_SPRITES;SPRITES_8x8;apply_palettes();sound_init();\n    __critical { hUGE_init(&sample_song); add_VBL(hUGE_dosound); }\n    state=STATE_TITLE;show_title();'
)
p.write_text(s)

Path('final_build/src/Makefile').write_text('''LCC ?= lcc
TARGET := pegdrop_deluxe.gb
HUGE_LIB := hUGEDriver.lib
SOURCES := main.c tiles.c sample_song.c
HEADERS := tiles.h hUGEDriver.h campaign_data.h

all: $(TARGET)

$(TARGET): $(SOURCES) $(HEADERS) $(HUGE_LIB)
\t$(LCC) -I. -Wm-yC -Wm-yn"PEG DROP DX" -Wm-yt0x1B -Wl-l$(HUGE_LIB) -o $@ $(SOURCES)

clean:
\trm -f $(TARGET) *.asm *.ihx *.lk *.lst *.map *.noi *.o *.sym

.PHONY: all clean
''')
Path('final_build/src/AUDIO_AND_HUD_UPDATE.md').write_text(
    'Style labels flash every eight frames. SUPER SHOT and LONG SHOT play confirmation tones. '
    'hUGEDriver is initialized through add_VBL(hUGE_dosound). wait_vbl_done remains in the main loop. '
    'The bundled public-domain sample song is a replaceable placeholder.\n'
)
