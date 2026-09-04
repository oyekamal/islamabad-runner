#!/usr/bin/env python3
"""
Islamabad Runner — Python/pygame prototype.
60-90s auto-scrolling motorcycle runner. Tap = jump, Hold = duck, Double-tap = turbo.
Reach D-Chowk (distance goal) to win; 0 HP = arrested.
"""
import pygame
import random
import sys
import time

pygame.init()

# ── Config ─────────────────────────────────────────────────────────────────
W, H = 960, 400
GROUND_Y = 320
FPS = 60
FINISH_DISTANCE = 3000  # meters to win

SPRITES = "assets/sprites_pil"

# Palette (fallback for text/UI, matches game spec)
ASPHALT   = (28, 28, 34)
SKY       = (60, 70, 55)
SKY_RED   = (50, 35, 40)
PTI_BLUE  = (37, 97, 163)
TEARGAS   = (184, 212, 64)
WHITE     = (232, 229, 224)
RED       = (200, 50, 40)
GREEN     = (46, 140, 63)

screen = pygame.display.set_mode((W, H))
pygame.display.set_caption("Islamabad Runner — prototype")
clock = pygame.time.Clock()
font_big = pygame.font.SysFont("couriernew", 36, bold=True)
font_med = pygame.font.SysFont("couriernew", 20, bold=True)
font_sm = pygame.font.SysFont("couriernew", 14)


def load(name, size=None):
    img = pygame.image.load(f"{SPRITES}/{name}").convert_alpha()
    if size:
        img = pygame.transform.smoothscale(img, size)
    return img


def load_sheet(name, frame_w, frame_h, n_frames, size=None):
    sheet = pygame.image.load(f"{SPRITES}/{name}").convert_alpha()
    frames = []
    for i in range(n_frames):
        frame = sheet.subsurface((i * frame_w, 0, frame_w, frame_h)).copy()
        if size:
            frame = pygame.transform.smoothscale(frame, size)
        frames.append(frame)
    return frames


# ── Assets ─────────────────────────────────────────────────────────────────
BIKE_FRAMES = load_sheet("bike_ride.png", 128, 96, 3, size=(110, 82))
RANGER_FRAMES = load_sheet("ranger_walk.png", 96, 128, 2, size=(60, 80))
TEARGAS_FRAMES = load_sheet("teargas_roll.png", 128, 128, 3, size=(56, 56))
CONTAINER_IMG = load("container_stack.png", size=(90, 90))
CONE_IMG = load("police_cone.png", size=(50, 50))
WHATSAPP_IMG = load("whatsapp_icon.png", size=(44, 44))
BIRYANI_IMG = load("biryani_box.png", size=(44, 44))
JEEP_IMG = load("army_jeep.png", size=(150, 75))
HUD_IMG = load("hud_bar.png", size=(W, 62))


# ── Player ─────────────────────────────────────────────────────────────────
class Player:
    GROUND_Y = GROUND_Y

    def __init__(self):
        self.x = 120
        self.y = self.GROUND_Y
        self.vy = 0
        self.jumping = False
        self.ducking = False
        self.hp = 3
        self.turbo_charge = 0  # 0..3
        self.turbo_active_until = 0
        self.anim_frame = 0
        self.anim_timer = 0
        self.invuln_until = 0
        self.w, self.h = 110, 82
        self.duck_h = 50

    @property
    def rect(self):
        h = self.duck_h if self.ducking else self.h
        y = self.y - h
        return pygame.Rect(self.x, y, self.w * 0.5, h)  # tighter hitbox than sprite

    def jump(self):
        if not self.jumping and not self.ducking:
            self.vy = -15
            self.jumping = True

    def start_duck(self):
        if not self.jumping:
            self.ducking = True

    def stop_duck(self):
        self.ducking = False

    def turbo(self):
        now = time.time()
        if self.turbo_charge >= 3 and now > self.turbo_active_until:
            self.turbo_charge -= 3
            self.turbo_active_until = now + 2.0

    def is_turbo(self):
        return time.time() < self.turbo_active_until

    def hit(self):
        now = time.time()
        if now > self.invuln_until:
            self.hp -= 1
            self.invuln_until = now + 1.2
            return True
        return False

    def update(self, dt):
        if self.jumping:
            self.vy += 45 * dt * 60 / 60  # gravity
            self.y += self.vy
            if self.y >= self.GROUND_Y:
                self.y = self.GROUND_Y
                self.jumping = False
                self.vy = 0

        self.anim_timer += dt
        if self.anim_timer > 0.1:
            self.anim_timer = 0
            self.anim_frame = (self.anim_frame + 1) % 3

    def draw(self, surf):
        now = time.time()
        flicker = self.invuln_until > now and int(now * 20) % 2 == 0
        if flicker:
            return
        frame = BIKE_FRAMES[self.anim_frame]
        h = self.duck_h if self.ducking else self.h
        scale = h / self.h
        img = frame
        if self.ducking:
            img = pygame.transform.smoothscale(frame, (int(self.w), int(self.duck_h)))
        y = self.y - h
        if self.is_turbo():
            glow = pygame.Surface((self.w + 20, h + 20), pygame.SRCALPHA)
            pygame.draw.ellipse(glow, (184, 212, 64, 90), glow.get_rect())
            surf.blit(glow, (self.x - 10, y - 10))
        surf.blit(img, (self.x, y))


# ── Obstacles ──────────────────────────────────────────────────────────────
class Obstacle:
    def __init__(self, kind, x):
        self.kind = kind
        self.x = x
        self.passed = False
        if kind == "container":
            self.img = CONTAINER_IMG
            self.w, self.h = 90, 90
            self.y = GROUND_Y - self.h
        elif kind == "cone":
            self.img = CONE_IMG
            self.w, self.h = 50, 50
            self.y = GROUND_Y - self.h
        elif kind == "teargas":
            self.frames = TEARGAS_FRAMES
            self.w, self.h = 56, 56
            self.y = GROUND_Y - self.h
            self.anim_frame = 0
            self.anim_timer = 0
        elif kind == "ranger":
            self.frames = RANGER_FRAMES
            self.w, self.h = 60, 80
            self.y = GROUND_Y - self.h
            self.anim_frame = 0
            self.anim_timer = 0
        elif kind == "jeep":
            self.img = JEEP_IMG
            self.w, self.h = 150, 75
            self.y = GROUND_Y - self.h
        self.dodge_hint = {
            "container": "JUMP", "cone": "JUMP", "teargas": "DUCK",
            "ranger": "JUMP", "jeep": "JUMP",
        }[kind]

    @property
    def rect(self):
        pad = 10
        return pygame.Rect(self.x + pad, self.y + pad, self.w - 2 * pad, self.h - 2 * pad)

    def update(self, dt, scroll_speed):
        self.x -= scroll_speed * dt
        if self.kind in ("teargas", "ranger"):
            self.anim_timer += dt
            n = len(self.frames)
            if self.anim_timer > 0.15:
                self.anim_timer = 0
                self.anim_frame = (self.anim_frame + 1) % n

    def draw(self, surf):
        if self.kind in ("teargas", "ranger"):
            surf.blit(self.frames[self.anim_frame], (self.x, self.y))
        else:
            surf.blit(self.img, (self.x, self.y))

    def offscreen(self):
        return self.x + self.w < -50


class Collectible:
    def __init__(self, kind, x, y):
        self.kind = kind
        self.x = x
        self.y = y
        self.w, self.h = 44, 44
        self.img = WHATSAPP_IMG if kind == "whatsapp" else BIRYANI_IMG
        self.collected = False
        self.bob = random.uniform(0, 6.28)

    @property
    def rect(self):
        return pygame.Rect(self.x, self.y, self.w, self.h)

    def update(self, dt, scroll_speed):
        self.x -= scroll_speed * dt
        self.bob += dt * 4

    def draw(self, surf):
        import math
        yo = math.sin(self.bob) * 4
        surf.blit(self.img, (self.x, self.y + yo))

    def offscreen(self):
        return self.x + self.w < -50


# ── Zones ──────────────────────────────────────────────────────────────────
ZONES = [
    {"name": "FAISAL AVENUE", "min_d": 0, "max_d": 700, "bg": SKY, "density": 0.5},
    {"name": "SRINAGAR CHOKEPOINT", "min_d": 700, "max_d": 1600, "bg": (90, 85, 60), "density": 1.0},
    {"name": "RED ZONE", "min_d": 1600, "max_d": 2600, "bg": SKY_RED, "density": 1.4},
    {"name": "D-CHOWK — FINAL SPRINT", "min_d": 2600, "max_d": FINISH_DISTANCE, "bg": (40, 60, 40), "density": 0.0},
]


def current_zone(distance):
    for z in ZONES:
        if z["min_d"] <= distance < z["max_d"]:
            return z
    return ZONES[-1]


# ── Game state ─────────────────────────────────────────────────────────────
class Game:
    def __init__(self):
        self.reset()

    def reset(self):
        self.player = Player()
        self.obstacles = []
        self.collectibles = []
        self.distance = 0.0
        self.base_speed = 220
        self.scroll_x = 0
        self.spawn_timer = 0
        self.state = "ready"  # ready, playing, win, lose
        self.start_time = None
        self.last_tap = 0
        self.road_scroll = 0

    def speed(self):
        s = self.base_speed + self.distance * 0.03
        if self.player.is_turbo():
            s *= 1.8
        return s

    def spawn(self):
        zone = current_zone(self.distance)
        if zone["density"] <= 0:
            return
        kinds = ["container", "cone", "teargas", "ranger"]
        if self.distance > 1200:
            kinds.append("jeep")
        kind = random.choice(kinds)
        self.obstacles.append(Obstacle(kind, W + 50))
        if random.random() < 0.5:
            cx = W + 50 + random.randint(80, 160)
            cy = GROUND_Y - random.randint(60, 160)
            ckind = "whatsapp" if random.random() < 0.6 else "biryani"
            self.collectibles.append(Collectible(ckind, cx, cy))

    def update(self, dt):
        if self.state != "playing":
            return
        spd = self.speed()
        self.distance += spd * dt * 0.05
        self.road_scroll = (self.road_scroll - spd * dt) % 40

        self.player.update(dt)

        zone = current_zone(self.distance)
        spawn_interval = max(0.5, 1.6 / max(zone["density"], 0.01)) if zone["density"] > 0 else 999
        self.spawn_timer += dt
        if self.spawn_timer > spawn_interval:
            self.spawn_timer = 0
            self.spawn()

        for o in self.obstacles:
            o.update(dt, spd)
        for c in self.collectibles:
            c.update(dt, spd)

        self.obstacles = [o for o in self.obstacles if not o.offscreen()]
        self.collectibles = [c for c in self.collectibles if not (c.offscreen() or c.collected)]

        prect = self.player.rect
        for o in self.obstacles:
            if not o.passed and prect.colliderect(o.rect):
                if self.player.hit():
                    pass
                o.passed = True
            if o.x + o.w < self.player.x:
                o.passed = True

        for c in self.collectibles:
            if prect.colliderect(c.rect):
                c.collected = True
                if c.kind == "whatsapp":
                    self.player.turbo_charge = min(3, self.player.turbo_charge + 1)
                else:
                    self.player.hp = min(3, self.player.hp + 1)

        if self.player.hp <= 0:
            self.state = "lose"
        elif self.distance >= FINISH_DISTANCE:
            self.state = "win"

    def start(self):
        self.reset()
        self.state = "playing"
        self.start_time = time.time()

    def elapsed(self):
        if self.start_time is None:
            return 0
        return time.time() - self.start_time


game = Game()


def handle_tap():
    now = time.time()
    if now - game.last_tap < 0.3:
        game.player.turbo()
    else:
        game.player.jump()
    game.last_tap = now


def draw_background(surf, zone):
    surf.fill(zone["bg"])
    # ground
    pygame.draw.rect(surf, ASPHALT, (0, GROUND_Y + 60, W, H - GROUND_Y - 60))
    pygame.draw.rect(surf, (70, 70, 78), (0, GROUND_Y + 60, W, 4))
    # scrolling lane markers
    for i in range(-1, W // 40 + 2):
        x = i * 40 - game.road_scroll
        pygame.draw.rect(surf, (150, 150, 40), (x, GROUND_Y + 90, 20, 5))
    # zone label backdrop shapes (parallax hint)
    if "CHOKEPOINT" in zone["name"]:
        for i in range(4):
            cx = (i * 260 - game.road_scroll * 0.3) % (W + 200) - 100
            pygame.draw.rect(surf, (35, 55, 78), (cx, GROUND_Y - 40, 60, 40))
    elif "RED ZONE" in zone["name"]:
        for i in range(3):
            cx = (i * 320 - game.road_scroll * 0.2) % (W + 200) - 100
            pygame.draw.circle(surf, (55, 42, 42), (int(cx), GROUND_Y - 90), 30)
    elif "D-CHOWK" in zone["name"]:
        pygame.draw.rect(surf, (200, 190, 150), (W // 2 - 100, GROUND_Y - 160, 200, 160))


def draw_hud(surf):
    surf.blit(HUD_IMG, (0, 0))
    # HP dots
    for i in range(3):
        color = (255, 255, 200) if i < game.player.hp else (60, 60, 60)
        pygame.draw.circle(surf, color, (35 + i * 42, 31), 14)
        pygame.draw.circle(surf, ASPHALT, (35 + i * 42, 31), 14, 2)
    # Turbo bar
    pygame.draw.rect(surf, ASPHALT, (200, 18, 200, 26))
    fill_w = int(200 * (game.player.turbo_charge / 3))
    pygame.draw.rect(surf, TEARGAS, (200, 18, fill_w, 26))
    pygame.draw.rect(surf, WHITE, (200, 18, 200, 26), 2)
    label = font_sm.render("TURBO", True, WHITE)
    surf.blit(label, (200, 46))
    # Distance
    zone = current_zone(game.distance)
    dist_label = font_med.render(f"{int(game.distance)}m", True, TEARGAS)
    surf.blit(dist_label, (W - 160, 10))
    zone_label = font_sm.render(zone["name"], True, WHITE)
    surf.blit(zone_label, (W - 160, 36))


def draw_center_text(surf, lines, sub=False):
    overlay = pygame.Surface((W, H), pygame.SRCALPHA)
    overlay.fill((10, 10, 14, 180))
    surf.blit(overlay, (0, 0))
    y = H // 2 - (len(lines) * 30)
    for i, (text, big) in enumerate(lines):
        f = font_big if big else font_med
        color = TEARGAS if big else WHITE
        surf_text = f.render(text, True, color)
        rect = surf_text.get_rect(center=(W // 2, y))
        surf.blit(surf_text, rect)
        y += 46 if big else 30


def main():
    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_SPACE:
                    if game.state in ("ready", "win", "lose"):
                        game.start()
                    else:
                        handle_tap()
                elif event.key == pygame.K_DOWN:
                    if game.state == "playing":
                        game.player.start_duck()
            elif event.type == pygame.KEYUP:
                if event.key == pygame.K_DOWN:
                    game.player.stop_duck()
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if game.state in ("ready", "win", "lose"):
                    game.start()
                else:
                    handle_tap()

        game.update(dt)

        zone = current_zone(game.distance)
        draw_background(screen, zone)

        for o in game.obstacles:
            o.draw(screen)
        for c in game.collectibles:
            c.draw(screen)
        game.player.draw(screen)

        if game.state == "playing":
            draw_hud(screen)
        elif game.state == "ready":
            draw_center_text(screen, [
                ("ISLAMABAD RUNNER", True),
                ("SPACE / CLICK = jump   HOLD DOWN = duck   DOUBLE-TAP = turbo", False),
                ("Press SPACE to start", False),
            ])
        elif game.state == "win":
            draw_center_text(screen, [
                ("YOU REACHED D-CHOWK!", True),
                (f"{int(game.distance)}m in {game.elapsed():.1f}s", False),
                ("Mobile internet still blocked. But you made it.", False),
                ("Press SPACE to run again", False),
            ])
        elif game.state == "lose":
            draw_center_text(screen, [
                ("ARRESTED. 954 OTHERS JOIN YOU TODAY.", True),
                (f"Reached {int(game.distance)}m", False),
                ("Section 144 is still in effect.", False),
                ("Press SPACE to try again", False),
            ])

        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
