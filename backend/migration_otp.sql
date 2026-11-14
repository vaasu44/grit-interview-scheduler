USE grit;
ALTER TABLE users
ADD COLUMN phone VARCHAR(15) NULL;
CREATE TABLE IF NOT EXISTS otps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    used TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_user_phone (user_id, phone)
);