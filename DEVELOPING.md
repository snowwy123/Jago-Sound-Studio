# Building Jago Sound

Use Windows x64 and Microsoft Edge WebView2 Runtime. Install Node.js for the browser build and the .NET Framework C# compiler for the Windows host.

From this repository, run **Build.ps1** in PowerShell. The wrapper uses the included WebView2 SDK. Edit the files under **Source**, then rebuild; generated HTML is build output.

Keep licence notices with redistributed code and binaries.

## Refinement checks

With Playwright and Microsoft Edge installed, run `node Source/Tests/sound-refresher.cjs` after building. It verifies the preserved original fixture, new generation/performance, locks, scoped edits, mixer state/Undo, ingredient families, loop joins and project reopening.

`node Source/Tests/sound-audio-integration.cjs` expects Jago-World-Studio, Jago-Library-Studio and Jago-Pulse-Studio beside this checkout. It renders varied compositions, uses real receiving adapters, imports the WAV into Pulse and round-trips MIDI through Library. It writes evidence and WAVs to the output folder in the script. It does not prove musical quality by automated measurements.

For Windows checks, copy Source/Native-probes/sound-refresher.js to a new isolated folder as probe.js and launch Jago-Sound.exe with `--test` followed by that folder. Supplying window.soundOriginalFixture from Source/Tests/0.9/original-bank-fixture.json additionally enables the original-bank comparison. Keep test profiles separate from working profiles. No installer maintenance is exercised by this app probe.
