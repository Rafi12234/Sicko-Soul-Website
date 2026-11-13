/**
 * The old demonstration seeder has deliberately been retired.
 * Real catalogue records (images, colours, prices, sizes, stock) are imported
 * exclusively with sql/sicko_real_catalog_workbench.sql in MySQL Workbench.
 * This script never inserts or updates products.
 */
console.error(
  "Demo product seeding has been disabled. Run sql/sicko_real_catalog_workbench.sql manually in MySQL Workbench instead.",
);
process.exitCode = 1;
