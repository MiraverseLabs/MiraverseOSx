from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
root=Path.cwd(); thumbs=[]
for p in sorted((root/'work'/'slides').glob('*.png')):
 im=Image.open(p).convert('RGB'); im.thumbnail((480,270))
 canvas=Image.new('RGB',(500,300),'#dddddd'); canvas.paste(im,(10,5)); ImageDraw.Draw(canvas).text((10,278),p.stem,fill='black'); thumbs.append(canvas)
out=Image.new('RGB',(1500,1200),'white')
for i,im in enumerate(thumbs):out.paste(im,((i%3)*500,(i//3)*300))
out.save(root/'work'/'contact_sheet.jpg')
