$repoPath = "G:\BlogSite"
Set-Location $repoPath

# 检查是否有更改
$status = git status --short 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git 命令执行失败，请确认 Git 已安装。" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "没有检测到更改，无需推送。" -ForegroundColor Green
    Read-Host "按 Enter 键退出"
    exit 0
}

Write-Host ""
Write-Host "检测到更改，正在自动推送..." -ForegroundColor Cyan
Write-Host ""

git add .
if ($LASTEXITCODE -ne 0) { Write-Host "git add 失败" -ForegroundColor Red; Read-Host "按 Enter 键退出"; exit 1 }

$dateStr = Get-Date -Format "yyyy-MM-dd"
git commit -m "$dateStr 博客更新"
if ($LASTEXITCODE -ne 0) { Write-Host "git commit 失败" -ForegroundColor Red; Read-Host "按 Enter 键退出"; exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "git push 失败" -ForegroundColor Red; Read-Host "按 Enter 键退出"; exit 1 }

Write-Host ""
Write-Host "推送完成！" -ForegroundColor Green
Read-Host "按 Enter 键退出"
