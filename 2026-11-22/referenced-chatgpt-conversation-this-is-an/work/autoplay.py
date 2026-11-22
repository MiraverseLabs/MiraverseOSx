from pathlib import Path
import win32com.client, json
root=Path.cwd(); m=json.loads((root/'work/manifest.json').read_text())
app=win32com.client.Dispatch('PowerPoint.Application')
p=app.Presentations.Open(str(root/'outputs/Mental_Health_and_Belonging_With_Narration.pptx'),False,False,False)
for s in m['slides']:
 sl=p.Slides(s['slide'])
 for effect in sl.TimeLine.MainSequence:
  print(s['slide'],effect.Shape.Name,'trigger before',effect.Timing.TriggerType,flush=True)
  if effect.Shape.Name.startswith('Narration'):
   effect.Timing.TriggerType=2
   effect.Timing.TriggerDelayTime=0
 sl.SlideShowTransition.AdvanceTime=s['duration']
p.Save()
p.Close()
print('Saved automatic audio playback settings.',flush=True)
