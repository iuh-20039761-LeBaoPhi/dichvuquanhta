#!/usr/bin/env python3
"""
SEO Image Rename Script for sua-xe-luu-dong project
Author: SEO Team
Date: 2026-03-18
Purpose: Rename images to SEO-friendly Vietnamese names (no diacritics)
"""

import os
import sys
from pathlib import Path

# Define image mapping
image_mapping = {
    # Blog Images
    "20260317_2048_Image Generation_simple_compose_01kky0tw50fyjva84vh9g3z0zt.png": "bai-viet-sua-xe-luu-dong-la-gi.png",
    "20260317_2048_Image Generation_simple_compose_01kky0w104et2bz0ymaptdtq1q.png": "bai-viet-dau-hieu-cuu-ho-xe-may.png",
    "20260317_2054_Image Generation_simple_compose_01kky168nxe1m941n9v6h6a22n.png": "bai-viet-cach-xu-ly-thung-lop.png",
    "20260317_2054_Image Generation_simple_compose_01kky174s7ee985q2mvvwnz2gp.png": "bai-viet-bao-duong-xe-tai-nha.png",
    "20260317_2057_Image Generation_simple_compose_01kky1br3cf5rvh10j4s05v7fj.png": "bai-viet-kich-binh-ac-quy.png",
    "20260317_2059_Xe Máy Ngập Nước_simple_compose_01kky1fmdye1n9k2npadtarnkp.png": "bai-viet-xe-ngap-nuoc.png",
    "20260317_2100_Image Generation_simple_compose_01kky1gjsvf1xbm1mn2mjew403.png": "bai-viet-mat-chia-khoa-xe.png",
    "20260317_2103_Image Generation_simple_compose_01kky1pxbxexf8299eewvzq240.png": "bai-viet-day-curoa-xe-tay-ga.png",
    "20260317_2104_Image Generation_simple_compose_01kky1qt8te68rxxjh35kpf7rk.png": "bai-viet-hut-ga-xe-may.png",
    "20260317_2105_Sửa Xe Lưu Động Đêm_simple_compose_01kky1v650fdgb65x2jwv4qj4f.png": "bai-viet-sua-xe-ban-dem.png",
    "20260317_2106_Image Generation_simple_compose_01kky1w7sve14836v4ky3sb17k.png": "bai-viet-thay-nhot-xe-may.png",
    "ChatGPT Image 21_10_04 17 thg 3, 2026.png": "bai-viet-phan-biet-lop-xe.png",
    "ChatGPT Image 21_11_30 17 thg 3, 2026.png": "bai-viet-ma-phanh-bi-mon.png",
    "ChatGPT Image 21_12_05 17 thg 3, 2026.png": "bai-viet-ve-sinh-kim-phun.png",
    "ChatGPT Image 21_15_38 17 thg 3, 2026.png": "bai-viet-thay-ac-quy-xe.png",
    "ChatGPT Image 21_17_04 17 thg 3, 2026.png": "bai-viet-tiet-kiem-xang-xe.png",
    "ChatGPT Image 21_17_27 17 thg 3, 2026.png": "bai-viet-bao-quan-xe-khong-dung.png",
    "ChatGPT Image 21_18_50 17 thg 3, 2026.png": "bai-viet-sai-lam-rua-xe.png",
    "ChatGPT Image 21_19_37 17 thg 3, 2026.png": "bai-viet-chon-soc-dan-ao.png",
    "ChatGPT Image 21_20_02 17 thg 3, 2026.png": "bai-viet-kiem-tra-xe-cu.png",
    # Hero/About Images
    "ChatGPT Image 20_27_42 10 thg 3, 2026.png": "hero-ve-chung-toi-sua-xe.png",
    "20260306_1533_Image_Generation_simple_compose_01kk14ee7sev3t76ywmcyw85e4-removebg-preview.png": "logo-sua-xe-luu-dong.png",
}

# Image directory path
image_dir = r"C:\xampp\htdocs\dvqt\GlobalCare\sua-xe-luu-dong\public\asset\image"

print("🖼️  SEO Image Rename Script")
print("=" * 70)
print(f"📍 Image Directory: {image_dir}")
print(f"📊 Total images to rename: {len(image_mapping)}")
print("")

# Check if directory exists
if not os.path.isdir(image_dir):
    print(f"❌ ERROR: Directory not found: {image_dir}")
    sys.exit(1)

# Counter
renamed = 0
skipped = 0
errors = 0

# Rename files
for old_name, new_name in image_mapping.items():
    old_path = os.path.join(image_dir, old_name)
    new_path = os.path.join(image_dir, new_name)
    
    # Check if old file exists
    if os.path.exists(old_path):
        try:
            os.rename(old_path, new_path)
            print(f"✅ Renamed: {old_name} -> {new_name}")
            renamed += 1
        except Exception as e:
            print(f"❌ Error renaming {old_name}: {e}")
            errors += 1
    else:
        print(f"⏭️  Skipped: {old_name} (file not found)")
        skipped += 1

print("")
print("=" * 70)
print("📈 SUMMARY:")
print(f"  ✅ Renamed: {renamed}")
print(f"  ⏭️  Skipped: {skipped}")
print(f"  ❌ Errors: {errors}")
print("=" * 70)
print("")

if errors == 0:
    print("🎉 All images renamed successfully!")
    print("")
    print("⚠️  NEXT STEPS:")
    print("1. Already updated image paths in: public/news.json")
    print("2. Already updated image links in: index.html, blog.html, blog_detail.html, booking.html")
    print("3. Run: git add . ; git commit -m 'Refactor: Rename images to SEO-friendly names'")
    print("4. Run: git push")
    print("")
else:
    print("⚠️  Some errors occurred. Please check above for details.")
    sys.exit(1)
