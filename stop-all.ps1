# QC Booklog - 一键停止脚本 (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  QC Booklog - 一键停止" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] 停止前端服务..." -ForegroundColor Yellow
Write-Host ""

# 查找并停止前端进程
$frontendProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*npm run dev*" }
if ($frontendProcesses) {
    foreach ($process in $frontendProcesses) {
        Write-Host "[信息] 停止前端进程: $($process.Id) - $($process.ProcessName)" -ForegroundColor Gray
        Stop-Process $process -Force
    }
    Write-Host "[信息] 前端服务已停止" -ForegroundColor Green
} else {
    Write-Host "[信息] 未找到前端进程" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[2/3] 停止后端服务..." -ForegroundColor Yellow
Write-Host ""

# 查找并停止后端进程
$backendProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*npm run server:dev*" }
if ($backendProcesses) {
    foreach ($process in $backendProcesses) {
        Write-Host "[信息] 停止后端进程: $($process.Id) - $($process.ProcessName)" -ForegroundColor Gray
        Stop-Process $process -Force
    }
    Write-Host "[信息] 后端服务已停止" -ForegroundColor Green
} else {
    Write-Host "[信息] 未找到后端进程" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[3/3] 清理端口占用（可选）..." -ForegroundColor Yellow
Write-Host ""

# 检查并清理端口 5173
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "[信息] 端口 5173 仍被占用，尝试清理..." -ForegroundColor Yellow
    try {
        $port5173 | Stop-Process -Force
        Write-Host "[信息] 端口 5173 已清理" -ForegroundColor Green
    } catch {
        Write-Host "[警告] 无法清理端口 5173" -ForegroundColor Red
    }
}

# 检查并清理端口 7401
$port7401 = Get-NetTCPConnection -LocalPort 7401 -ErrorAction SilentlyContinue
if ($port7401) {
    Write-Host "[信息] 端口 7401 仍被占用，尝试清理..." -ForegroundColor Yellow
    try {
        $port7401 | Stop-Process -Force
        Write-Host "[信息] 端口 7401 已清理" -ForegroundColor Green
    } catch {
        Write-Host "[警告] 无法清理端口 7401" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  停止完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[信息] 所有服务已停止" -ForegroundColor Green
Write-Host "[提示] 运行 start-all.ps1 可重新启动服务" -ForegroundColor Yellow
Write-Host ""

# 等待 3 秒后退出
Start-Sleep -Seconds 3