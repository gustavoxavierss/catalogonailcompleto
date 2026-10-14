-- Expose the owner-safe direct relation used by the dashboard's embedded query.
alter table nail_catalog.orders add constraint orders_catalog_owner_fkey
  foreign key (catalog_id,user_id) references nail_catalog.catalogs(id,user_id);
notify pgrst, 'reload schema';
