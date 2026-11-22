from pathlib import Path
import subprocess, json, wave, math
root=Path.cwd(); m=json.loads((root/'work/manifest.json').read_text()); ff=m['ffmpeg']
def run(args):
 p=subprocess.run([ff,'-hide_banner','-loglevel','error','-y']+args,capture_output=True,text=True)
 if p.returncode: raise RuntimeError(p.stderr)
(root/'work/segments').mkdir(exist_ok=True)
audio_parts=[]; samples=0; prev_frames=0
for s in m['slides']:
 wav=root/'work/audio'/f"slide_{s['slide']:02d}.wav"
 run(['-i',s['audio'],'-vn','-ac','1','-ar','48000','-c:a','pcm_s16le',str(wav)])
 with wave.open(str(wav),'rb') as w:
  data=w.readframes(w.getnframes()); s['samples']=w.getnframes(); s['duration']=w.getnframes()/48000
 audio_parts.append(data); s['start']=samples/48000; samples+=s['samples']; s['end']=samples/48000
 total_frames=round(samples/48000*30); s['frames']=total_frames-prev_frames; prev_frames=total_frames
with wave.open(str(root/'work/narration.wav'),'wb') as w:
 w.setparams((1,2,48000,0,'NONE','not compressed')); w.writeframes(b''.join(audio_parts))
m['total_duration']=samples/48000; m['total_frames']=prev_frames
(root/'work/manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
print(f"Exact runtime: {m['total_duration']:.6f}s; {prev_frames} frames",flush=True)
for s in m['slides']:
 i=s['slide']; frames=s['frames']; duration=frames/30; img=str(root/'work/slides'/f'slide_{i:02d}.png'); out=root/'work/segments'/f'segment_{i:02d}.mp4'
 args=['-loop','1','-framerate','30','-i',img]
 if i<11:
  args+=['-loop','1','-framerate','30','-i',str(root/'work/slides'/f'slide_{i+1:02d}.png'),'-filter_complex_threads','1','-filter_complex',f'[0:v]settb=AVTB,format=yuv420p[a];[1:v]settb=AVTB,format=yuv420p[b];[a][b]xfade=transition=fade:duration={8/30:.8f}:offset={duration-8/30:.8f},format=yuv420p[v]','-map','[v]']
 args+=['-frames:v',str(frames),'-c:v','libx264','-preset','veryfast','-tune','stillimage','-crf','18','-pix_fmt','yuv420p','-r','30','-threads','4','-an',str(out)]
 run(args); print(f'Rendered slide {i}/11 ({duration:.2f}s)',flush=True)
(root/'work/segments.txt').write_text(''.join("file 'segments/segment_%02d.mp4'\n"%i for i in range(1,12)))
out=root/'outputs/Mental_Health_and_Belonging_Narrated.mp4'
run(['-f','concat','-safe','0','-i',str(root/'work/segments.txt'),'-i',str(root/'work/narration.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-t',str(m['total_duration']),str(out)])
print('Finished '+str(out),flush=True)
