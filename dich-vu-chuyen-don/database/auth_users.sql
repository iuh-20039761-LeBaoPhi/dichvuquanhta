CREATE DATABASE IF NOT EXISTS `dichvuchuyendon`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `dichvuchuyendon`;

CREATE TABLE IF NOT EXISTS auth_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role ENUM('khach-hang', 'doi-tac') NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    contact_person VARCHAR(120) DEFAULT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_auth_users_role_email (role, email),
    UNIQUE KEY uq_auth_users_role_phone (role, phone),
    KEY idx_auth_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO auth_users (role, full_name, contact_person, email, phone, password_hash, status)
VALUES
    (
        'khach-hang',
        'Le Minh Khang',
        NULL,
        'khang.le@chuyendon.vn',
        '0909123456',
        '$2y$10$oTPFrqiXxtj1eLq74qL1KuIf78vpZmA1cN/V4p/TD9u7HK7fow9oi',
        'active'
    ),
    (
        'doi-tac',
        'Cong ty TNHH Van Tai An Phuc',
        'Nguyen Hoang Tam',
        'dieuphoi@anphuclogistics.vn',
        '0918456723',
        '$2y$10$NsSaOhuG9EP5pUT5gXZ9NeG5.qNdh3jbgZae5PtgsoehNN32wFP.e',
        'active'
    )
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    contact_person = VALUES(contact_person),
    password_hash = VALUES(password_hash),
    status = VALUES(status),
    updated_at = CURRENT_TIMESTAMP;
