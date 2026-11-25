param([Parameter(Mandatory=$true)][string]$AssemblyPath)
$ErrorActionPreference = 'Stop'
$assembly = [IO.Path]::GetFullPath($AssemblyPath)
$workspace = Split-Path -Parent $PSScriptRoot
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$testDir = [IO.Path]::GetFullPath((Join-Path $tempRoot ('miraverse-media-test-' + [Guid]::NewGuid().ToString('N'))))
if ([IO.Path]::GetDirectoryName($testDir).TrimEnd('\') -ne $tempRoot.TrimEnd('\')) { throw 'Unexpected test directory.' }
New-Item -ItemType Directory -Path $testDir | Out-Null
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$baseUrl = "http://localhost:$port"
$server = $null
$checks = 0
function Check($condition,$message) { if (-not $condition) { throw $message }; $script:checks++ }
function Start-MediaHost {
 $script:server = Start-Process -FilePath (Get-Command dotnet).Source -ArgumentList @(('"'+$assembly+'"'),'--server-only','--port',"$port",'--data-dir',('"'+$testDir+'"')) -WindowStyle Hidden -PassThru -WorkingDirectory $workspace -RedirectStandardOutput (Join-Path $testDir 'host.log') -RedirectStandardError (Join-Path $testDir 'host-error.log')
 for ($i=0;$i -lt 70;$i++) {
  try { $health=Invoke-RestMethod "$baseUrl/api/health" -TimeoutSec 1; if ($health.service -eq 'miraverse-world') { return } } catch {}
  if ($script:server.HasExited) { throw (Get-Content -LiteralPath (Join-Path $testDir 'host-error.log') -Raw) }
  Start-Sleep -Milliseconds 100
 }
 throw 'Media test host failed to start.'
}
try {
 Start-MediaHost
 $png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII='
 $body=@{name='qa.png';mimeType='image/png';dataBase64=$png;scope='player_work';slotRole='portrait.editorial';entityIds=@('char-jeremie-belpois');creator='Isolated QA';caption='QA artwork'} | ConvertTo-Json
 $uploaded=Invoke-RestMethod "$baseUrl/api/media" -Method Post -ContentType 'application/json' -Body $body
 Check ($uploaded.asset.id.StartsWith('runtime:')) 'Upload did not return a runtime ID.'
 Check ($uploaded.asset.provenance.approvalStatus -eq 'player_sandbox') 'Player upload acquired official canon approval.'
 Check ($uploaded.asset.provenance.creator -eq 'Isolated QA') 'Provenance creator was lost.'
 $url="$baseUrl$($uploaded.asset.src)"
 $image=Invoke-WebRequest $url
 Check ($image.Headers.'Content-Type' -like 'image/png*') 'Image MIME was not retained.'
 Check ($image.RawContentLength -eq [Convert]::FromBase64String($png).Length) 'Uploaded bytes changed.'
 $list=Invoke-RestMethod "$baseUrl/api/media"
 Check (@($list.assets | Where-Object id -eq $uploaded.asset.id).Length -eq 1) 'Media metadata not indexed exactly once.'
 $bad=@{mimeType='image/svg+xml';dataBase64=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))} | ConvertTo-Json
 $rejected=Invoke-WebRequest "$baseUrl/api/media" -Method Post -ContentType 'application/json' -Body $bad -SkipHttpErrorCheck
 Check ($rejected.StatusCode -eq 400) 'Executable SVG markup was accepted.'
 $foreign=Invoke-WebRequest "$baseUrl/api/media" -Headers @{Origin='https://foreign.invalid'} -SkipHttpErrorCheck
 Check ($foreign.StatusCode -eq 403) 'Foreign origin reached the media collection.'
 Stop-Process -Id $server.Id
 $server.WaitForExit()
 Start-MediaHost
 $again=Invoke-RestMethod "$baseUrl/api/media"
 Check (@($again.assets | Where-Object id -eq $uploaded.asset.id).Length -eq 1) 'Media metadata did not survive host restart.'
 Check ((Invoke-WebRequest $url).RawContentLength -eq $image.RawContentLength) 'Media bytes did not survive host restart.'
 Write-Output "Media host integration checks passed: $checks"
} finally {
 if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id; $server.WaitForExit() }
 $resolved=(Resolve-Path -LiteralPath $testDir).Path
 if ([IO.Path]::GetDirectoryName($resolved).TrimEnd('\') -ne $tempRoot.TrimEnd('\') -or -not [IO.Path]::GetFileName($resolved).StartsWith('miraverse-media-test-')) { throw 'Refusing unexpected cleanup target.' }
 Remove-Item -LiteralPath $resolved -Recurse -Force
}
