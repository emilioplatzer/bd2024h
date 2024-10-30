create database productos_db;
create schema prod;

create user prod_be password 'cambiar_esta_clave_1234';
grant usage on schema prod to prod_be;
grant all on producto_id_seq to prod_be;

set search_path = prod;

create table producto(
  id serial primary key,
  nombre text not null,
  categoria text
);

grant select, update, insert, delete on prod.producto to prod_be;

insert into producto (nombre, categoria) values 
  ('café del kiosko del 0', 'cafetería'),
  ('café del maximia', 'cafetería');

alter table producto add column lugar text;  
