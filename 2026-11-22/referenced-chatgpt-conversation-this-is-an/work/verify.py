from pathlib import Path
import subprocess,json,re,wave,array,math,xml.etree.ElementTree as E,zipfile,hashlib
from PIL import Image,ImageChops,ImageStat,ImageDraw
root=Path.cwd(); m=json.loads((root/'work/manifest.json').read_text()); ff=m['ffmpeg']; video=root/'outputs/Mental_Health_and_Belonging_Narrated.mp4'
qa=root/'work/qa'; qa.mkdir(exist_ok=True)
frames=[0]+[round((s['start']+s['duration']/2)*30) for s in m['slides']]+[m['total_frames']-1]
expr='+'.join(f'eq(n\\,{n})' for n in frames)
args=[ff,'-hide_banner','-loglevel','warning','-xerror','-err_detect','explode','-i',str(video),'-filter_complex',f'[0:v]select={expr},scale=480:270[v]','-map','[v]','-fps_mode','vfr','-q:v','2',str(qa/'frame_%02d.jpg'),'-map','0:a:0','-ac','1','-ar','48000','-c:a','pcm_s16le','-y',str(qa/'decoded_audio.wav')]
p=subprocess.run(args,capture_output=True,text=True)
(qa/'decode_log.txt').write_text(p.stderr)
if p.returncode: raise RuntimeError(p.stderr)
assert len(list(qa.glob('frame_*.jpg')))==13
with wave.open(str(root/'work/narration.wav'),'rb') as w: original=array.array('h',w.readframes(w.getnframes())); source_samples=w.getnframes()
with wave.open(str(qa/'decoded_audio.wav'),'rb') as w: decoded=array.array('h',w.readframes(w.getnframes())); output_samples=w.getnframes()
n=min(len(original),len(decoded)); a=original[:n:97]; b=decoded[:n:97]
ab=sum(x*y for x,y in zip(a,b)); aa=sum(x*x for x in a); bb=sum(y*y for y in b)
corr=ab/math.sqrt(aa*bb)
assert corr>.99,corr
assert abs(output_samples-source_samples)<1024,(output_samples,source_samples)
errors=[]; thumbs=[]
for i in range(1,12):
 actual=Image.open(qa/f'frame_{i+1:02d}.jpg').convert('RGB')
 expected=Image.open(root/'work/slides'/f'slide_{i:02d}.png').convert('RGB').resize((480,270))
 error=sum(ImageStat.Stat(ImageChops.difference(actual,expected)).mean)/3
 assert error<6,(i,error)
 errors.append(error)
 tile=Image.new('RGB',(500,300),'#dddddd'); tile.paste(actual,(10,5)); ImageDraw.Draw(tile).text((10,280),f'Slide {i}',fill='black'); thumbs.append(tile)
contact=Image.new('RGB',(1500,1200),'white')
for k,tile in enumerate(thumbs):contact.paste(tile,((k%3)*500,(k//3)*300))
contact.save(qa/'video_contact.jpg')
# Read exact movie duration from the MP4 movie header.
def atoms(data,start=0,end=None):
 end=len(data) if end is None else end
 while start+8<=end:
  size=int.from_bytes(data[start:start+4],'big'); tag=data[start+4:start+8]; head=8
  if size==1:size=int.from_bytes(data[start+8:start+16],'big');head=16
  if size==0:size=end-start
  yield tag,start+head,start+size
  start+=size
raw=video.read_bytes(); moov=next((s,e) for t,s,e in atoms(raw) if t==b'moov'); mvhd=next((s,e) for t,s,e in atoms(raw,*moov) if t==b'mvhd'); data=raw[mvhd[0]:mvhd[1]]
if data[0]==0:timescale=int.from_bytes(data[12:16],'big'); ticks=int.from_bytes(data[16:20],'big')
else:timescale=int.from_bytes(data[20:24],'big');ticks=int.from_bytes(data[24:32],'big')
report=dict(video_duration=ticks/timescale,narration_duration=m['total_duration'],decoded_samples=output_samples,original_samples=source_samples,audio_correlation=corr,slide_image_errors=errors,full_decode='passed',frame_count=m['total_frames'],resolution='1920x1080',fps=30)
(qa/'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2),flush=True)
