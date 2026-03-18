#!/usr/bin/env pwsh
# SEO Image Rename Script for sua-xe-luu-dong project
# Author: SEO Team
# Date: 2026-03-18
# Purpose: Rename images to SEO-friendly Vietnamese names (no diacritics)

# Set error action
$ErrorActionPreference = "Stop"

# Define image mapping
$imageMapping = @{
    # Blog Images
    "20260317_2048_Image Generation_simple_compose_01kky0tw50fyjva84vh9g3z0zt.png" = "bai-viet-sua-xe-luu-dong-la-gi.png"
    "20260317_2048_Image Generation_simple_compose_01kky0w104et2bz0ymaptdtq1q.png" = "bai-viet-dau-hieu-cuu-ho-xe-may.png"
    "20260317_2054_Image Generation_simple_compose_01kky168nxe1m941n9v6h6a22n.png" = "bai-viet-cach-xu-ly-thung-lop.png"
    "20260317_2054_Image Generation_simple_compose_01kky174s7ee985q2mvvwnz2gp.png" = "bai-viet-bao-duong-xe-tai-nha.png"
    "20260317_2057_Image Generation_simple_compose_01kky1br3cf5rvh10j4s05v7fj.png" = "bai-viet-kich-binh-ac-quy.png"
    "20260317_2059_Xe Máy Ngập Nước_simple_compose_01kky1fmdye1n9k2npadtarnkp.png" = "bai-viet-xe-ngap-nuoc.png"
    "20260317_2100_Image Generation_simple_compose_01kky1gjsvf1xbm1mn2mjew403.png" = "bai-viet-mat-chia-khoa-xe.png"
    "20260317_2103_Image Generation_simple_compose_01kky1pxbxexf8299eewvzq240.png" = "bai-viet-day-curoa-xe-tay-ga.png"
    "20260317_2104_Image Generation_simple_compose_01kky1qt8te68rxxjh35kpf7rk.png" = "bai-viet-hut-ga-xe-may.png"
    "20260317_2105_Sửa Xe Lưu Động Đêm_simple_compose_01kky1v650fdgb65x2jwv4qj4f.png" = "bai-viet-sua-xe-ban-dem.png"
    "20260317_2106_Image Generation_simple_compose_01kky1w7sve14836v4ky3sb17k.png" = "bai-viet-thay-nhot-xe-may.png"
    "ChatGPT Image 21_10_04 17 thg 3, 2026.png" = "bai-viet-phan-biet-lop-xe.png"
    "ChatGPT Image 21_11_30 17 thg 3, 2026.png" = "bai-viet-ma-phanh-bi-mon.png"
    "ChatGPT Image 21_12_05 17 thg 3, 2026.png" = "bai-viet-ve-sinh-kim-phun.png"
    "ChatGPT Image 21_15_38 17 thg 3, 2026.png" = "bai-viet-thay-ac-quy-xe.png"
    "ChatGPT Image 21_17_04 17 thg 3, 2026.png" = "bai-viet-tiet-kiem-xang-xe.png"
    "ChatGPT Image 21_17_27 17 thg 3, 2026.png" = "bai-viet-bao-quan-xe-khong-dung.png"
    "ChatGPT Image 21_18_50 17 thg 3, 2026.png" = "bai-viet-sai-lam-rua-xe.png"
    "ChatGPT Image 21_19_37 17 thg 3, 2026.png" = "bai-viet-chon-soc-dan-ao.png"
    "ChatGPT Image 21_20_02 17 thg 3, 2026.png" = "bai-viet-kiem-tra-xe-cu.png"
    
    # Hero/About Images
    "ChatGPT Image 20_27_42 10 thg 3, 2026.png" = "hero-ve-chung-toi-sua-xe.png"
    "20260306_1533_Image_Generation_simple_compose_01kk14ee7sev3t76ywmcyw85e4-removebg-preview.png" = "logo-sua-xe-luu-dong.png"
}

# Image directory path
$imagePath = "C:\xampp\htdocs\dvqt\GlobalCare\sua-xe-luu-dong\public\asset\image"

Write-Host "🖼️  SEO Image Rename Script" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host "📍 Image Directory: $imagePath" -ForegroundColor Green
Write-Host "📊 Total images to rename: $($imageMapping.Count)" -ForegroundColor Yellow
Write-Host ""

# Check if directory exists
if (-not (Test-Path $imagePath)) {
    Write-Host "❌ ERROR: Directory not found: $imagePath" -ForegroundColor Red
    exit 1
}

# Counter
$renamed = 0
$skipped = 0
$errors = 0

# Rename files
foreach ($oldName in $imageMapping.Keys) {
    $newName = $imageMapping[$oldName]
    $oldPath = Join-Path $imagePath $oldName
    $newPath = Join-Path $imagePath $newName
    
    # Check if old file exists
    if (Test-Path $oldPath) {
        try {
            Rename-Item -Path $oldPath -NewName $newName -Force
            Write-Host "✅ Renamed: $oldName → $newName" -ForegroundColor Green
            $renamed++
        } catch {
            Write-Host "❌ Error renaming $oldName : $_" -ForegroundColor Red
            $errors++
        }
    } else {
        Write-Host "⏭️  Skipped: $oldName (file not found)" -ForegroundColor Yellow
        $skipped++
    }
}

Write-Host ""
Write-Host "=" * 60
Write-Host "📈 SUMMARY:" -ForegroundColor Cyan
Write-Host "  ✅ Renamed: $renamed" -ForegroundColor Green
Write-Host "  ⏭️  Skipped: $skipped" -ForegroundColor Yellow
Write-Host "  ❌ Errors: $errors" -ForegroundColor Red
Write-Host "=" * 60
Write-Host ""

if ($errors -eq 0) {
    Write-Host "🎉 All images renamed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "1. Update image paths in: public/news.json"
    Write-Host "2. Update image links in HTML files"
    Write-Host "3. Run: git add . ; git commit -m 'Refactor: Rename images to SEO-friendly names'"
    Write-Host "4. Run: git push"
    Write-Host ""
} else {
    Write-Host "⚠️  Some errors occurred. Please check above for details." -ForegroundColor Yellow
}
