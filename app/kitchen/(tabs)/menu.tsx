import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Chip, Divider, EmptyState, Field, Page, SectionTitle } from '@/components/mobile-ui';
import {
  createKitchenMenuCategory,
  createKitchenMenuItem,
  deleteKitchenMenuItem,
  fetchKitchenMenuCategories,
  fetchKitchenMenuItems,
  importKitchenMenuCsv,
  toggleKitchenMenuItemAvailability,
  updateKitchenMenuCategory,
  updateKitchenMenuItem,
} from '@/lib/api/kitchen-menu';
import { getKitchenRestaurantId } from '@/lib/auth-storage';
import { replaceRoute } from '@/lib/navigation';
import {
  EMPTY_MENU_CATEGORY_FORM,
  EMPTY_MENU_ITEM_FORM,
  buildMenuCategoryPayload,
  buildMenuItemPayload,
  groupMenuItems,
  normalizeMenuCategories,
  normalizeMenuItems,
  parseKitchenCsvText,
  toMenuCategoryForm,
  toMenuItemForm,
  type KitchenMenuCategory,
  type KitchenMenuCategoryForm,
  type KitchenMenuItem,
  type KitchenMenuItemForm,
} from '@/lib/kitchen-menu';
import { formatMenuItemSubtitle, formatMenuPrice } from '@/lib/kitchen-menu';

const MENU_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'veg', label: 'Veg' },
];

const LIGHT_BG = '#f5f7f3';

export default function KitchenMenuScreen() {
  const router = useRouter();
  const restaurantId = getKitchenRestaurantId() || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<KitchenMenuCategory[]>([]);
  const [items, setItems] = useState<KitchenMenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuFilter, setMenuFilter] = useState('all');
  const [itemForm, setItemForm] = useState<KitchenMenuItemForm>({ ...EMPTY_MENU_ITEM_FORM });
  const [categoryForm, setCategoryForm] = useState<KitchenMenuCategoryForm>({ ...EMPTY_MENU_CATEGORY_FORM });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [togglingId, setTogglingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);

  const loadMenu = useCallback(async () => {
    if (!restaurantId) {
      setLoading(false);
      setError('Restaurant context is not available yet.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [menuResponse, categoryResponse] = await Promise.all([
        fetchKitchenMenuItems(restaurantId),
        fetchKitchenMenuCategories(restaurantId),
      ]);

      const nextCategories = normalizeMenuCategories(categoryResponse as Record<string, unknown>[]);
      const nextItems = normalizeMenuItems((menuResponse.items || []) as Record<string, unknown>[]);

      setCategories(nextCategories);
      setItems(nextItems);
      if (nextCategories[0]?.id != null) {
        setItemForm((current) =>
          current.categoryId ? current : { ...current, categoryId: String(nextCategories[0].id) },
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load menu');
      setCategories([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  const groupedItems = useMemo(() => groupMenuItems(items, categories), [items, categories]);
  const filteredGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return groupedItems
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const matchesQuery =
            !normalizedQuery ||
            [item.name, item.description, group.title].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery);
          if (!matchesQuery) return false;
          if (menuFilter === 'available') return item.isAvailable;
          if (menuFilter === 'unavailable') return !item.isAvailable;
          if (menuFilter === 'veg') return item.isVegetarian || item.isVegan;
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedItems, menuFilter, searchQuery]);

  const categoryLine = useMemo(
    () => (categories.length ? categories.map((category) => category.name).join(' • ') : 'No categories yet'),
    [categories],
  );

  const csvRowCount = useMemo(() => parseKitchenCsvText(csvText).length, [csvText]);

  const resetItemForm = () => {
    setEditingItemId(null);
    setItemForm({ ...EMPTY_MENU_ITEM_FORM, categoryId: categories[0]?.id != null ? String(categories[0].id) : '' });
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm({ ...EMPTY_MENU_CATEGORY_FORM });
  };

  const openNewItemEditor = () => {
    resetItemForm();
    setShowItemEditor(true);
  };

  const openNewCategoryEditor = () => {
    resetCategoryForm();
    setShowCategoryEditor(true);
  };

  const handleEditItem = (item: KitchenMenuItem) => {
    setEditingItemId(String(item.id));
    setItemForm(toMenuItemForm(item));
    setShowItemEditor(true);
  };

  const handleEditCategory = (category: KitchenMenuCategory) => {
    setEditingCategoryId(String(category.id));
    setCategoryForm(toMenuCategoryForm(category));
    setShowCategoryEditor(true);
  };

  const handleItemSave = async () => {
    if (!restaurantId) {
      setError('Restaurant context is not available yet.');
      return;
    }
    if (!itemForm.name.trim()) {
      setError('Item name is required.');
      return;
    }

    setItemSaving(true);
    setError('');
    try {
      const payload = buildMenuItemPayload(itemForm);
      if (editingItemId) {
        await updateKitchenMenuItem(editingItemId, payload);
      } else {
        await createKitchenMenuItem(restaurantId, payload);
      }
      resetItemForm();
      setShowItemEditor(false);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save menu item');
    } finally {
      setItemSaving(false);
    }
  };

  const handleCategorySave = async () => {
    if (!restaurantId) {
      setError('Restaurant context is not available yet.');
      return;
    }
    if (!categoryForm.name.trim()) {
      setError('Category name is required.');
      return;
    }

    setCategorySaving(true);
    setError('');
    try {
      const payload = buildMenuCategoryPayload(categoryForm);
      if (editingCategoryId) {
        await updateKitchenMenuCategory(restaurantId, editingCategoryId, payload);
      } else {
        await createKitchenMenuCategory(restaurantId, payload);
      }
      resetCategoryForm();
      setShowCategoryEditor(false);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save category');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleToggleItemAvailability = async (item: KitchenMenuItem) => {
    setTogglingId(String(item.id));
    setError('');
    try {
      await toggleKitchenMenuItemAvailability(String(item.id), { is_available: !item.isAvailable });
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update item availability');
    } finally {
      setTogglingId('');
    }
  };

  const handleDeleteItem = (item: KitchenMenuItem) => {
    Alert.alert('Delete menu item', `Delete ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeletingId(String(item.id));
            setError('');
            try {
              await deleteKitchenMenuItem(String(item.id));
              if (editingItemId === String(item.id)) {
                resetItemForm();
                setShowItemEditor(false);
              }
              await loadMenu();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to delete menu item');
            } finally {
              setDeletingId('');
            }
          })();
        },
      },
    ]);
  };

  const handleToggleCategory = async (category: KitchenMenuCategory) => {
    if (!restaurantId) {
      setError('Restaurant context is not available yet.');
      return;
    }

    setError('');
    setCategorySaving(true);
    try {
      await updateKitchenMenuCategory(restaurantId, String(category.id), {
        ...buildMenuCategoryPayload(toMenuCategoryForm(category)),
        is_active: !category.isActive,
      });
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update category');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleImportCsv = async () => {
    if (!restaurantId) {
      setError('Restaurant context is not available yet.');
      return;
    }
    if (!csvText.trim()) {
      setError('Paste CSV before importing.');
      return;
    }

    setCsvImporting(true);
    setError('');
    try {
      await importKitchenMenuCsv(restaurantId, csvText);
      setCsvText('');
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import CSV');
    } finally {
      setCsvImporting(false);
    }
  };

  const handleRefresh = () => {
    void loadMenu();
  };

  return (
    <Page backgroundColor={LIGHT_BG}>
      <View style={styles.menuTopBar}>
        <View style={styles.iconSlot}>
          <Ionicons name="menu-outline" size={20} color="#295638" />
        </View>
        <Text style={styles.menuTopTitle}>Menu</Text>
        <Pressable onPress={handleRefresh} style={styles.iconButton}>
          <Ionicons name="search-outline" size={18} color="#295638" />
        </Pressable>
      </View>

      <View style={styles.switchRow}>
        <Pressable onPress={() => replaceRoute(router, '/kitchen/orders')} style={styles.switchChip}>
          <Text style={styles.switchChipText}>Orders</Text>
        </Pressable>
        <View style={[styles.switchChip, styles.switchChipActive]}>
          <Text style={[styles.switchChipText, styles.switchChipTextActive]}>Menu Management</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <EmptyState
          title="Loading menu..."
          subtitle="Fetching menu items and categories."
          style={styles.emptyState}
          titleStyle={styles.emptyTitle}
          subtitleStyle={styles.emptySubtitle}
        />
      ) : null}

      {!loading ? (
        <>
          <Card style={styles.railCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionEyebrow}>Category</Text>
                <Text style={styles.sectionTitle}>Popular</Text>
                <Text style={styles.helperText}>{categoryLine}</Text>
              </View>
              <Button
                title="+ Add item"
                variant="primary"
                compact
                fullWidth={false}
                style={styles.primaryButton}
                textStyle={styles.primaryButtonText}
                onPress={openNewItemEditor}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railPills}>
              {categories.length ? (
                categories.map((category) => (
                  <View key={String(category.id)} style={styles.railPill}>
                    <Text style={styles.railPillText}>{category.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.helperText}>No categories yet</Text>
              )}
            </ScrollView>
          </Card>

          {showItemEditor || editingItemId ? (
            <Card style={styles.lightCard}>
              <SectionTitle
                eyebrow="Item editor"
                title={editingItemId ? 'Edit menu item' : 'Create menu item'}
                subtitle="Save name, price, category, image URL, and availability."
              />
              <Field label="Name" value={itemForm.name} onChangeText={(value) => setItemForm((current) => ({ ...current, name: value }))} placeholder="Mysore Dosa" />
              <View style={styles.fieldGrid}>
                <Field
                  label="Price"
                  value={itemForm.price}
                  onChangeText={(value) => setItemForm((current) => ({ ...current, price: value }))}
                  placeholder="10.99"
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
                <Field
                  label="Display order"
                  value={itemForm.displayOrder}
                  onChangeText={(value) => setItemForm((current) => ({ ...current, displayOrder: value }))}
                  placeholder="1"
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
              </View>
              <Field
                label="Description"
                value={itemForm.description}
                onChangeText={(value) => setItemForm((current) => ({ ...current, description: value }))}
                placeholder="Short description"
                multiline
              />
              <Field
                label="Image URL"
                value={itemForm.imageUrl}
                onChangeText={(value) => setItemForm((current) => ({ ...current, imageUrl: value }))}
                placeholder="https://..."
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setItemForm((current) => ({ ...current, categoryId: '' }))}
                  style={[styles.categoryChip, !itemForm.categoryId && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, !itemForm.categoryId && styles.categoryChipTextActive]}>Uncategorized</Text>
                </Pressable>
                {categories.map((category) => {
                  const active = String(category.id) === itemForm.categoryId;
                  return (
                    <Pressable
                      key={String(category.id)}
                      onPress={() => setItemForm((current) => ({ ...current, categoryId: String(category.id) }))}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{category.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setItemForm((current) => ({ ...current, isAvailable: !current.isAvailable }))}
                  style={[styles.togglePill, itemForm.isAvailable && styles.togglePillActive]}
                >
                  <Text style={[styles.toggleText, itemForm.isAvailable && styles.toggleTextActive]}>
                    {itemForm.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setItemForm((current) => ({ ...current, isVegetarian: !current.isVegetarian }))}
                  style={[styles.togglePill, itemForm.isVegetarian && styles.togglePillActive]}
                >
                  <Text style={[styles.toggleText, itemForm.isVegetarian && styles.toggleTextActive]}>Vegetarian</Text>
                </Pressable>
                <Pressable
                  onPress={() => setItemForm((current) => ({ ...current, isVegan: !current.isVegan }))}
                  style={[styles.togglePill, itemForm.isVegan && styles.togglePillActive]}
                >
                  <Text style={[styles.toggleText, itemForm.isVegan && styles.toggleTextActive]}>Vegan</Text>
                </Pressable>
              </View>

              <View style={styles.actionRow}>
                <Button
                  title={itemSaving ? 'Saving…' : editingItemId ? 'Update item' : 'Add item'}
                  onPress={() => void handleItemSave()}
                  loading={itemSaving}
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonText}
                />
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    resetItemForm();
                    setShowItemEditor(false);
                  }}
                  style={styles.ghostButton}
                  textStyle={styles.ghostButtonText}
                />
              </View>
            </Card>
          ) : null}

          {showCategoryEditor || editingCategoryId ? (
            <Card style={styles.lightCard}>
              <SectionTitle
                eyebrow="Category editor"
                title={editingCategoryId ? 'Edit category' : 'Create category'}
                subtitle="Manage the groups used to organize the menu."
              />
              <Field label="Name" value={categoryForm.name} onChangeText={(value) => setCategoryForm((current) => ({ ...current, name: value }))} placeholder="Starters" />
              <Field
                label="Display order"
                value={categoryForm.displayOrder}
                onChangeText={(value) => setCategoryForm((current) => ({ ...current, displayOrder: value }))}
                placeholder="1"
                keyboardType="numeric"
              />
              <Pressable
                onPress={() => setCategoryForm((current) => ({ ...current, isActive: !current.isActive }))}
                style={[styles.togglePill, categoryForm.isActive && styles.togglePillActive]}
              >
                <Text style={[styles.toggleText, categoryForm.isActive && styles.toggleTextActive]}>
                  {categoryForm.isActive ? 'Active' : 'Hidden'}
                </Text>
              </Pressable>
              <View style={styles.actionRow}>
                <Button
                  title={categorySaving ? 'Saving…' : editingCategoryId ? 'Update category' : 'Add category'}
                  onPress={() => void handleCategorySave()}
                  loading={categorySaving}
                  style={styles.primaryButton}
                  textStyle={styles.primaryButtonText}
                />
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    resetCategoryForm();
                    setShowCategoryEditor(false);
                  }}
                  style={styles.ghostButton}
                  textStyle={styles.ghostButtonText}
                />
              </View>
            </Card>
          ) : null}

          <Card style={styles.lightCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionEyebrow}>Categories</Text>
                <Text style={styles.sectionTitle}>Popular</Text>
                <Text style={styles.helperText}>{categoryLine}</Text>
              </View>
              <Button
                title="+ Add"
                variant="secondary"
                compact
                fullWidth={false}
                style={styles.secondaryButton}
                textStyle={styles.secondaryButtonText}
                onPress={openNewCategoryEditor}
              />
            </View>

            <View style={styles.categoryList}>
              {categories.length ? (
                categories.map((category) => (
                  <View key={String(category.id)} style={styles.categoryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.categoryTitle}>{category.name}</Text>
                      <Text style={styles.categoryMeta}>
                        Order {category.displayOrder} • {category.isActive ? 'Active' : 'Hidden'}
                      </Text>
                    </View>
                    <View style={styles.rowActions}>
                      <Button
                        title="Edit"
                        variant="secondary"
                        compact
                        fullWidth={false}
                        style={styles.secondaryButton}
                        textStyle={styles.secondaryButtonText}
                        onPress={() => handleEditCategory(category)}
                      />
                      <Button
                        title={category.isActive ? 'Hide' : 'Show'}
                        variant={category.isActive ? 'ghost' : 'primary'}
                        compact
                        fullWidth={false}
                        loading={categorySaving}
                        style={category.isActive ? styles.ghostButton : styles.primaryButton}
                        textStyle={category.isActive ? styles.ghostButtonText : styles.primaryButtonText}
                        onPress={() => void handleToggleCategory(category)}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  title="No categories yet"
                  subtitle="Create your first category to start organizing the menu."
                  style={styles.emptyState}
                  titleStyle={styles.emptyTitle}
                  subtitleStyle={styles.emptySubtitle}
                />
              )}
            </View>
          </Card>

          <Card style={styles.lightCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionEyebrow}>Menu</Text>
                <Text style={styles.sectionTitle}>Items</Text>
                <Text style={styles.helperText}>{items.length ? `${items.length} item${items.length === 1 ? '' : 's'} loaded.` : 'No items loaded yet.'}</Text>
              </View>
              <Button
                title="+ Add item"
                variant="primary"
                compact
                fullWidth={false}
                style={styles.primaryButton}
                textStyle={styles.primaryButtonText}
                onPress={openNewItemEditor}
              />
            </View>

            <Field label="Search" value={searchQuery} onChangeText={setSearchQuery} placeholder="Search menu items" />
            <View style={styles.filterRow}>
              {MENU_FILTERS.map((filter) => (
                <Pressable
                  key={filter.value}
                  onPress={() => setMenuFilter(filter.value)}
                  style={[styles.filterChip, menuFilter === filter.value && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, menuFilter === filter.value && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Divider />

            {filteredGroups.length ? (
              filteredGroups.map((group) => (
                <View key={group.key} style={styles.groupBlock}>
                  <View style={styles.groupHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupTitle}>{group.title}</Text>
                      <Text style={styles.helperText}>
                        {group.items.length} item{group.items.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Button
                      title="+ Item"
                      variant="secondary"
                      compact
                      fullWidth={false}
                      style={styles.secondaryButton}
                      textStyle={styles.secondaryButtonText}
                      onPress={openNewItemEditor}
                    />
                  </View>

                  <View style={styles.itemList}>
                    {group.items.map((item) => (
                      <View key={String(item.id)} style={[styles.itemCard, !item.isAvailable && styles.itemCardDisabled]}>
                        <View style={styles.itemTopRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemMeta}>{formatMenuItemSubtitle(item, group.title)}</Text>
                            <Text style={styles.itemPrice}>{formatMenuPrice(item.price)}</Text>
                          </View>
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
                          ) : (
                            <View style={styles.thumbnailPlaceholder} />
                          )}
                        </View>

                        <View style={styles.itemFlags}>
                          <Chip
                            label={item.isAvailable ? 'Available' : 'Unavailable'}
                            style={item.isAvailable ? styles.availableChip : styles.unavailableChip}
                            textStyle={item.isAvailable ? styles.availableChipText : styles.unavailableChipText}
                          />
                          {item.isVegetarian ? (
                            <Chip label="Vegetarian" style={styles.metaChip} textStyle={styles.metaChipText} />
                          ) : null}
                          {item.isVegan ? (
                            <Chip label="Vegan" style={styles.metaChip} textStyle={styles.metaChipText} />
                          ) : null}
                        </View>

                        <View style={styles.itemActions}>
                          <Button
                            title="Edit"
                            variant="secondary"
                            compact
                            fullWidth={false}
                            style={styles.secondaryButton}
                            textStyle={styles.secondaryButtonText}
                            onPress={() => handleEditItem(item)}
                          />
                          <Button
                            title={item.isAvailable ? 'Disable' : 'Enable'}
                            variant={item.isAvailable ? 'ghost' : 'primary'}
                            compact
                            fullWidth={false}
                            loading={togglingId === String(item.id)}
                            style={item.isAvailable ? styles.ghostButton : styles.primaryButton}
                            textStyle={item.isAvailable ? styles.ghostButtonText : styles.primaryButtonText}
                            onPress={() => void handleToggleItemAvailability(item)}
                          />
                          <Button
                            title="Delete"
                            variant="danger"
                            compact
                            fullWidth={false}
                            loading={deletingId === String(item.id)}
                            style={styles.deleteButton}
                            textStyle={styles.deleteButtonText}
                            onPress={() => handleDeleteItem(item)}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                title="No menu items found"
                subtitle="Use the item editor above to add items."
                style={styles.emptyState}
                titleStyle={styles.emptyTitle}
                subtitleStyle={styles.emptySubtitle}
              />
            )}
          </Card>

          <Card style={styles.lightCard}>
            <SectionTitle
              eyebrow="CSV import"
              title="Paste CSV to import"
              subtitle="Use columns like name, price, category, description, image_url, is_available."
            />
            <TextInput
              value={csvText}
              onChangeText={setCsvText}
              placeholder="name,price,category\nMysore Dosa,10.49,Breakfast"
              placeholderTextColor="#8ca0be"
              multiline
              style={styles.csvInput}
            />
            <Text style={styles.helperText}>
              {csvRowCount ? `${csvRowCount} row${csvRowCount === 1 ? '' : 's'} ready to import.` : 'Paste CSV text from your spreadsheet or export.'}
            </Text>
            <View style={styles.actionRow}>
              <Button
                title={csvImporting ? 'Importing…' : 'Import CSV'}
                onPress={() => void handleImportCsv()}
                loading={csvImporting}
                style={styles.primaryButton}
                textStyle={styles.primaryButtonText}
              />
              <Button
                title="Clear CSV"
                variant="ghost"
                onPress={() => setCsvText('')}
                style={styles.ghostButton}
                textStyle={styles.ghostButtonText}
              />
            </View>
          </Card>
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9e0',
    borderRadius: 14,
    padding: 5,
  },
  menuTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: 2,
    marginBottom: 4,
  },
  iconSlot: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTopTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf5ef',
    borderWidth: 1,
    borderColor: '#d7e7da',
  },
  switchChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
  },
  switchChipActive: {
    backgroundColor: '#eef6ef',
    borderWidth: 1,
    borderColor: '#d2e4d6',
  },
  switchChipText: {
    color: '#758190',
    fontSize: 13,
    fontWeight: '700',
  },
  switchChipTextActive: {
    color: '#295638',
  },
  railCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5eaf0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  railPills: {
    gap: 8,
    paddingRight: 4,
  },
  railPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#f7faf8',
    borderWidth: 1,
    borderColor: '#d9e3da',
  },
  railPillText: {
    color: '#295638',
    fontWeight: '700',
  },
  lightCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5eaf0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  notice: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fff4f4',
    borderWidth: 1,
    borderColor: '#f2c1c1',
  },
  noticeText: {
    color: '#c85a5a',
    fontWeight: '700',
  },
  helperText: {
    color: '#6f7c8b',
    marginTop: 3,
    lineHeight: 17,
    fontSize: 12,
  },
  label: {
    color: '#1f2937',
    fontWeight: '700',
    marginBottom: 6,
    fontSize: 12,
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  chipRow: {
    gap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7dee5',
    backgroundColor: '#f7faf8',
  },
  categoryChipActive: {
    backgroundColor: '#eaf5ec',
    borderColor: '#bcd6c2',
  },
  categoryChipText: {
    color: '#667587',
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#295638',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  togglePill: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7dee5',
    backgroundColor: '#f7faf8',
  },
  togglePillActive: {
    backgroundColor: '#eaf5ec',
    borderColor: '#bcd6c2',
  },
  toggleText: {
    color: '#667587',
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#295638',
  },
  primaryButton: {
    backgroundColor: '#4f9d69',
    borderColor: '#4f9d69',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#eef4f0',
    borderColor: '#d7e3d9',
  },
  secondaryButtonText: {
    color: '#295638',
  },
  ghostButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e2d9',
  },
  ghostButtonText: {
    color: '#4f6b55',
  },
  deleteButton: {
    backgroundColor: '#c85a5a',
    borderColor: '#c85a5a',
  },
  deleteButtonText: {
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  sectionEyebrow: {
    color: '#4f9d69',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 10,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  categoryList: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#fdfdfd',
    borderWidth: 1,
    borderColor: '#e5eaf0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  categoryTitle: {
    color: '#1f2937',
    fontWeight: '800',
    fontSize: 14,
  },
  categoryMeta: {
    color: '#74808f',
    marginTop: 2,
    fontSize: 11,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  groupBlock: {
    gap: 12,
    marginTop: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  groupTitle: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '800',
  },
  itemList: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eaf0',
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 1,
  },
  itemCardDisabled: {
    opacity: 0.72,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#edf2ee',
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#edf2ee',
  },
  itemName: {
    color: '#1f2937',
    fontWeight: '800',
    fontSize: 14,
  },
  itemMeta: {
    color: '#6f7c8b',
    marginTop: 2,
    fontSize: 11,
  },
  itemPrice: {
    color: '#295638',
    fontWeight: '800',
    marginTop: 6,
    fontSize: 14,
  },
  itemFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availableChip: {
    backgroundColor: '#eaf5ec',
    borderColor: '#bcd6c2',
  },
  unavailableChip: {
    backgroundColor: '#f1f5f9',
    borderColor: '#d8e0e8',
  },
  availableChipText: {
    color: '#295638',
  },
  unavailableChipText: {
    color: '#607080',
  },
  metaChip: {
    backgroundColor: '#f1f5f9',
    borderColor: '#d8e0e8',
  },
  metaChipText: {
    color: '#607080',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f7faf8',
    borderWidth: 1,
    borderColor: '#d7dee5',
  },
  filterChipActive: {
    backgroundColor: '#eaf5ec',
    borderColor: '#bcd6c2',
  },
  filterChipText: {
    color: '#667587',
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#295638',
  },
  csvInput: {
    minHeight: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7dee5',
    backgroundColor: '#f9fbfa',
    color: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderColor: '#e5eaf0',
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 1,
  },
  emptyTitle: {
    color: '#1f2937',
  },
  emptySubtitle: {
    color: '#6f7c8b',
  },
});
