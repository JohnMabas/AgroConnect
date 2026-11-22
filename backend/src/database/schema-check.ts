import { QueryTypes } from "sequelize";
import { sequelize } from "./sequelize.js";
import "./models/index.js";

interface ColumnRow {
  table_name: string;
  column_name: string;
}

export async function findMissingModelColumns(): Promise<string[]> {
  const rows = await sequelize.query<ColumnRow>(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()",
    { type: QueryTypes.SELECT },
  );

  const columnsByTable = new Map<string, Set<string>>();
  for (const row of rows) {
    let columns = columnsByTable.get(row.table_name);
    if (columns === undefined) {
      columns = new Set<string>();
      columnsByTable.set(row.table_name, columns);
    }
    columns.add(row.column_name);
  }

  const missing = new Set<string>();

  for (const model of Object.values(sequelize.models)) {
    const tableName = model.getTableName();
    if (typeof tableName !== "string") continue;

    const databaseColumns = columnsByTable.get(tableName) ?? new Set<string>();

    for (const [attributeName, attribute] of Object.entries(model.rawAttributes)) {
      const columnName = attribute.field ?? attributeName;
      if (!databaseColumns.has(columnName)) {
        missing.add(`${tableName}.${columnName}`);
      }
    }
  }

  return [...missing].sort();
}
