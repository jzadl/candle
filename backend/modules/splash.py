import os
from PIL import Image
from .commands import log_message

def convert_to_splash(input_path: str, output_path: str, width: int = 1080, height: int = 2400, format_type: str = "RGBA") -> bool:
    if not os.path.exists(input_path):
        log_message(f"Error: Input file {input_path} does not exist.")
        return False
        
    try:
        log_message(f"Converting splash: {os.path.basename(input_path)} -> size {width}x{height} ({format_type})")
        img = Image.open(input_path)
        img = img.resize((width, height), Image.Resampling.LANCZOS)
        
        if format_type == "RGBA":
            img = img.convert("RGBA")
            with open(output_path, "wb") as f:
                f.write(img.tobytes())
        elif format_type == "RGB565":
            img = img.convert("RGB")
            raw_bytes = bytearray()
            for r, g, b in img.getdata():
                r5 = (r >> 3) & 0x1F
                g6 = (g >> 2) & 0x3F
                b5 = (b >> 3) & 0x1F
                rgb565 = (r5 << 11) | (g6 << 5) | b5
                raw_bytes.append(rgb565 & 0xFF)
                raw_bytes.append((rgb565 >> 8) & 0xFF)
            with open(output_path, "wb") as f:
                f.write(raw_bytes)
        else:
            log_message(f"Unsupported splash format type: {format_type}")
            return False
            
        log_message(f"Splash conversion finished: {os.path.basename(output_path)}")
        return True
    except Exception as e:
        log_message(f"Splash conversion error: {str(e)}")
        return False
