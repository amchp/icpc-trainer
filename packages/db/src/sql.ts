import { sql } from "drizzle-orm";

const SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Use only with static SQLite column names from schema definitions.
export const excludedColumn = (columnName: string) => {
  if (!SQL_IDENTIFIER.test(columnName)) {
    throw new Error(`Unsafe excluded column name: ${columnName}`);
  }

  return sql.raw(`excluded.${columnName}`);
};
