# PowerShell script to seed authentic sample registrations into SIH26043 backend via Gateway
param(
    [string]$GatewayUrl = "http://localhost:8090"
)

Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "SIH26043 - Seeding Live Test Registrations to Gateway ($GatewayUrl)" -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan

# 1. Test Gateway connectivity
try {
    $types = Invoke-RestMethod -Uri "$GatewayUrl/registration/source-types" -Method Get -TimeoutSec 5
    Write-Host "[OK] Gateway is reachable. Available source types: $($types.sourceTypes.Count)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Cannot reach Gateway at $GatewayUrl. Please ensure backend containers are running." -ForegroundColor Red
    Write-Host "Run 'docker compose up -d' in the backend folder." -ForegroundColor Yellow
    exit 1
}

# 2. Login as Submitter
Write-Host "Authenticating submitter user..." -ForegroundColor Yellow
try {
    $loginResp = Invoke-RestMethod -Uri "$GatewayUrl/auth/login" -Method Post -Body '{"phone":"9900000001"}' -ContentType "application/json"
    $challengeId = $loginResp.challengeId
    $verifyResp = Invoke-RestMethod -Uri "$GatewayUrl/auth/verify-otp" -Method Post -Body (@{challengeId=$challengeId; code="123456"} | ConvertTo-Json) -ContentType "application/json"
    $token = $verifyResp.accessToken
    Write-Host "[OK] Submitter authenticated. User: $($verifyResp.user.userId)" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Login failed, creating registrations as guest..." -ForegroundColor DarkYellow
    $token = $null
}

$headers = @{}
if ($token) {
    $headers["Authorization"] = "Bearer $token"
}

# 3. Sample Case 1: Khadur Sahib Gram Panchayat (PRI)
Write-Host "`nRegistering Case 1: Khadur Sahib Gram Panchayat (PRI)..." -ForegroundColor Yellow
$priPayload = @{
    sourceBucket = "GOVT"
    sourceType = "PRI"
    source = @{
        organizationName = "Khadur Sahib Gram Panchayat"
        pan = "AAATK9012F"
        dossierId = "#PRI-KYC-2024-88912"
        subType = "LGD: 239401"
        state = "Punjab"
        district = "Tarn Taran"
        sarpanchName = "S. Gurbachan Singh"
        contactPersonName = "Harpreet Singh Dhillon (VDO)"
        contactEmail = "vdo.khadursahib@punjab.gov.in"
        contactPhone = "9810081923"
        bankAccount = "••••••••4409 (SBI Khadur Sahib, IFSC: SBIN0050122)"
        documents = @(
            @{ name = "Gram Sabha Resolution (Form 4)"; file = "GS-RES-KHADUR-2024.pdf"; status = "Verified" },
            @{ name = "Sarpanch Gazette Notification"; file = "PB-ELEC-GAZ-9912.pdf"; status = "Deficiency: Cropped Margin" },
            @{ name = "PFMS Bank Passbook / Mandate"; file = "PFMS-PASSBOOK-4409.pdf"; status = "Verified" }
        )
    }
}

try {
    $reg1 = Invoke-RestMethod -Uri "$GatewayUrl/registration" -Method Post -Body ($priPayload | ConvertTo-Json -Depth 5) -ContentType "application/json" -Headers $headers
    $reg1Id = $reg1.registrationId
    Invoke-RestMethod -Uri "$GatewayUrl/registration/$reg1Id/submit" -Method Post -Headers $headers | Out-Null
    Write-Host "[OK] Created and submitted: Khadur Sahib Gram Panchayat ($reg1Id)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to seed Case 1: $_" -ForegroundColor Red
}

# 4. Sample Case 2: Wani Municipal Council (ULB)
Write-Host "`nRegistering Case 2: Wani Municipal Council (ULB)..." -ForegroundColor Yellow
$ulbPayload = @{
    sourceBucket = "GOVT"
    sourceType = "ULB"
    source = @{
        organizationName = "Wani Municipal Council (ULB)"
        pan = "AAALW4421M"
        dossierId = "#ULB-KYC-2024-55102"
        subType = "LGD: 250892"
        state = "Maharashtra"
        district = "Yavatmal"
        sarpanchName = "Dr. Sneha K. Patil (Chief Officer)"
        contactPersonName = "Rajesh Deshmukh (Nodal Auditor)"
        contactEmail = "co.wanimc@maharashtra.gov.in"
        contactPhone = "9820011223"
        bankAccount = "••••••••8831 (Bank of Maharashtra, IFSC: MAHB0000182)"
        documents = @(
            @{ name = "Standing Committee Resolution"; file = "WANI-MC-RES-2024.pdf"; status = "Verified" },
            @{ name = "Urban Development Notification"; file = "MAH-UDD-GAZ-2024.pdf"; status = "Verified" },
            @{ name = "PFMS Treasury Mandate"; file = "PFMS-WANI-8831.pdf"; status = "Verified" }
        )
    }
}

try {
    $reg2 = Invoke-RestMethod -Uri "$GatewayUrl/registration" -Method Post -Body ($ulbPayload | ConvertTo-Json -Depth 5) -ContentType "application/json" -Headers $headers
    $reg2Id = $reg2.registrationId
    Invoke-RestMethod -Uri "$GatewayUrl/registration/$reg2Id/submit" -Method Post -Headers $headers | Out-Null
    Write-Host "[OK] Created and submitted: Wani Municipal Council ($reg2Id)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to seed Case 2: $_" -ForegroundColor Red
}

# 5. Sample Case 3: Vapi Green Enviro Industrial Ltd (Company)
Write-Host "`nRegistering Case 3: Vapi Green Enviro Industrial Ltd (Company)..." -ForegroundColor Yellow
$corpPayload = @{
    sourceBucket = "INDUSTRY"
    sourceType = "COMPANY"
    source = @{
        organizationName = "Vapi Green Enviro Industrial Ltd."
        pan = "AAACG4419G"
        dossierId = "#CORP-KYC-2024-11029"
        subType = "CIN: U40106GJ2015PLC082007"
        state = "Gujarat"
        district = "Valsad"
        sarpanchName = "Rajesh K. Mehta (Executive Director)"
        contactPersonName = "Ketan M. Desai (Company Secretary)"
        contactEmail = "compliance@vapienviro.org"
        contactPhone = "9898033445"
        bankAccount = "••••••••9102 (HDFC Bank Vapi, IFSC: HDFC0000006)"
        documents = @(
            @{ name = "MCA Certificate of Incorporation"; file = "MCA-COI-U40106GJ2015.pdf"; status = "Verified" },
            @{ name = "Board Resolution for Nodal Appointee"; file = "BR-NODAL-AUTH-2024.pdf"; status = "Clarification Resubmitted" },
            @{ name = "GPCB Common Effluent Compliance Certificate"; file = "GPCB-CETP-CERT-2024.pdf"; status = "Verified" }
        )
    }
}

try {
    $reg3 = Invoke-RestMethod -Uri "$GatewayUrl/registration" -Method Post -Body ($corpPayload | ConvertTo-Json -Depth 5) -ContentType "application/json" -Headers $headers
    $reg3Id = $reg3.registrationId
    Invoke-RestMethod -Uri "$GatewayUrl/registration/$reg3Id/submit" -Method Post -Headers $headers | Out-Null
    Write-Host "[OK] Created and submitted: Vapi Green Enviro Industrial Ltd ($reg3Id)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to seed Case 3: $_" -ForegroundColor Red
}

Write-Host "`n=========================================================================" -ForegroundColor Cyan
Write-Host "Seeding complete! You can now view these live cases in the Reviewer Portal." -ForegroundColor Cyan
Write-Host "Reviewer URL: http://localhost:8085/#/dashboard" -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan
