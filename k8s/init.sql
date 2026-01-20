-- ================================================
-- TicketBuster - Database Initialization Script
-- PostgreSQL 14+
-- Database per Service Pattern
-- ================================================

-- ================================================
-- SCHEMA: db_catalog (Inventory Service - Node.js)
-- ================================================

CREATE SCHEMA IF NOT EXISTS db_catalog;

SET search_path TO db_catalog;

-- Create ENUM types for catalog schema
CREATE TYPE db_catalog.seat_status AS ENUM ('AVAILABLE', 'LOCKED', 'SOLD');

-- Events Table
CREATE TABLE IF NOT EXISTS db_catalog.events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMP NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for event queries
CREATE INDEX idx_events_date ON db_catalog.events(date);
CREATE INDEX idx_events_title ON db_catalog.events(title);

-- Seats Table
CREATE TABLE IF NOT EXISTS db_catalog.seats (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES db_catalog.events(id) ON DELETE CASCADE,
    seat_number VARCHAR(50) NOT NULL,
    status db_catalog.seat_status NOT NULL DEFAULT 'AVAILABLE',
    locked_at TIMESTAMP,
    locked_by_user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_seat_per_event UNIQUE (event_id, seat_number)
);

-- Create indexes for seat queries
CREATE INDEX idx_seats_event_id ON db_catalog.seats(event_id);
CREATE INDEX idx_seats_status ON db_catalog.seats(status);
CREATE INDEX idx_seats_locked_by ON db_catalog.seats(locked_by_user_id) WHERE locked_by_user_id IS NOT NULL;

-- Function to automatically unlock expired locks (seats locked for more than 10 minutes)
CREATE OR REPLACE FUNCTION db_catalog.unlock_expired_seats()
RETURNS void AS $$
BEGIN
    UPDATE db_catalog.seats
    SET status = 'AVAILABLE',
        locked_at = NULL,
        locked_by_user_id = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'LOCKED'
    AND locked_at < (CURRENT_TIMESTAMP - INTERVAL '10 minutes');
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION db_catalog.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_update_timestamp
    BEFORE UPDATE ON db_catalog.events
    FOR EACH ROW
    EXECUTE FUNCTION db_catalog.update_timestamp();

CREATE TRIGGER seats_update_timestamp
    BEFORE UPDATE ON db_catalog.seats
    FOR EACH ROW
    EXECUTE FUNCTION db_catalog.update_timestamp();

-- ================================================
-- SAMPLE DATA for db_catalog
-- ================================================

-- Insert sample events
INSERT INTO db_catalog.events (title, description, date, price, total_seats) VALUES
(
    'Rock Festival 2026',
    'El festival de rock más grande del año con bandas internacionales. Incluye acceso a tres escenarios y zona VIP disponible.',
    '2026-06-15 19:00:00',
    89.99,
    5000
),
(
    'Teatro Musical: El Fantasma de la Ópera',
    'Presentación exclusiva del clásico musical de Broadway. Una experiencia inolvidable con efectos especiales y orquesta en vivo.',
    '2026-03-20 20:30:00',
    125.50,
    800
),
(
    'Conferencia Tech Summit 2026',
    'Cumbre tecnológica con speakers de empresas líderes como Google, Microsoft y Meta. Incluye networking y workshops.',
    '2026-05-10 09:00:00',
    299.00,
    1500
);

-- Insert sample seats for Event 1 (Rock Festival)
INSERT INTO db_catalog.seats (event_id, seat_number, status) 
SELECT 
    1,
    'SECT-A-' || LPAD(generate_series::text, 4, '0'),
    'AVAILABLE'
FROM generate_series(1, 100);

INSERT INTO db_catalog.seats (event_id, seat_number, status) 
SELECT 
    1,
    'SECT-B-' || LPAD(generate_series::text, 4, '0'),
    'AVAILABLE'
FROM generate_series(1, 100);

-- Insert sample seats for Event 2 (Teatro Musical)
INSERT INTO db_catalog.seats (event_id, seat_number, status) 
SELECT 
    2,
    'PLATEA-' || chr(65 + (generate_series - 1) / 20) || '-' || LPAD(((generate_series - 1) % 20 + 1)::text, 2, '0'),
    'AVAILABLE'
FROM generate_series(1, 100);

-- Insert some locked and sold seats for testing
UPDATE db_catalog.seats 
SET status = 'LOCKED', 
    locked_at = CURRENT_TIMESTAMP, 
    locked_by_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
WHERE id IN (1, 2, 3);

UPDATE db_catalog.seats 
SET status = 'SOLD'
WHERE id IN (10, 11, 12, 13, 14);

-- ================================================
-- SCHEMA: db_orders (Order Worker Service - Python)
-- ================================================

CREATE SCHEMA IF NOT EXISTS db_orders;

SET search_path TO db_orders;

-- Create ENUM types for orders schema
CREATE TYPE db_orders.order_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- Orders Table
CREATE TABLE IF NOT EXISTS db_orders.orders (
    id SERIAL PRIMARY KEY,
    order_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    status db_orders.order_status NOT NULL DEFAULT 'PENDING',
    qr_code_hash TEXT,
    processing_complexity INTEGER CHECK (processing_complexity BETWEEN 1 AND 10),
    payment_reference VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for order queries
CREATE INDEX idx_orders_uuid ON db_orders.orders(order_uuid);
CREATE INDEX idx_orders_user_id ON db_orders.orders(user_id);
CREATE INDEX idx_orders_status ON db_orders.orders(status);
CREATE INDEX idx_orders_created_at ON db_orders.orders(created_at DESC);
CREATE INDEX idx_orders_event_seat ON db_orders.orders(event_id, seat_id);

-- Order History Table (for audit trail)
CREATE TABLE IF NOT EXISTS db_orders.order_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES db_orders.orders(id) ON DELETE CASCADE,
    previous_status db_orders.order_status,
    new_status db_orders.order_status NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_order_history_order_id ON db_orders.order_history(order_id);

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION db_orders.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO db_orders.order_history (order_id, previous_status, new_status, notes)
        VALUES (NEW.id, OLD.status, NEW.status, 'Status changed from ' || OLD.status || ' to ' || NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_change_trigger
    AFTER UPDATE ON db_orders.orders
    FOR EACH ROW
    EXECUTE FUNCTION db_orders.log_order_status_change();

-- Trigger to update updated_at timestamp
CREATE TRIGGER orders_update_timestamp
    BEFORE UPDATE ON db_orders.orders
    FOR EACH ROW
    EXECUTE FUNCTION db_catalog.update_timestamp();

-- Function to complete an order
CREATE OR REPLACE FUNCTION db_orders.complete_order(p_order_uuid UUID, p_qr_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE db_orders.orders
    SET status = 'COMPLETED',
        qr_code_hash = p_qr_hash,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE order_uuid = p_order_uuid
    AND status = 'PROCESSING';
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- SAMPLE DATA for db_orders
-- ================================================

-- Insert sample orders for testing
INSERT INTO db_orders.orders (order_uuid, user_id, event_id, seat_id, total_amount, status, processing_complexity, qr_code_hash) VALUES
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    1,
    10,
    89.99,
    'COMPLETED',
    5,
    'QR_HASH_ABC123XYZ'
),
(
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
    2,
    50,
    125.50,
    'COMPLETED',
    3,
    'QR_HASH_DEF456UVW'
),
(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid,
    1,
    1,
    89.99,
    'PENDING',
    7,
    NULL
);

-- ================================================
-- UTILITY VIEWS
-- ================================================

-- View: Available seats per event
CREATE OR REPLACE VIEW db_catalog.v_available_seats_per_event AS
SELECT 
    e.id AS event_id,
    e.title AS event_title,
    e.date AS event_date,
    COUNT(s.id) AS available_seats,
    e.total_seats
FROM db_catalog.events e
LEFT JOIN db_catalog.seats s ON e.id = s.event_id AND s.status = 'AVAILABLE'
GROUP BY e.id, e.title, e.date, e.total_seats;

-- View: Order summary
CREATE OR REPLACE VIEW db_orders.v_order_summary AS
SELECT 
    o.order_uuid,
    o.user_id,
    o.event_id,
    o.seat_id,
    o.total_amount,
    o.status,
    o.created_at,
    o.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(o.completed_at, CURRENT_TIMESTAMP) - o.created_at)) AS processing_time_seconds
FROM db_orders.orders o;

-- ================================================
-- PERMISSIONS (Optional - adjust based on your setup)
-- ================================================

-- Grant permissions to catalog service user
-- GRANT USAGE ON SCHEMA db_catalog TO catalog_service_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA db_catalog TO catalog_service_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA db_catalog TO catalog_service_user;

-- Grant permissions to order service user
-- GRANT USAGE ON SCHEMA db_orders TO order_service_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA db_orders TO order_service_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA db_orders TO order_service_user;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check created schemas
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'db_%';

-- Check events and seats
-- SELECT * FROM db_catalog.v_available_seats_per_event;

-- Check sample orders
-- SELECT * FROM db_orders.v_order_summary;

RESET search_path;
