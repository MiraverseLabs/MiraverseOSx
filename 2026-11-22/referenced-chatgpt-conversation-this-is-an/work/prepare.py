from pathlib import Path
import shutil, subprocess, re, json, zipfile
import imageio_ffmpeg
import win32com.client
root=Path.cwd()
src=Path(r'C:\Users\mirav\AppData\Local\Temp\codex-file-preview-34kYzi\Mental_Health_and_Belonging_Miracle_Jerome(1).pptx')
sounds=Path(r'C:\Users\mirav\OneDrive\Documents\Sound Recordings')
ff=imageio_ffmpeg.get_ffmpeg_exe()
items=[]
for i in range(1,12):
    if i<3: p=next(x for x in sounds.iterdir() if x.name.lower()==f'slide {i}.m4a')
    else: p=next(Path(r'C:\Users\mirav\AppData\Local\Temp').glob(f'codex-file-preview-*/[sS]lide {i}.m4a'))
    dest=root/'work'/'audio'/f'slide_{i:02d}.m4a'; shutil.copy2(p,dest)
    r=subprocess.run([ff,'-i',str(dest)],capture_output=True,text=True)
    m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',r.stderr)
    dur=int(m[1])*3600+int(m[2])*60+float(m[3])
    items.append(dict(slide=i,source=str(p),audio=str(dest),duration=dur))
app=win32com.client.Dispatch('PowerPoint.Application')
pres=app.Presentations.Open(str(src),True,False,False)
print('Slides:',pres.Slides.Count,'Size:',pres.PageSetup.SlideWidth,pres.PageSetup.SlideHeight,flush=True)
width=1920; height=round(width*pres.PageSetup.SlideHeight/pres.PageSetup.SlideWidth)
for slide in pres.Slides:
    slide.Export(str(root/'work'/'slides'/f'slide_{slide.SlideIndex:02d}.png'),'PNG',width,height)
    items[slide.SlideIndex-1]['text']=' | '.join(s.TextFrame.TextRange.Text for s in slide.Shapes if s.HasTextFrame and s.TextFrame.HasText)
pres.Close()
manifest=dict(ffmpeg=ff,width=width,height=height,slides=items,total_duration=sum(x['duration'] for x in items))
(root/'work'/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2),flush=True)
