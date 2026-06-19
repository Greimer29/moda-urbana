param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl,
  [string]$DesktopOrigin = 'http://127.0.0.1:51740'
)

$base = $ApiUrl.TrimEnd('/')
$failed = $false

function Fail([string]$message) {
  Write-Host "FAIL: $message" -ForegroundColor Red
  $script:failed = $true
}

function Pass([string]$message) {
  Write-Host "OK: $message" -ForegroundColor Green
}

try {
  $health = Invoke-WebRequest -Uri "$base/health" -Method GET -UseBasicParsing
  if ($health.StatusCode -eq 200) {
    Pass "/health responde 200"
  } else {
    Fail "/health devolvió $($health.StatusCode)"
  }
} catch {
  Fail "/health no responde: $($_.Exception.Message)"
}

try {
  $preflight = Invoke-WebRequest -Uri "$base/api/v1/auth/me" -Method OPTIONS -UseBasicParsing `
    -Headers @{
      Origin = $DesktopOrigin
      'Access-Control-Request-Method' = 'GET'
    }

  $allowOrigin = $preflight.Headers['Access-Control-Allow-Origin']
  if ($allowOrigin -eq $DesktopOrigin) {
    Pass "CORS preflight desktop ($DesktopOrigin)"
  } else {
    Fail "CORS preflight: Access-Control-Allow-Origin=$allowOrigin (esperado $DesktopOrigin)"
  }
} catch {
  Fail "CORS preflight falló: $($_.Exception.Message)"
}

if ($failed) {
  exit 1
}

Write-Host 'Smoke Railway completado.' -ForegroundColor Green
