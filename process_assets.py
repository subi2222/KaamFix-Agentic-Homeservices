import os
import shutil
from PIL import Image

base_dir = os.path.dirname(os.path.abspath(__file__))
workers_dir = os.path.join(base_dir, "public", "assets", "workers")
assets_dir = os.path.join(base_dir, "public", "assets")

os.makedirs(workers_dir, exist_ok=True)
os.makedirs(assets_dir, exist_ok=True)

# 1. Process service grid
grid_path = os.path.join(workers_dir, "service-trades-grid.png")
if not os.path.exists(grid_path):
    grid_path = os.path.join(assets_dir, "service-trades-grid.png")

print(f"Loading grid from: {grid_path}")
img = Image.open(grid_path)

# Slices:
# col 0: (0, 506)
# col 1: (514, 1020)
# col 2: (1028, 1536)
# row 0: (0, 507)
# row 1: (514, 1024)

slices = {
    "service-electrical.png": (0, 0, 506, 507),
    "service-plumbing.png": (514, 0, 1020, 507),
    "service-hvac.png": (1028, 0, 1536, 507),
    "service-carpentry.png": (0, 514, 506, 1024),
    "service-painting.png": (514, 514, 1020, 1024),
    "service-appliances.png": (1028, 514, 1536, 1024),
}

for name, box in slices.items():
    cropped = img.crop(box)
    p1 = os.path.join(assets_dir, name)
    p2 = os.path.join(workers_dir, name)
    cropped.save(p1, quality=95)
    cropped.save(p2, quality=95)
    print(f"Saved {name} ({cropped.size}) to assets and assets/workers")

# 2. Ensure kaamfix-booking-tools.png and kaam-fix-booking-tools.png exist in both places
tools_candidates = [
    os.path.join(workers_dir, "kaamfix-booking-tools.png"),
    os.path.join(assets_dir, "kaamfix-booking-tools.png"),
    os.path.join(workers_dir, "kaam-fix-booking-tools.png"),
    os.path.join(assets_dir, "kaam-fix-booking-tools.png"),
]

source_tools = None
for c in tools_candidates:
    if os.path.exists(c):
        source_tools = c
        break

def safe_copy(src, dst):
    if os.path.abspath(src) != os.path.abspath(dst):
        shutil.copyfile(src, dst)

if source_tools:
    print(f"Found tools image at {source_tools}")
    for target_name in ["kaamfix-booking-tools.png", "kaam-fix-booking-tools.png"]:
        safe_copy(source_tools, os.path.join(assets_dir, target_name))
        safe_copy(source_tools, os.path.join(workers_dir, target_name))
    print("Copied booking tools image to all alias locations")

# 3. Ensure hero image exists in both places
hero_candidates = [
    os.path.join(workers_dir, "kaamfix-hero-v2.png"),
    os.path.join(assets_dir, "kaamfix-hero-v2.png"),
]
source_hero = None
for c in hero_candidates:
    if os.path.exists(c):
        source_hero = c
        break

if source_hero:
    safe_copy(source_hero, os.path.join(assets_dir, "kaamfix-hero-v2.png"))
    safe_copy(source_hero, os.path.join(workers_dir, "kaamfix-hero-v2.png"))
    print("Copied hero image to both assets and assets/workers")

print("Done processing assets!")
