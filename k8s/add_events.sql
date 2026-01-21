-- Add remaining events (8-20)
INSERT INTO db_catalog.events (title, description, category, venue, venue_address, image_url, date, price, total_seats) VALUES
('Festival Lollapalooza Lima 2026','Tres días de música con los mejores artistas internacionales. Rock, pop, electrónica y más en un solo lugar.','FESTIVAL','Hipódromo de Monterrico','Av. El Derby s/n, Surco','https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800&auto=format&fit=crop','2026-03-27 14:00:00',350.00,60000),
('Ballet Clásico: El Lago de los Cisnes','El ballet más famoso del mundo interpretado por la compañía nacional. Una noche de elegancia y arte.','THEATER','Teatro Municipal de Lima','Jr. Ica 377, Cercado de Lima','https://images.unsplash.com/photo-1518834107812-67b0b7c58434?q=80&w=800&auto=format&fit=crop','2026-05-08 19:00:00',95.00,1200),
('Partido Amistoso: Perú vs Argentina','La blanquirroja se enfrenta a la albiceleste en un encuentro imperdible. Fútbol de primer nivel.','SPORTS','Estadio Nacional','Av. José Díaz s/n, Lima','https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop','2026-09-05 20:30:00',120.00,45000),
('Festival Gastronómico Mistura 2026','La feria gastronómica más grande de Latinoamérica. Degusta lo mejor de la cocina peruana e internacional.','FESTIVAL','Costa Verde','Circuito de Playas Costa Verde, Miraflores','https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop','2026-09-10 10:00:00',35.00,20000),
('Karol G: Mañana Será Bonito Tour','La bichota llega con su tour mundial. Reggaeton, pop urbano y empoderamiento femenino.','CONCERT','Estadio Nacional','Av. José Díaz s/n, Lima','https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=800&auto=format&fit=crop','2026-08-14 20:00:00',165.00,40000),
('Conferencia: Inteligencia Artificial y Futuro','Expertos mundiales en IA discuten el futuro de la tecnología. Incluye talleres prácticos y networking.','CONFERENCE','Swissotel Lima','Av. Santo Toribio 173, San Isidro','https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=800&auto=format&fit=crop','2026-06-22 08:00:00',450.00,800),
('Cirque du Soleil: KURIOS','El famoso circo canadiense presenta su espectáculo más surrealista. Acrobacia, música y magia.','THEATER','Arena 1 de Lima','Av. Javier Prado Este 2698, San Borja','https://images.unsplash.com/photo-1464047736614-af63643285bf?q=80&w=800&auto=format&fit=crop','2026-10-15 19:30:00',280.00,5000),
('Torneo ATP 250 Lima','Tenis de clase mundial con los mejores jugadores del circuito ATP. Semana completa de competencia.','SPORTS','Club Lawn Tennis','Av. Caminos del Inca 581, Surco','https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=800&auto=format&fit=crop','2026-02-23 10:00:00',75.00,3500),
('The Weeknd: After Hours Tour','El rey del R&B contemporáneo regresa con sus mejores hits. Una producción audiovisual impresionante.','CONCERT','Estadio San Marcos','Av. Universitaria 1801, San Miguel','https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop','2026-11-07 21:00:00',220.00,35000),
('Festival de Cine de Lima','Una semana dedicada al séptimo arte con estrenos, clásicos y encuentros con directores.','OTHER','Cineplanet Alcázar','Av. Larco 1124, Miraflores','https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop','2026-08-01 18:00:00',25.00,500),
('Copa América 2026: Semifinal','Uno de los partidos más importantes del torneo continental. Historia en vivo.','SPORTS','Estadio Monumental','Av. Javier Prado Este 7000, Ate','https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=800&auto=format&fit=crop','2026-07-06 19:00:00',400.00,80000),
('Imagine Dragons: Mercury World Tour','La banda de rock alternativo llega con su nuevo álbum. Efectos visuales y energía pura.','CONCERT','Estadio Nacional','Av. José Díaz s/n, Lima','https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop','2026-05-30 20:00:00',175.00,45000),
('Obra de Teatro: El Avaro de Molière','Comedia clásica francesa presentada por el elenco del Teatro Nacional. Humor inteligente y atemporal.','THEATER','Teatro Británico','Jr. Bellavista 527, Miraflores','https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=800&auto=format&fit=crop','2026-04-10 20:00:00',60.00,400);

-- Add seats for events 7-20
INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 7, 'GENERAL', chr(65 + ((gs - 1) / 20)), ((gs - 1) % 20) + 1, 'AVAILABLE'
FROM generate_series(1, 200) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 8, 'GENERAL', chr(65 + ((gs - 1) / 20)), ((gs - 1) % 20) + 1, 'AVAILABLE'
FROM generate_series(1, 200) AS gs;
INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 8, 'VIP', chr(65 + ((gs - 1) / 20)), ((gs - 1) % 20) + 1, 'AVAILABLE'
FROM generate_series(1, 100) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 9, 'PLATEA', chr(65 + ((gs - 1) / 15)), ((gs - 1) % 15) + 1, 'AVAILABLE'
FROM generate_series(1, 150) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 10, 'TRIBUNA', chr(65 + ((gs - 1) / 20)), ((gs - 1) % 20) + 1, 'AVAILABLE'
FROM generate_series(1, 200) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 11, 'GENERAL', chr(65 + ((gs - 1) / 25)), ((gs - 1) % 25) + 1, 'AVAILABLE'
FROM generate_series(1, 250) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 12, 'GENERAL', chr(65 + ((gs - 1) / 20)), ((gs - 1) % 20) + 1, 'AVAILABLE'
FROM generate_series(1, 200) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 13, 'SALA_PRINCIPAL', chr(65 + ((gs - 1) / 15)), ((gs - 1) % 15) + 1, 'AVAILABLE'
FROM generate_series(1, 120) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 14, 'PLATEA', chr(65 + ((gs - 1) / 18)), ((gs - 1) % 18) + 1, 'AVAILABLE'
FROM generate_series(1, 180) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 15, 'TRIBUNA', chr(65 + ((gs - 1) / 14)), ((gs - 1) % 14) + 1, 'AVAILABLE'
FROM generate_series(1, 140) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 16, 'GENERAL', chr(65 + ((gs - 1) / 20)), ((gs - 1) % 20) + 1, 'AVAILABLE'
FROM generate_series(1, 200) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 17, 'SALA', chr(65 + ((gs - 1) / 10)), ((gs - 1) % 10) + 1, 'AVAILABLE'
FROM generate_series(1, 80) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 18, 'TRIBUNA', chr(65 + ((gs - 1) / 20)), ((gs - 1) % 20) + 1, 'AVAILABLE'
FROM generate_series(1, 200) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 19, 'GENERAL', chr(65 + ((gs - 1) / 20)), ((gs - 1) % 20) + 1, 'AVAILABLE'
FROM generate_series(1, 200) AS gs;

INSERT INTO db_catalog.seats (event_id, section, row, seat_number, status)
SELECT 20, 'PLATEA', chr(65 + ((gs - 1) / 12)), ((gs - 1) % 12) + 1, 'AVAILABLE'
FROM generate_series(1, 60) AS gs;
