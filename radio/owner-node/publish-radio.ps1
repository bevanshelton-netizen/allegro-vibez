param(
  [Parameter(Mandatory=$true)]
  [string]$PublicHost,

  [Parameter(Mandatory=$true)]
  [string]$TlsEmail,

  [string]$DataPath = "$env:LOCALAPPDATA\IzakhonoRadio\data"
)

$ErrorActionPreference = "Stop"

if ($PublicHost -match "://" -or $PublicHost -notmatch "^[A-Za-z0-9.-]+$") {
  throw "PublicHost must be a hostname only, for example radio.example.com"
}

if ($TlsEmail -notmatch "^[^@\s]+@[^@\s]+\.[^@\s]+$") {
  throw "TlsEmail must be a valid email address"
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $DataPath "allegro-radio.env"
$ProofFile = Join-Path $DataPath "public-launch-proof.json"

if (!(Test-Path $EnvFile)) {
  throw "Owner-node environment not found at $EnvFile. Run IZAKHONO-ALLEGRO-RADIO.exe first."
}

function Set-EnvValue([string]$Path, [string]$Name, [string]$Value) {
  $lines = @(Get-Content $Path)
  $found = $false
  $updated = foreach ($line in $lines) {
    if ($line -match "^$([regex]::Escape($Name))=") {
      $found = $true
      "$Name=$Value"
    } else {
      $line
    }
  }
  if (!$found) { $updated += "$Name=$Value" }
  Set-Content -Path $Path -Value $updated -Encoding UTF8
}

Set-EnvValue $EnvFile "ALLEGRO_RADIO_PUBLIC_HOST" $PublicHost
Set-EnvValue $EnvFile "ALLEGRO_RADIO_TLS_EMAIL" $TlsEmail
Set-EnvValue $EnvFile "ICECAST_HOSTNAME" $PublicHost
Set-EnvValue $EnvFile "ALLEGRO_RADIO_MONITOR_SECONDS" "30"

$env:ALLEGRO_RADIO_WINDOWS_DATA = (Resolve-Path $DataPath).Path.Replace("\","/")
$BaseCompose = Join-Path $Root "docker-compose.windows.yml"
$PublicCompose = Join-Path $Root "docker-compose.public.yml"

docker compose -p izakhono-allegro-radio -f $BaseCompose -f $PublicCompose config -q
docker compose -p izakhono-allegro-radio -f $BaseCompose -f $PublicCompose up -d --build --remove-orphans

$edgeUrl = "https://$PublicHost/healthz"
$streamUrl = "https://$PublicHost/allegro.mp3"

$edgeOk = $false
$streamOk = $false
$deadline = (Get-Date).AddMinutes(4)

while ((Get-Date) -lt $deadline -and (!$edgeOk -or !$streamOk)) {
  try {
    $edge = Invoke-WebRequest -Uri $edgeUrl -UseBasicParsing -TimeoutSec 10
    $edgeOk = $edge.StatusCode -eq 200
  } catch {}
  try {
    $stream = Invoke-WebRequest -Uri $streamUrl -UseBasicParsing -Method Head -TimeoutSec 10
    $streamOk = $stream.StatusCode -ge 200 -and $stream.StatusCode -lt 400
  } catch {}
  if (!$edgeOk -or !$streamOk) { Start-Sleep -Seconds 5 }
}

$proof = [ordered]@{
  product = "IZAKHONO ALLEGRO RADIO"
  generated_at = (Get-Date).ToUniversalTime().ToString("o")
  public_host = $PublicHost
  public_stream_url = $streamUrl
  tls_edge_reachable = $edgeOk
  public_stream_reachable = $streamOk
  continuous_24h_test_passed = $false
  legal_rights_gate_confirmed = $false
  public_ready = $false
  next_gate = "Keep the node online, load rights-cleared programming, confirm legal/music-rights position, and pass the continuous 24-hour stream test."
}
$proof | ConvertTo-Json -Depth 5 | Set-Content -Path $ProofFile -Encoding UTF8
$proof | ConvertTo-Json -Depth 5

if (!$edgeOk -or !$streamOk) {
  Write-Warning "The stack is running but the public address is not reachable yet. Check DNS and inbound ports 80/443."
  exit 4
}

Write-Host "ALLEGRO Radio edge is reachable at $streamUrl"
Write-Host "This proves public technical reachability only; it does not yet prove legal/commercial launch readiness."
