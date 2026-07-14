const SORT_MAP = {
  createdAt_desc: { createdAt: -1 },
  createdAt_asc: { createdAt: 1 },
  updatedAt_desc: { updatedAt: -1 },
  updatedAt_asc: { updatedAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  sortOrder_asc: { sortOrder: 1, createdAt: -1 },
  sortOrder_desc: { sortOrder: -1, createdAt: -1 },
};

function parseSort(sort, fallback = { createdAt: -1 }) {
  if (!sort) return fallback;
  return SORT_MAP[sort] || fallback;
}

function parseBoolean(value) {
  if (value === undefined || value === "") return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

module.exports = { parseSort, parseBoolean };
