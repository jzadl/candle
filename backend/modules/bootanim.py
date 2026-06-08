import os
import zipfile
import shutil
import cv2
from .commands import log_message

def create_boot_animation(output_zip: str, frames_source: str, width: int = 1080, height: int = 2400, fps: int = 30) -> bool:
    try:
        log_message(f"Building boot animation: {os.path.basename(output_zip)} ({width}x{height} @ {fps}fps)")
        if not os.path.exists(frames_source):
            log_message(f"Error: Frames source {frames_source} does not exist.")
            return False
        temp_dir = os.path.join(os.path.dirname(output_zip), "temp_bootanim_frames")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        os.makedirs(temp_dir, exist_ok=True)
        os.makedirs(os.path.join(temp_dir, "part0"), exist_ok=True)
        frames_list = []
        if os.path.isdir(frames_source):
            for idx, f in enumerate(sorted(os.listdir(frames_source))):
                if f.lower().endswith((".png", ".jpg", ".jpeg")):
                    src_path = os.path.join(frames_source, f)
                    img = cv2.imread(src_path)
                    if img is not None:
                        img_resized = cv2.resize(img, (width, height))
                        dest_path = os.path.join(temp_dir, "part0", f"{idx:05d}.png")
                        cv2.imwrite(dest_path, img_resized)
                        frames_list.append(dest_path)
        else:
            cap = cv2.VideoCapture(frames_source)
            if not cap.isOpened():
                log_message(f"Error: Could not open video file {frames_source}")
                shutil.rmtree(temp_dir)
                return False
            idx = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_resized = cv2.resize(frame, (width, height))
                dest_path = os.path.join(temp_dir, "part0", f"{idx:05d}.png")
                cv2.imwrite(dest_path, frame_resized)
                frames_list.append(dest_path)
                idx += 1
            cap.release()
        if not frames_list:
            log_message("Error: No valid frames found.")
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            return False
        desc_content = f"{width} {height} {fps}\np 1 0 part0\n"
        with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_STORED) as z:
            z.writestr("desc.txt", desc_content)
            for idx, frame_path in enumerate(frames_list):
                arcname = f"part0/{idx:05d}.png"
                z.write(frame_path, arcname)
        shutil.rmtree(temp_dir)
        log_message(f"Boot animation compiled successfully with {len(frames_list)} frames at: {output_zip}")
        return True
    except Exception as e:
        log_message(f"Boot animation compilation error: {str(e)}")
        if 'temp_dir' in locals() and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        return False
