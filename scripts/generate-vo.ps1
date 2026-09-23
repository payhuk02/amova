# Generate French voice-over for Amova 30s promo (Microsoft Hortense)
Add-Type -AssemblyName System.Speech

$outDir = Join-Path $PSScriptRoot "..\promo\out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$wavPath = Join-Path $outDir "amova-vo.wav"

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Hortense Desktop")
$synth.Rate = 1
$synth.Volume = 100
$synth.SetOutputToWaveFile($wavPath)

$ssml = @"
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-FR">
  Amova.
  <break time="300ms"/>
  Des rencontres vérifiées, entre adultes sérieux, en Afrique.
  <break time="550ms"/>
  Identité contrôlée à la main, pour rencontrer en confiance.
  <break time="600ms"/>
  Matching homme femme. Photos protégées. Mobile Money.
  <break time="650ms"/>
  Rejoignez Amova. Votre prochaine rencontre sérieuse commence sur amova.space.
</speak>
"@

$synth.SpeakSsml($ssml)
$synth.Dispose()

Write-Host "Wrote $wavPath"
