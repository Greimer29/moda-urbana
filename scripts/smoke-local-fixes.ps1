param(
  [string]$ApiUrl = 'http://localhost:3334',
  [string]$Email = 'admin@modaurbana.local',
  [string]$Password = 'password123'
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

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
  $loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
  $login = Invoke-WebRequest -Uri "$base/api/v1/auth/login" -Method POST -UseBasicParsing `
    -ContentType 'application/json' -Body $loginBody -WebSession $session

  if ($login.StatusCode -eq 200) {
    Pass "Login API ($Email)"
  } else {
    Fail "Login devolvió $($login.StatusCode)"
  }
} catch {
  Fail "Login falló: $($_.Exception.Message)"
}

try {
  $summary = Invoke-WebRequest -Uri "$base/api/v1/dashboard/summary" -Method GET -UseBasicParsing `
    -WebSession $session
  $json = $summary.Content | ConvertFrom-Json
  $month = $json.data.purchasesMonth

  if ($null -ne $month.totalUsd) {
    Pass "Dashboard purchasesMonth.totalUsd presente"
  } else {
    Fail "Dashboard purchasesMonth sin totalUsd (¿API desactualizada?)"
  }
} catch {
  Fail "Dashboard summary falló: $($_.Exception.Message)"
}

try {
  $rejectBody = @{
    date = (Get-Date -Format 'yyyy-MM-dd')
    description = 'Smoke VES reject'
    amount_usd = 10
    currency_code = 'VES'
  } | ConvertTo-Json

  Invoke-WebRequest -Uri "$base/api/v1/expenses" -Method POST -UseBasicParsing `
    -ContentType 'application/json' -Body $rejectBody -WebSession $session | Out-Null
  Fail "POST expense con VES debería devolver 422"
} catch {
  $response = $_.Exception.Response
  if ($response -and [int]$response.StatusCode -eq 422) {
    Pass "Registro monetario rechaza VES (422)"
  } else {
    Fail "POST expense VES no devolvió 422: $($_.Exception.Message)"
  }
}

if ($failed) {
  exit 1
}

Write-Host 'Smoke local (post-fix) completado.' -ForegroundColor Green
