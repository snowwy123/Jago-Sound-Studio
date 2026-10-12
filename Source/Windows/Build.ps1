param([string]$SdkDirectory='C:\Jago Studio Dev\Suite\shared\WebView2')
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
& node (Join-Path $root 'Source\build.cjs')
if($LASTEXITCODE -ne 0){throw 'HTML build failed'}
$sdk=[IO.Path]::GetFullPath($SdkDirectory)
if(-not(Test-Path -LiteralPath (Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.Core.dll'))){throw 'Shared WebView2 SDK is missing. Specify -SdkDirectory.'}
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$argsList=@('/nologo','/target:winexe','/platform:x64','/optimize+','/utf8output',('/out:'+(Join-Path $root 'Jago-Music-SFX-Studio.exe')),('/win32icon:'+(Join-Path $PSScriptRoot 'studio.ico')),('/win32manifest:'+(Join-Path $PSScriptRoot 'app.manifest')),'/reference:System.dll','/reference:System.Core.dll','/reference:System.Web.Extensions.dll','/reference:System.Security.dll','/reference:System.Drawing.dll','/reference:System.Windows.Forms.dll',('/reference:'+(Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.Core.dll')),('/reference:'+(Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.WinForms.dll')))
$resources=@{'index.html'=(Join-Path $root 'index.html');'Microsoft.Web.WebView2.Core.dll'=(Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.Core.dll');'Microsoft.Web.WebView2.WinForms.dll'=(Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.WinForms.dll');'WebView2Loader.dll'=(Join-Path $sdk 'runtimes\win-x64\native\WebView2Loader.dll');'WebView2-LICENSE.txt'=(Join-Path $sdk 'LICENSE.txt');'WebView2-NOTICE.txt'=(Join-Path $sdk 'NOTICE.txt')}
foreach($name in $resources.Keys){$argsList+='/resource:'+$resources[$name]+',World.'+$name}
$argsList+=(Join-Path $PSScriptRoot 'App.cs')
$argsList+=(Join-Path $PSScriptRoot 'SoundShelfHost.cs')
$argsList+=(Join-Path $PSScriptRoot 'JagoSuiteHost.cs')

& $compiler @argsList
if($LASTEXITCODE -ne 0){throw 'Windows build failed'}
Write-Output 'Music + SFX Windows edition built.'

# Short public filename; the development alias keeps older local scripts working.
try { Copy-Item -LiteralPath (Join-Path $root 'Jago-Music-SFX-Studio.exe') -Destination (Join-Path $root 'Jago-Sound.exe') -Force } catch [System.IO.IOException] { Write-Warning ('The short-name executable is open. The rebuilt development executable is ready; close the app before replacing its running copy. ' + $_.Exception.Message) }

Copy-Item -LiteralPath (Join-Path $root 'Jago-Music-SFX-Studio.html') -Destination (Join-Path $root 'Jago-Sound.html') -Force
