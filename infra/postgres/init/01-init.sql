-- Chạy MỘT LẦN khi container Postgres được tạo lần đầu (volume còn trống).
-- Các schema nghiệp vụ (customer, inventory, ordering, media, ai) do Flyway của từng service tạo.

-- Giống Supabase: extension nằm trong schema "extensions"
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- DB của Keycloak
CREATE SCHEMA IF NOT EXISTS keycloak;
