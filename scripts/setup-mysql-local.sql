-- Ejecutar como usuario con privilegios (ej. root):
--   mysql -u root -p < scripts/setup-mysql-local.sql
--
-- Crea la base y el usuario que espera apps/api/.env.example (Moda Urbana)

CREATE DATABASE IF NOT EXISTS moda_urbana
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS moda_urbana_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'moda_urbana'@'localhost' IDENTIFIED BY 'moda_urbana';
CREATE USER IF NOT EXISTS 'moda_urbana'@'127.0.0.1' IDENTIFIED BY 'moda_urbana';

GRANT ALL PRIVILEGES ON moda_urbana.* TO 'moda_urbana'@'localhost';
GRANT ALL PRIVILEGES ON moda_urbana.* TO 'moda_urbana'@'127.0.0.1';
GRANT ALL PRIVILEGES ON moda_urbana_test.* TO 'moda_urbana'@'localhost';
GRANT ALL PRIVILEGES ON moda_urbana_test.* TO 'moda_urbana'@'127.0.0.1';

FLUSH PRIVILEGES;
