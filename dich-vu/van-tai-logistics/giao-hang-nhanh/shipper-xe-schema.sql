CREATE TABLE IF NOT EXISTS giaohangnhanh_shipper_xe (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shipper_id BIGINT UNSIGNED NOT NULL,
  loai_xe VARCHAR(100) NOT NULL,
  ten_hien_thi VARCHAR(255) NOT NULL,
  trang_thai VARCHAR(50) NOT NULL DEFAULT 'hoat_dong',
  la_mac_dinh TINYINT(1) NOT NULL DEFAULT 0,
  ghi_chu TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_giaohangnhanh_shipper_xe_shipper_id (shipper_id),
  KEY idx_giaohangnhanh_shipper_xe_loai_xe (loai_xe),
  KEY idx_giaohangnhanh_shipper_xe_trang_thai (trang_thai)
);

ALTER TABLE giaohangnhanh_dat_lich
  ADD COLUMN shipper_xe_id BIGINT UNSIGNED NULL,
  ADD COLUMN shipper_xe_ten VARCHAR(255) NULL;
