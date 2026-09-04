"""Combine PNGs into a grid: python3 tools/grid.py out.png cols img1 img2 ..."""
import sys
from PIL import Image
out, cols, *imgs = sys.argv[1:]
cols = int(cols)
ims = [Image.open(p) for p in imgs]
w = max(i.width for i in ims); h = max(i.height for i in ims)
rows = (len(ims) + cols - 1) // cols
g = Image.new('RGB', (w * cols, h * rows), 'white')
for i, im in enumerate(ims):
    g.paste(im, ((i % cols) * w, (i // cols) * h))
g.save(out)
print(out, g.size)
