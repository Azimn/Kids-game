from pathlib import Path
from pyboy import PyBoy

SIG = bytes([0xDE, 0xAD, 0xBE, 0xEF, 0x50, 0x45, 0x47, 0x03])
p = PyBoy('pegdrop_deluxe_debug.gb', window='null', sound_emulated=True)
p.set_emulation_speed(0)


def tick(n=1):
    for _ in range(n):
        p.tick()


def press(key, held=2, released=10):
    p.button_press(key)
    tick(held)
    p.button_release(key)
    tick(released)


def find_packet():
    for addr in range(0xC000, 0xE000 - len(SIG)):
        if bytes(p.memory[addr + i] for i in range(len(SIG))) == SIG:
            return addr
    raise AssertionError('debug packet signature not found')


tick(180)
base = find_packet()


def packet():
    d = [p.memory[base + i] for i in range(32)]
    return {
        'state': d[8], 'level': d[9], 'balls': d[10], 'orange': d[11],
        'active': d[12], 'shot_pegs': d[13], 'power': d[14],
        'fever': d[15], 'particles': d[16], 'paused': d[17],
        'frames': d[18] | (d[19] << 8),
        'hits': d[20] | (d[21] << 8),
        'orange_hits': d[22] | (d[23] << 8),
        'music': d[24] | (d[25] << 8),
    }


# Navigate by observed state, never by assumed timing.
for _ in range(12):
    state = packet()['state']
    if state == 2:
        break
    if state == 0:
        press('start')
    elif state in (1, 6, 7):
        press('a')
    else:
        tick(30)
    tick(25)

s = packet()
assert s['state'] == 2, s
assert s['orange'] == 15, s
assert s['balls'] == 10, s
p.screen.image.save('stabilized-playfield.png')

music0 = s['music']
max_particles = 0
start_hits = s['hits']
start_oranges = s['orange_hits']
shot_results = []

# Broad angle sweep, returning to center between shots.
angles = (0, 8, -16, 24, -12, 20, -28, 14)
current_aim = 0
for shot, target_aim in enumerate(angles):
    delta = target_aim - current_aim
    key = 'right' if delta > 0 else 'left'
    for _ in range(abs(delta)):
        press(key, 1, 2)
    current_aim = target_aim

    before = packet()
    press('a')
    launched = False
    for _ in range(40):
        cur = packet()
        max_particles = max(max_particles, cur['particles'])
        if cur['active'] > 0:
            launched = True
            break
        tick()
    assert launched, (shot, packet())
    after_launch = packet()
    assert after_launch['balls'] == before['balls'] - 1, (before, after_launch)
    p.screen.image.save(f'stabilized-shot-{shot + 1}.png')

    resolved = False
    peak_frames = 0
    for _ in range(520):
        cur = packet()
        max_particles = max(max_particles, cur['particles'])
        peak_frames = max(peak_frames, cur['frames'])
        if cur['active'] == 0:
            resolved = True
            break
        tick()
    assert resolved, (shot, packet())
    assert peak_frames <= 421, peak_frames
    shot_results.append((shot, peak_frames, packet()['hits'], packet()['orange_hits']))
    tick(30)

    if packet()['hits'] > start_hits and packet()['orange_hits'] > start_oranges:
        break
    assert packet()['state'] == 2, packet()

end = packet()
assert end['hits'] > start_hits, (start_hits, end)
assert end['orange_hits'] > start_oranges, (start_oranges, end)
assert end['orange'] < 15, end
assert max_particles > 0, max_particles
assert ((end['music'] - music0) & 0xFFFF) > 100, (music0, end['music'])

assert end['state'] == 2, end
press('start')
tick(20)
assert packet()['paused'] == 1, packet()
p.screen.image.save('stabilized-paused.png')
press('start')
tick(20)
assert packet()['paused'] == 0, packet()

Path('PLAYTEST_RESULT.txt').write_text(
    'PASS: state-aware test reached gameplay, verified 15 orange targets, '
    'launched and resolved shots, observed peg and orange hits, observed particles, '
    'verified the 420-frame ceiling, verified music ticks, and verified pause/resume.\n'
    + repr(shot_results) + '\n'
)
p.stop(save=False)
