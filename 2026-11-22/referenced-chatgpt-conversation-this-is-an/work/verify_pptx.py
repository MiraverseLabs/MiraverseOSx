from pathlib import Path
import zipfile,xml.etree.ElementTree as E,hashlib,json
root=Path.cwd(); out=root/'outputs/Mental_Health_and_Belonging_With_Narration.pptx'; src=Path(r'C:\Users\mirav\AppData\Local\Temp\codex-file-preview-34kYzi\Mental_Health_and_Belonging_Miracle_Jerome(1).pptx')
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(src) as orig,zipfile.ZipFile(out) as z:
 original_images={hashlib.sha256(orig.read(n)).hexdigest() for n in orig.namelist() if n.startswith('ppt/media/')}
 new_media={hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('ppt/media/')}
 assert original_images<=new_media
 for i in range(1,12):
  x=E.fromstring(z.read(f'ppt/slides/slide{i}.xml')); y=E.fromstring(orig.read(f'ppt/slides/slide{i}.xml'))
  assert [t.text for t in x.findall('.//a:t',ns)]==[t.text for t in y.findall('.//a:t',ns)]
  effect=x.find('.//p:cTn[@nodeType="withEffect"]',ns)
  assert effect is not None,i
  conditions=[c.attrib.get('delay') for c in x.findall('.//p:timing/p:tnLst/p:par/p:cTn/p:childTnLst/p:seq/p:cTn/p:childTnLst/p:par/p:cTn/p:stCondLst/p:cond',ns)]
  assert '0' in conditions,(i,conditions)
  transitions=x.findall('.//p:transition',ns)
  assert transitions and all(t.attrib.get('advClick')=='0' and int(t.attrib['advTm'])>0 for t in transitions)
 hashes={hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('ppt/media/')}
 for p in (root/'work/audio').glob('*.m4a'):assert hashlib.sha256(p.read_bytes()).hexdigest() in hashes,p
print('PowerPoint verified: 11 automatic narration tracks, original audio bytes, all original images and text, timed slide advances.')

