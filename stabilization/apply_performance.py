from pathlib import Path

p = Path('main.c')
s = p.read_text()

old_reflect = '''static void reflect_ball(Ball *b,int16_t dx,int16_t dy,int32_t d2) {
    int32_t dot,cx,cy;
    if(d2<1){dx=0;dy=-1;d2=1;}
    dot=(int32_t)b->vx*dx+(int32_t)b->vy*dy;
    cx=(2L*dot*dx)/d2; cy=(2L*dot*dy)/d2;
    b->vx=(fx_t)((((int32_t)b->vx-cx)*RESTITUTION)>>8);
    b->vy=(fx_t)((((int32_t)b->vy-cy)*RESTITUTION)>>8);
    b->x+=(fx_t)(dx<<4); b->y+=(fx_t)(dy<<4);
}'''

new_reflect = '''static void reflect_ball(Ball *b,int16_t dx,int16_t dy) {
    int16_t ax=(dx<0)?-dx:dx;
    int16_t ay=(dy<0)?-dy:dy;
    fx_t vx=b->vx,vy=b->vy;

    /* Eight-direction normal approximation: no 32-bit division on the LR35902. */
    if(ax>(ay<<1)) {
        vx=(fx_t)-vx;
    } else if(ay>(ax<<1)) {
        vy=(fx_t)-vy;
    } else if((dx<0)==(dy<0)) {
        vx=(fx_t)-b->vy;
        vy=(fx_t)-b->vx;
    } else {
        vx=b->vy;
        vy=b->vx;
    }
    b->vx=FX_MUL(vx,RESTITUTION);
    b->vy=FX_MUL(vy,RESTITUTION);
}'''

old_resolve = '''static void resolve_pegs(Ball *b) {
    uint8_t i, best_index=255;
    int16_t bx=FROM_FX(b->x), by=FROM_FX(b->y);
    uint8_t radius=(power_active==POWER_HAT && power_turns)?6:3;
    uint16_t hitr=(uint16_t)((radius+4)*(radius+4));
    int32_t best_d2=32767L;
    int16_t best_dx=0, best_dy=-1;

    for(i=0;i<peg_count;i++) if(pegs[i].state==1) {
        int16_t dx=(int16_t)(bx-(pegs[i].x*8+4));
        int16_t dy=(int16_t)(by-(pegs[i].y*8+4));
        int32_t d2=(int32_t)dx*dx+(int32_t)dy*dy;
        if(d2<(int32_t)hitr && d2<best_d2) {
            best_d2=d2; best_index=i; best_dx=dx; best_dy=dy;
        }
    }

    if(best_index!=255) {
        int16_t ax=(best_dx<0)?-best_dx:best_dx;
        int16_t ay=(best_dy<0)?-best_dy:best_dy;
        int16_t norm=(ax>ay)?ax:ay;
        int16_t distance=(int16_t)(radius+5);
        int16_t px=(int16_t)(pegs[best_index].x*8+4);
        int16_t py=(int16_t)(pegs[best_index].y*8+4);
        if(norm<1) { best_dx=0; best_dy=-1; norm=1; }
        hit_peg(b,&pegs[best_index]);
        if(!(power_active==POWER_FIRE && power_turns)) reflect_ball(b,best_dx,best_dy,best_d2);
        b->x=TO_FX(px+(best_dx*distance)/norm);
        b->y=TO_FX(py+(best_dy*distance)/norm);
    }
}'''

new_resolve = '''static void resolve_pegs(Ball *b) {
    uint8_t i, best_index=255;
    int16_t bx=FROM_FX(b->x), by=FROM_FX(b->y);
    uint8_t radius=(power_active==POWER_HAT && power_turns)?6:3;
    uint8_t hit_distance=(uint8_t)(radius+4);
    uint16_t hitr=(uint16_t)(hit_distance*hit_distance);
    uint16_t best_d2=65535u;
    int16_t best_dx=0, best_dy=-1;

    for(i=0;i<peg_count;i++) if(pegs[i].state==1) {
        int16_t dx=(int16_t)(bx-(pegs[i].x*8+4));
        int16_t dy=(int16_t)(by-(pegs[i].y*8+4));
        uint8_t ax=(uint8_t)((dx<0)?-dx:dx);
        uint8_t ay=(uint8_t)((dy<0)?-dy:dy);

        /* Reject almost every peg before doing any multiplication. */
        if(ax<hit_distance && ay<hit_distance) {
            uint16_t d2=(uint16_t)ax*ax+(uint16_t)ay*ay;
            if(d2<hitr && d2<best_d2) {
                best_d2=d2; best_index=i; best_dx=dx; best_dy=dy;
            }
        }
    }

    if(best_index!=255) {
        int16_t ax=(best_dx<0)?-best_dx:best_dx;
        int16_t ay=(best_dy<0)?-best_dy:best_dy;
        int16_t distance=(int16_t)(radius+5);
        int16_t px=(int16_t)(pegs[best_index].x*8+4);
        int16_t py=(int16_t)(pegs[best_index].y*8+4);
        if(ax==0 && ay==0) { best_dx=0; best_dy=-1; ay=1; }
        hit_peg(b,&pegs[best_index]);
        if(!(power_active==POWER_FIRE && power_turns)) reflect_ball(b,best_dx,best_dy);

        /* Division-free separation along the dominant collision axis. */
        if(ax>=ay) b->x=TO_FX(px+((best_dx<0)?-distance:distance));
        else b->y=TO_FX(py+((best_dy<0)?-distance:distance));
    }
}'''

if s.count(old_reflect) != 1:
    raise SystemExit('expected exactly one original reflect_ball implementation')
if s.count(old_resolve) != 1:
    raise SystemExit('expected exactly one original resolve_pegs implementation')

s = s.replace(old_reflect, new_reflect)
s = s.replace(old_resolve, new_resolve)
p.write_text(s)
