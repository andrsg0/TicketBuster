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
CREATE TYPE db_catalog.event_category AS ENUM ('CONCERT', 'THEATER', 'SPORTS', 'CONFERENCE', 'FESTIVAL', 'OTHER');

-- Events Table
CREATE TABLE IF NOT EXISTS db_catalog.events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category db_catalog.event_category NOT NULL DEFAULT 'OTHER',
    venue VARCHAR(255) NOT NULL,
    venue_address TEXT,
    image_url TEXT,
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
    section VARCHAR(50) NOT NULL,
    row VARCHAR(10) NOT NULL,
    seat_number INTEGER NOT NULL,
    status db_catalog.seat_status NOT NULL DEFAULT 'AVAILABLE',
    locked_at TIMESTAMP,
    locked_by_user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_seat_per_event UNIQUE (event_id, section, row, seat_number)
);

-- Create indexes for seat queries
CREATE INDEX idx_seats_event_id ON db_catalog.seats(event_id);
CREATE INDEX idx_seats_status ON db_catalog.seats(status);
CREATE INDEX idx_seats_section ON db_catalog.seats(event_id, section);
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
INSERT INTO db_catalog.events (title, description, category, venue, venue_address, image_url, date, price, total_seats) VALUES
(
    'Rock Festival 2026',
    'El festival de rock más grande del año con bandas internacionales. Incluye acceso a tres escenarios y zona VIP disponible.',
    'FESTIVAL',
    'Estadio Nacional',
    'Av. José Díaz s/n, Lima',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop',
    '2026-06-15 19:00:00',
    89.99,
    5000
),
(
    'Teatro Musical: El Fantasma de la Ópera',
    'Presentación exclusiva del clásico musical de Broadway. Una experiencia inolvidable con efectos especiales y orquesta en vivo.',
    'THEATER',
    'Gran Teatro Nacional',
    'Av. Javier Prado Este 2225, San Borja',
    'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=800&auto=format&fit=crop',
    '2026-03-20 20:30:00',
    125.50,
    800
),
(
    'Conferencia Tech Summit 2026',
    'Cumbre tecnológica con speakers de empresas líderes como Google, Microsoft y Meta. Incluye networking y workshops.',
    'CONFERENCE',
    'Centro de Convenciones de Lima',
    'Av. Javier Prado Este 4700, Surco',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop',
    '2026-05-10 09:00:00',
    299.00,
    1500
),
(
    'Coldplay: Music of the Spheres Tour',
    'La banda británica regresa con su espectacular gira mundial. Luces, confeti y los mejores hits de su carrera.',
    'CONCERT',
    'Estadio Nacional',
    'Av. José Díaz s/n, Lima',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop',
    '2026-04-22 20:00:00',
    199.99,
    45000
),
(
    'Final Copa Libertadores 2026',
    'La gran final del torneo más importante de Sudamérica. Vive la pasión del fútbol en vivo.',
    'SPORTS',
    'Estadio Monumental',
    'Av. Javier Prado Este 7000, Ate',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    '2026-11-23 17:00:00',
    350.00,
    80000
),
(
    'Stand Up Comedy: Noche de Risas',
    'Los mejores comediantes del país en una noche inolvidable de humor y entretenimiento.',
    'OTHER',
    'Teatro Pirandello',
    'Av. Comandante Espinar 719, Miraflores',
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?q=80&w=800&auto=format&fit=crop',
    '2026-02-14 21:00:00',
    45.00,
    300
);

-- Insert sample seats for Event 1 (Rock Festival) - Zona General con filas A-J, 10 asientos por fila
INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 
    1,
    'GENERAL',
    chr(65 + ((gs - 1) / 10)),  -- A, B, C, D, E, F, G, H, I, J
    ((gs - 1) % 10) + 1,         -- 1-10
    'AVAILABLE'
FROM generate_series(1, 100) AS gs;

-- Insert VIP seats for Event 1 - Zona VIP con filas A-D, 10 asientos por fila
INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 
    1,
    'VIP',
    chr(65 + ((gs - 1) / 10)),  -- A, B, C, D
    ((gs - 1) % 10) + 1,
    'AVAILABLE'
FROM generate_series(1, 40) AS gs;

-- Insert PREFERENCIAL seats for Event 1 - Filas A-E, 10 asientos por fila
INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 
    1,
    'PREFERENCIAL',
    chr(65 + ((gs - 1) / 10)),
    ((gs - 1) % 10) + 1,
    'AVAILABLE'
FROM generate_series(1, 50) AS gs;

-- Insert sample seats for Event 2 (Teatro Musical) - PLATEA con filas A-F, 15 asientos por fila
INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 
    2,
    'PLATEA',
    chr(65 + ((gs - 1) / 15)),
    ((gs - 1) % 15) + 1,
    'AVAILABLE'
FROM generate_series(1, 90) AS gs;

-- Insert MEZANINE seats for Event 2 - Filas A-C, 20 asientos por fila
INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 
    2,
    'MEZANINE',
    chr(65 + ((gs - 1) / 20)),
    ((gs - 1) % 20) + 1,
    'AVAILABLE'
FROM generate_series(1, 60) AS gs;

-- Insert sample seats for Event 3 (Tech Summit) - GENERAL con filas A-H, 20 asientos por fila
INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 
    3,
    'GENERAL',
    chr(65 + ((gs - 1) / 20)),
    ((gs - 1) % 20) + 1,
    'AVAILABLE'
FROM generate_series(1, 160) AS gs;

-- Mark some seats as SOLD for testing
UPDATE db_catalog.seats 
SET status = 'SOLD'
WHERE event_id = 1 AND section = 'VIP' AND row = 'A' AND seat_number IN (3, 4, 5);

UPDATE db_catalog.seats 
SET status = 'SOLD'
WHERE event_id = 2 AND section = 'PLATEA' AND row = 'A' AND seat_number IN (7, 8);

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
