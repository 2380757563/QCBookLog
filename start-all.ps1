# QC Booklog - 一键启动脚本 (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  QC Booklog - 一键启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已经在运行
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" }
if ($nodeProcesses) {
    Write-Host "[警告] 检测到 Node.js 进程正在运行" -ForegroundColor Yellow
    Write-Host "[提示] 请先运行 stop-all.ps1 停止服务" -ForegroundColor Yellow
    Read-Host "按任意键退出..."
    $null = $Host.UI.RawUI.ReadKey()
    exit 1
}

Write-Host "[1/3] 启动前端服务..." -ForegroundColor Green
Write-Host ""

# 切换到项目目录
Set-Location "d:\下载\docs-xmnote-master\QC-booklog"

# 检查 node_modules
if (Test-Path "node_modules") {
    Write-Host "[信息] node_modules 已存在，跳过安装" -ForegroundColor Gray
} else {
    Write-Host "[信息] 正在安装前端依赖..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 前端依赖安装失败" -ForegroundColor Red
        Read-Host "按任意键退出..."
        $null = $Host.UI.RawUI.ReadKey()
        exit 1
    }
}

Write-Host "[2/3] 启动前端开发服务器..." -ForegroundColor Green
Write-Host ""

# 启动前端（在后台运行）
$frontendJob = Start-Job -ScriptBlock {
    Write-Host "[信息] 前端服务已启动 (PID: $($frontendJob.Id))" -ForegroundColor Green
    Write-Host "[信息] 访问地址: http://localhost:5173" -ForegroundColor Cyan
    npm run dev
}

Write-Host "[3/3] 启动后端服务..." -ForegroundColor Green
Write-Host ""

# 切换到 server 目录
Set-Location "server"

# 检查 node_modules
if (Test-Path "node_modules") {
    Write-Host "[信息] server/node_modules 已存在，跳过安装" -ForegroundColor Gray
} else {
    Write-Host "[信息] 正在安装后端依赖..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 后端依赖安装失败" -ForegroundColor Red
        Read-Host "按任意键退出..."
        $null = $Host.UI.RawUI.ReadKey()
        exit 1
    }
}

Write-Host "[4/4] 启动后端服务器..." -ForegroundColor Green
Write-Host ""

# 启动后端（在后台运行）
$backendJob = Start-Job -ScriptBlock {
    Write-Host "[信息] 后端服务已启动 (PID: $($backendJob.Id))" -ForegroundColor Green
    Write-Host "[信息] 访问地址: http://localhost:7401" -ForegroundColor Cyan
    npm run server:dev
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  启动完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[信息] 前端地址: http://localhost:5173" -ForegroundColor Cyan
Write-Host "[信息] 后端地址: http://localhost:7401" -ForegroundColor Cyan
Write-Host ""
Write-Host "[提示] 按 Ctrl+C 可停止服务" -ForegroundColor Yellow
Write-Host "[提示] 运行 stop-all.ps1 可停止所有服务" -ForegroundColor Yellow
Write-Host ""

# 保持脚本运行，直到用户按 Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} catch [System.Management.Automation.StopWatchException] {
    Write-Host ""
    Write-Host "[信息] 正在停止所有服务..." -ForegroundColor Yellow
    
    # 停止前端
    if ($frontendJob) {
        Stop-Job $frontendJob
        Write-Host "[信息] 前端服务已停止" -ForegroundColor Gray
    }
    
    # 停止后端
    if ($backendJob) {
        Stop-Job $backendJob
        Write-Host "[信息] 后端服务已停止" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "[信息] 所有服务已停止" -ForegroundColor Green
    Write-Host "[提示] 运行 start-all.ps1 可重新启动服务" -ForegroundColor Yellow
    exit 0
}