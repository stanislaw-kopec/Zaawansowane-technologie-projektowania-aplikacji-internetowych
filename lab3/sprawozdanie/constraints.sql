\pset pager off
BEGIN;
INSERT INTO buildings(name,address) VALUES ('Constraint demo','Test') RETURNING id AS b \gset
INSERT INTO rooms(building_id,name,capacity) VALUES (:b,'101',10) RETURNING id AS r \gset
\echo UNIQUE buildings.name
SAVEPOINT example;
INSERT INTO buildings(name,address) VALUES ('Constraint demo','Test');
ROLLBACK TO example;
\echo UNIQUE rooms(building_id,name)
INSERT INTO rooms(building_id,name,capacity) VALUES (:b,'101',10);
ROLLBACK TO example;
\echo CHECK capacity > 0
INSERT INTO rooms(building_id,name,capacity) VALUES (:b,'102',0);
ROLLBACK TO example;
\echo CHECK end_time > start_time
INSERT INTO reservations(room_id,reserved_by,participants,start_time,end_time) VALUES (:r,'Test',1,'2035-01-01 11:00Z','2035-01-01 10:00Z');
ROLLBACK TO example;
\echo CHECK status
INSERT INTO reservations(room_id,reserved_by,participants,start_time,end_time,status) VALUES (:r,'Test',1,'2035-01-01 10:00Z','2035-01-01 11:00Z','INVALID');
ROLLBACK TO example;
\echo FK rooms.building_id
INSERT INTO rooms(building_id,name,capacity) VALUES (-1,'101',10);
ROLLBACK TO example;
\echo FK reservations.room_id
INSERT INTO reservations(room_id,reserved_by,participants,start_time,end_time) VALUES (-1,'Test',1,'2035-01-01 10:00Z','2035-01-01 11:00Z');
ROLLBACK TO example;
\echo ON DELETE RESTRICT
DELETE FROM buildings WHERE id=:b;
ROLLBACK TO example;
ROLLBACK;
