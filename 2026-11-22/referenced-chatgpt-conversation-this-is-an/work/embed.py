from pathlib import Path
import json, win32com.client, zipfile
root=Path.cwd(); m=json.loads((root/'work/manifest.json').read_text())
app=win32com.client.Dispatch('PowerPoint.Application')
p=app.Presentations.Open(r'C:\Users\mirav\AppData\Local\Temp\codex-file-preview-34kYzi\Mental_Health_and_Belonging_Miracle_Jerome(1).pptx',False,False,False)
for s in m['slides']:
 slide=p.Slides(s['slide'])
 audio=slide.Shapes.AddMediaObject2(s['audio'],False,True,-48,-48,32,32)
 audio.Name=f"Narration - Slide {s['slide']:02d}"
 play=audio.AnimationSettings.PlaySettings
 play.PlayOnEntry=True
 play.HideWhileNotPlaying=True
 play.LoopUntilStopped=False
 play.StopAfterSlides=1
 tr=slide.SlideShowTransition
 tr.AdvanceOnClick=False
 tr.AdvanceOnTime=True
 tr.AdvanceTime=s['duration']
 tr.EntryEffect=0
 print(f"Embedded slide {s['slide']}, {s['duration']:.3f}s",flush=True)
p.SlideShowSettings.AdvanceMode=2
p.SlideShowSettings.ShowWithNarration=True
out=root/'outputs/Mental_Health_and_Belonging_With_Narration.pptx'
p.SaveAs(str(out),24)
p.Close()
with zipfile.ZipFile(out) as z:
 media=[x for x in z.namelist() if x.startswith('ppt/media/') and x.lower().endswith(('.m4a','.mp4','.wav'))]
 print('Embedded audio:',len(media),flush=True)
 print('Timing nodes:',sum(b'<p:audio' in z.read(f'ppt/slides/slide{i}.xml') for i in range(1,12)),flush=True)
print(str(out),flush=True)
