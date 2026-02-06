# QC-Booklog Startup Script (PowerShell Version)
$ErrorActionPreference = "Stop"

$LogDir = "logs"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = "$LogDir\startup_$Timestamp.log"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    Write-Host $Message
    Add-Content -Path $LogFile -Value $Message
}

function Test-Prerequisites {
    Write-Log "========================================"
    Write-Log "   QC-Booklog Startup Script"
    Write-Log "========================================"
    Write-Log "Start Time: $(Get-Date)"
    Write-Log ""

    Write-Log "[Step 1/5] Checking environment..."

    try {
        $nodeVersion = node -v
        Write-Log "Node.js version: $nodeVersion"
    } catch {
        Write-Log "[ERROR] Node.js not found"
        Write-Log "Please install Node.js from: https://nodejs.org/"
        return $false
    }

    try {
        $npmVersion = npm -v
        Write-Log "npm version: $npmVersion"
    } catch {
        Write-Log "[ERROR] npm not found"
        return $false
    }

    if (-not (Test-Path "package.json")) {
        Write-Log "[ERROR] package.json not found"
        Write-Log "Please run this script from project root directory"
        return $false
    }

    if (-not (Test-Path "server\package.json")) {
        Write-Log "[ERROR] server\package.json not found"
        Write-Log "Please ensure project structure is complete"
        return $false
    }

    Write-Log "Environment check completed"
    Write-Log ""
    return $true
}

function Install-Dependencies {
    Write-Log "[Step 2/5] Checking and installing dependencies..."

    if (-not (Test-Path "node_modules")) {
        Write-Log "Installing frontend dependencies..."
        Write-Log "Running: npm install"
        try {
            npm install >> $LogFile 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Frontend dependency installation failed"
            }
            Write-Log "Frontend dependencies installed"
        } catch {
            Write-Log "[ERROR] Frontend dependency installation failed"
            Write-Log "Please check log file: $LogFile"
            return $false
        }
    } else {
        Write-Log "Frontend dependencies already exist, skipping installation"
    }

    if (-not (Test-Path "server\node_modules")) {
        Write-Log "Installing backend dependencies..."
        Write-Log "Running: cd server && npm install"
        Push-Location server
        try {
            npm install >> $LogFile 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Backend dependency installation failed"
            }
            Write-Log "Backend dependencies installed"
        } catch {
            Write-Log "[ERROR] Backend dependency installation failed"
            Write-Log "Please check log file: $LogFile"
            Pop-Location
            return $false
        }
        Pop-Location
    } else {
        Write-Log "Backend dependencies already exist, skipping installation"
    }

    Write-Log "Dependency check completed"
    Write-Log ""
    return $true
}

function Test-Ports {
    Write-Log "[Step 3/5] Checking port usage..."

    $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port3000) {
        Write-Log "[WARNING] Port 3000 is already in use"
        Write-Log "If backend service is running, please close it first"
        $continue = Read-Host "Continue to start? (Y/N)"
        if ($continue -ne "Y" -and $continue -ne "y") {
            return $false
        }
    }

    $port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if ($port5173) {
        Write-Log "[WARNING] Port 5173 is already in use"
        Write-Log "If frontend service is running, please close it first"
        $continue = Read-Host "Continue to start? (Y/N)"
        if ($continue -ne "Y" -and $continue -ne "y") {
            return $false
        }
    }

    Write-Log "Port check completed"
    Write-Log ""
    return $true
}

function Start-Services {
    Write-Log "[Step 4/5] Starting services..."

    Write-Log "Starting backend service..."
    Write-Log "Running: cd server && npm run dev"
    $backendScript = @'
cd server
npm run dev
'@
    $backendScript | Out-File -FilePath "start_backend_temp.bat" -Encoding ASCII
    Start-Process cmd -ArgumentList "/k start_backend_temp.bat" -WindowStyle Normal -NoNewWindow

    Write-Log "Waiting for backend service to start..."
    Start-Sleep -Seconds 3

    Write-Log "Starting frontend service..."
    Write-Log "Running: npm run dev"
    $frontendScript = @'
npm run dev
'@
    $frontendScript | Out-File -FilePath "start_frontend_temp.bat" -Encoding ASCII
    Start-Process cmd -ArgumentList "/k start_frontend_temp.bat" -WindowStyle Normal -NoNewWindow

    Write-Log "Services started"
    Write-Log ""
    return $true
}

function Show-Success {
    Write-Log "[Step 5/5] Startup successful"
    Write-Log "========================================"
    Write-Log "   Services Started Successfully!"
    Write-Log "========================================"
    Write-Log "Frontend URL: http://localhost:5173"
    Write-Log "Backend URL:  http://localhost:3000"
    Write-Log "========================================"
    Write-Log "Log file: $LogFile"
    Write-Log "========================================"
    Write-Log ""
    Write-Log "Tips:"
    Write-Log "  - Services run in separate windows"
    Write-Log "  - Closing this window won't stop services"
    Write-Log "  - To stop services, close their windows"
    Write-Log ""
    Write-Log "Press any key to close this window..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Show-Failure {
    Write-Log ""
    Write-Log "========================================"
    Write-Log "   Startup Failed!"
    Write-Log "========================================"
    Write-Log "Log file: $LogFile"
    Write-Log "========================================"
    Write-Log ""
    Write-Log "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

if (-not (Test-Prerequisites)) {
    Show-Failure
}

if (-not (Install-Dependencies)) {
    Show-Failure
}

if (-not (Test-Ports)) {
    Show-Failure
}

if (-not (Start-Services)) {
    Show-Failure
}

Show-Success
