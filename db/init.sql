-- ------------------------------
-- INSERT SHOWS (WITHOUT DROPPING TABLES)
-- ------------------------------
INSERT INTO shows (title, start_time, end_time, days) VALUES
('Night Show', '00:00:00', '06:00:00', ARRAY['mon','tue','wed','thu','fri','sat','sun']),
('Sauti Ya Watoto', '09:00:00', '10:00:00', ARRAY['sat']),
('Ladha Ya Kusini', '10:00:00', '13:00:00', ARRAY['sat']),
('Kilimo Mkwanja', '13:00:00', '14:00:00', ARRAY['sat']),
('Flash Back', '14:00:00', '16:00:00', ARRAY['sat']),
('Mwanamke Jasiri', '16:00:00', '17:00:00', ARRAY['sat']),
('Weekend Pause', '17:00:00', '19:00:00', ARRAY['sat']),
('Bampa To Bampa', '22:00:00', '23:59:00', ARRAY['sat']),
('Sayari Ya Upako', '06:00:00', '10:00:00', ARRAY['sun']),
('Sunday Special', '10:00:00', '13:00:00', ARRAY['sun']),
('Afya Solution', '13:00:00', '14:00:00', ARRAY['sun']),
('Uplands Top 20', '14:00:00', '16:00:00', ARRAY['sun']),
('Jahazi La Pwani', '16:00:00', '19:00:00', ARRAY['sun']),
('Kali Za Kale', '22:00:00', '23:59:00', ARRAY['sun'])
ON CONFLICT (title) DO NOTHING;

-- ------------------------------
-- INSERT PRESENTERS (WITHOUT DROPPING TABLES)
-- ------------------------------
INSERT INTO presenters (name, show_id) VALUES
('Uplands Team', 7),
('Kids Crew', 8),
('Chef Tony', 9),
('Agro Experts', 10),
('DJ Flash', 11),
('Sarah', 12),
('Ben', 13),
('Emma', 13),
('DJ Max', 14),
('Sunny Crew', 15),
('DJ Sun', 16),
('Health Team', 17),
('Top DJs', 18),
('Coast Crew', 19),
('DJ Oldies', 20)
ON CONFLICT (name, show_id) DO NOTHING;