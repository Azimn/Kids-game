LCC ?= lcc
TARGET := pegdrop_deluxe.gb
DEBUG_TARGET := pegdrop_deluxe_debug.gb
HUGE_LIB := hUGEDriver.lib
SOURCES := main.c tiles.c sample_song.c
HEADERS := tiles.h hUGEDriver.h campaign_data.h

all: $(TARGET) $(DEBUG_TARGET)

$(TARGET): $(SOURCES) $(HEADERS) $(HUGE_LIB)
	$(LCC) -I. -Wm-yC -Wm-yn"PEG DROP DX" -Wm-yt0x1B -Wl-l$(HUGE_LIB) -o $@ $(SOURCES)

$(DEBUG_TARGET): $(SOURCES) $(HEADERS) $(HUGE_LIB)
	$(LCC) -DPEGDROP_DEBUG -I. -Wm-yC -Wm-yn"PEG DROP DBG" -Wm-yt0x1B -Wl-l$(HUGE_LIB) -o $@ $(SOURCES)

clean:
	rm -f $(TARGET) $(DEBUG_TARGET) *.asm *.ihx *.lk *.lst *.map *.noi *.o *.sym

.PHONY: all clean
