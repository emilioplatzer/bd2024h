create database productos_db;
create schema prod;

set search_path = prod;

create table producto(
  id serial primary key,
  nombre text not null,
  categoria text
);

insert into producto (nombre, categoria) values 
  ('café del kiosko del 0', 'cafetería'),
  ('café del maximia', 'cafetería');
