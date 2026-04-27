import { formatCurrency } from '@/lib/format';

export type KitchenMenuCategory = {
  id: string | number;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

export type KitchenMenuItem = {
  id: string | number;
  name: string;
  description: string;
  price: number;
  categoryId: string | number | '';
  categoryName: string;
  imageUrl: string;
  displayOrder: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
};

export type KitchenMenuGroup = {
  key: string;
  title: string;
  category?: KitchenMenuCategory;
  items: KitchenMenuItem[];
};

export type KitchenMenuItemForm = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  displayOrder: string;
  imageUrl: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
};

export type KitchenMenuCategoryForm = {
  name: string;
  displayOrder: string;
  isActive: boolean;
};

export type KitchenCsvRow = Record<string, string>;

export const EMPTY_MENU_ITEM_FORM: KitchenMenuItemForm = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  displayOrder: '',
  imageUrl: '',
  isAvailable: true,
  isVegetarian: false,
  isVegan: false,
};

export const EMPTY_MENU_CATEGORY_FORM: KitchenMenuCategoryForm = {
  name: '',
  displayOrder: '',
  isActive: true,
};

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lower)) return true;
    if (['false', '0', 'no', 'off'].includes(lower)) return false;
  }
  return fallback;
}

export function normalizeMenuItem(item: Record<string, unknown>, index = 0): KitchenMenuItem {
  const category = (item.category as Record<string, unknown> | undefined) || undefined;
  return {
    id: item.id as string | number,
    name: String(item.name || item.title || `Item ${index + 1}`),
    description: String(item.description || ''),
    price: normalizeNumber(item.price, 0),
    categoryId: (item.category_id ?? item.categoryId ?? category?.id ?? '') as string | number | '',
    categoryName: String(item.category_name ?? item.categoryName ?? category?.name ?? ''),
    imageUrl: String(item.image_url ?? item.imageUrl ?? ''),
    displayOrder: normalizeNumber(item.display_order ?? item.displayOrder, index + 1),
    isAvailable: normalizeBoolean(item.is_available ?? item.isAvailable, true),
    isVegetarian: normalizeBoolean(item.is_vegetarian ?? item.isVegetarian, false),
    isVegan: normalizeBoolean(item.is_vegan ?? item.isVegan, false),
  };
}

export function normalizeMenuItems(items: Record<string, unknown>[] = []): KitchenMenuItem[] {
  return items.map((item, index) => normalizeMenuItem(item, index));
}

export function normalizeMenuCategory(category: Record<string, unknown>, index = 0): KitchenMenuCategory {
  return {
    id: category.id as string | number,
    name: String(category.name || `Category ${index + 1}`),
    displayOrder: normalizeNumber(category.display_order ?? category.displayOrder, index + 1),
    isActive: normalizeBoolean(category.is_active ?? category.isActive, true),
  };
}

export function normalizeMenuCategories(categories: Record<string, unknown>[] = []): KitchenMenuCategory[] {
  return categories
    .map((category, index) => normalizeMenuCategory(category, index))
    .sort((left, right) => {
      const orderDelta = left.displayOrder - right.displayOrder;
      if (orderDelta !== 0) return orderDelta;
      return left.name.localeCompare(right.name);
    });
}

export function sortMenuItems(items: KitchenMenuItem[]) {
  return [...items].sort((left, right) => {
    const orderDelta = normalizeNumber(left.displayOrder) - normalizeNumber(right.displayOrder);
    if (orderDelta !== 0) return orderDelta;
    return left.name.localeCompare(right.name);
  });
}

export function groupMenuItems(items: KitchenMenuItem[], categories: KitchenMenuCategory[]) {
  const groups: KitchenMenuGroup[] = [];
  const groupMap = new Map<string, KitchenMenuGroup>();

  categories.forEach((category) => {
    const key = `category:${category.id}`;
    const group = {
      key,
      title: category.name,
      category,
      items: [] as KitchenMenuItem[],
    };
    groups.push(group);
    groupMap.set(key, group);
  });

  const uncategorized: KitchenMenuGroup = {
    key: 'uncategorized',
    title: 'Uncategorized',
    items: [],
  };

  items.forEach((item) => {
    const categoryId = item.categoryId || '';
    const categoryKey = categoryId ? `category:${categoryId}` : '';
    const categoryNameKey = item.categoryName ? `name:${item.categoryName.toLowerCase()}` : '';
    const matchedGroup = (categoryKey && groupMap.get(categoryKey)) || groupMap.get(categoryNameKey);

    if (matchedGroup) {
      matchedGroup.items.push(item);
      return;
    }

    if (item.categoryName && !groupMap.has(categoryNameKey)) {
      const customGroup: KitchenMenuGroup = {
        key: categoryNameKey,
        title: item.categoryName,
        items: [item],
      };
      groups.push(customGroup);
      groupMap.set(categoryNameKey, customGroup);
      return;
    }

    uncategorized.items.push(item);
  });

  const output = groups
    .map((group) => ({ ...group, items: sortMenuItems(group.items) }))
    .filter((group) => group.items.length > 0)
    .sort((left, right) => {
      const leftOrder = left.category ? normalizeNumber(left.category.displayOrder) : Number.MAX_SAFE_INTEGER;
      const rightOrder = right.category ? normalizeNumber(right.category.displayOrder) : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.title.localeCompare(right.title);
    });

  if (uncategorized.items.length) {
    output.push({ ...uncategorized, items: sortMenuItems(uncategorized.items) });
  }

  return output;
}

export function toMenuItemForm(item?: Partial<KitchenMenuItem> | null): KitchenMenuItemForm {
  if (!item) {
    return { ...EMPTY_MENU_ITEM_FORM };
  }

  return {
    name: item.name || '',
    description: item.description || '',
    price: item.price != null ? String(item.price) : '',
    categoryId: item.categoryId != null ? String(item.categoryId) : '',
    displayOrder: item.displayOrder != null ? String(item.displayOrder) : '',
    imageUrl: item.imageUrl || '',
    isAvailable: item.isAvailable ?? true,
    isVegetarian: item.isVegetarian ?? false,
    isVegan: item.isVegan ?? false,
  };
}

export function toMenuCategoryForm(category?: Partial<KitchenMenuCategory> | null): KitchenMenuCategoryForm {
  if (!category) {
    return { ...EMPTY_MENU_CATEGORY_FORM };
  }

  return {
    name: category.name || '',
    displayOrder: category.displayOrder != null ? String(category.displayOrder) : '',
    isActive: category.isActive ?? true,
  };
}

export function buildMenuItemPayload(form: KitchenMenuItemForm) {
  const parsedCategoryId = Number(form.categoryId);
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    price: normalizeNumber(form.price, 0),
    categoryId: form.categoryId === '' ? null : Number.isFinite(parsedCategoryId) ? parsedCategoryId : form.categoryId,
    displayOrder: form.displayOrder === '' ? 0 : normalizeNumber(form.displayOrder, 0),
    image_url: form.imageUrl.trim() || undefined,
    isAvailable: Boolean(form.isAvailable),
    isVegetarian: Boolean(form.isVegetarian),
    isVegan: Boolean(form.isVegan),
  };
}

export function buildMenuCategoryPayload(form: KitchenMenuCategoryForm) {
  return {
    name: form.name.trim(),
    display_order: form.displayOrder === '' ? 0 : normalizeNumber(form.displayOrder, 0),
    is_active: Boolean(form.isActive),
  };
}

function parseDelimitedLine(line: string, delimiter = ',') {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseKitchenCsvText(text: string): KitchenCsvRow[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) {
    return [];
  }

  const headers = parseDelimitedLine(rows[0]).map((header) => header.toLowerCase());

  return rows.slice(1).map((line) => {
    const values = parseDelimitedLine(line);
    return headers.reduce<KitchenCsvRow>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

export function buildKitchenCsvImportPayload(rows: KitchenCsvRow[], categories: KitchenMenuCategory[]) {
  const categoryLookup = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category]));
  const groupedCategories = new Map<
    string,
    { id?: string | number; name: string; display_order: number; is_active: boolean; items: Record<string, unknown>[] }
  >();
  const uncategorizedItems: Record<string, unknown>[] = [];

  rows.forEach((row) => {
    const name = String(row.name || row.item || row.item_name || '').trim();
    if (!name) return;

    const categoryName = String(row.category || row.category_name || row.categoryname || '').trim();
    const item = {
      name,
      description: String(row.description || '').trim(),
      price: row.price != null ? normalizeNumber(row.price, 0) : 0,
      is_available: normalizeBoolean(row.is_available ?? row.available ?? row.status, true),
      is_vegetarian: normalizeBoolean(row.is_vegetarian ?? row.vegetarian, false),
      is_vegan: normalizeBoolean(row.is_vegan ?? row.vegan, false),
      display_order: normalizeNumber(row.display_order ?? row.displayorder, 0),
      image_url: String(row.image_url || row.imageUrl || '').trim() || undefined,
    };

    if (!categoryName) {
      uncategorizedItems.push(item);
      return;
    }

    const normalizedCategory = categoryLookup.get(categoryName.toLowerCase()) || null;
    const key = normalizedCategory ? `category:${normalizedCategory.id}` : `name:${categoryName.toLowerCase()}`;

    if (!groupedCategories.has(key)) {
      groupedCategories.set(key, {
        ...(normalizedCategory
          ? {
              id: normalizedCategory.id,
              name: normalizedCategory.name,
              display_order: normalizedCategory.displayOrder,
              is_active: normalizedCategory.isActive,
            }
          : {
              name: categoryName,
              display_order: groupedCategories.size + 1,
              is_active: true,
            }),
        items: [],
      });
    }

    groupedCategories.get(key)?.items.push(item);
  });

  return {
    categories: Array.from(groupedCategories.values()),
    uncategorized_items: uncategorizedItems,
  };
}

export function formatMenuItemSubtitle(item: KitchenMenuItem, categoryLabel?: string) {
  const pieces = [categoryLabel || 'Uncategorized'];
  if (item.description) {
    pieces.push(item.description);
  }
  return pieces.join(' • ');
}

export function formatMenuPrice(price: number) {
  return formatCurrency(Number.isFinite(price) ? price : 0);
}
