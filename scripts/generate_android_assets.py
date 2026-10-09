import os
from PIL import Image, ImageDraw

LOGO_PATH = "frontend/public/images/akv-logo.png"
RES_DIR = "frontend/android/app/src/main/res"

def generate_icons():
    logo = Image.open(LOGO_PATH).convert("RGBA")
    
    # 1. Launcher icons (square & round)
    mipmap_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, size in mipmap_sizes.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Standard icon with slight padding on rich background
        canvas = Image.new("RGBA", (size, size), (28, 25, 23, 255))
        # Draw rounded rectangle background with Karnataka red/maroon accent
        draw = ImageDraw.Draw(canvas)
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=(153, 27, 27, 255))
        
        # Resize logo keeping aspect ratio
        logo_copy = logo.copy()
        pad = int(size * 0.12)
        target_box = size - (pad * 2)
        logo_copy.thumbnail((target_box, target_box), Image.Resampling.LANCZOS)
        
        offset = ((size - logo_copy.width) // 2, (size - logo_copy.height) // 2)
        canvas.paste(logo_copy, offset, mask=logo_copy)
        canvas.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        
        # Round icon
        round_canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        round_draw = ImageDraw.Draw(round_canvas)
        round_draw.ellipse([0, 0, size - 1, size - 1], fill=(153, 27, 27, 255))
        round_canvas.paste(logo_copy, offset, mask=logo_copy)
        round_canvas.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")

        # Adaptive icon foreground (centered logo on transparent background)
        fg_size = int(size * 2.25)
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        fg_logo = logo.copy()
        fg_target = int(fg_size * 0.65)
        fg_logo.thumbnail((fg_target, fg_target), Image.Resampling.LANCZOS)
        fg_offset = ((fg_size - fg_logo.width) // 2, (fg_size - fg_logo.height) // 2)
        fg_canvas.paste(fg_logo, fg_offset, mask=fg_logo)
        fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")

    print("[ICONS] Successfully generated all Android launcher icons.")

def generate_splash_screens():
    logo = Image.open(LOGO_PATH).convert("RGBA")
    bg_color = (28, 25, 23, 255) # #1C1917 stone-900

    splash_sizes = {
        "drawable": (480, 800),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }

    for folder, (w, h) in splash_sizes.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        splash = Image.new("RGBA", (w, h), bg_color)
        
        # Logo in center takes ~45% of width in portrait, ~40% of height in landscape
        max_dim = min(int(w * 0.5), int(h * 0.45))
        splash_logo = logo.copy()
        splash_logo.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        offset = ((w - splash_logo.width) // 2, (h - splash_logo.height) // 2)
        splash.paste(splash_logo, offset, mask=splash_logo)
        splash.save(os.path.join(folder_path, "splash.png"), "PNG")

    print("[SPLASH] Successfully generated all Android splash screens.")

if __name__ == "__main__":
    generate_icons()
    generate_splash_screens()
