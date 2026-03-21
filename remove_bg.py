import rembg
from PIL import Image
import os

input_path = "d:/documentos/documentacion importante jhims/JHIMS_V2/public/logos/933cca832a294a0a882f80187f942254.jpg"
output_path = "d:/documentos/documentacion importante jhims/JHIMS_V2/public/logo-transparent.png"

try:
    print("Loading image...")
    input_image = Image.open(input_path)
    print("Removing background... (This may take a moment to download models on first run)")
    output_image = rembg.remove(input_image)
    print("Saving output...")
    output_image.save(output_path)
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
