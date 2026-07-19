import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { CategoryModel, StyleModel, TagModel, StyleField } from '../types';
import { Loader } from '../components/Loader';
import { Modal } from '../components/Modal';
import { ImageUploader } from '../components/ImageUploader';
import { TagInput } from '../components/TagInput';
import { FieldsEditor } from '../components/FieldsEditor';
import { PromptPreview } from '../components/PromptPreview';

export const StyleManagerPage: React.FC = () => {
  // Main Lists State
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [styles, setStyles] = useState<StyleModel[]>([]);
  const [tags, setTags] = useState<TagModel[]>([]);

  // Loading & Error States
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isStylesLoading, setIsStylesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [stylesError, setStylesError] = useState<string | null>(null);

  // Active Category State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // "all" or specific category ID
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled' | 'trending' | 'premium'>('all');
  const [sortBy, setSortBy] = useState<'sort_order' | 'name_asc' | 'name_desc' | 'credits_asc' | 'credits_desc'>('sort_order');

  // Action Statuses
  const [actionError, setActionError] = useState<string | null>(null);

  // Transient success/error toast for the quick toggle actions
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Shared confirmation dialog (replaces native confirm())
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Category Modals & Fields
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryModel | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEnabled, setCategoryEnabled] = useState(true);

  // Style Modals & Fields
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<StyleModel | null>(null);
  const [styleName, setStyleName] = useState('');
  const [styleCategory, setStyleCategory] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [styleNegativePrompt, setStyleNegativePrompt] = useState('');
  const [styleCreditCost, setStyleCreditCost] = useState(1);
  const [styleMinImages, setStyleMinImages] = useState(1);
  const [styleMaxImages, setStyleMaxImages] = useState(1);
  const [styleCoverImage, setStyleCoverImage] = useState('');
  const [styleTrending, setStyleTrending] = useState(false);
  const [stylePremium, setStylePremium] = useState(false);
  const [styleEnabled, setStyleEnabled] = useState(true);
  const [styleTagIds, setStyleTagIds] = useState<string[]>([]);
  const [styleFields, setStyleFields] = useState<StyleField[]>([]);

  // Tag Manager Modal & Fields
  const [showTagManagerModal, setShowTagManagerModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagManagerError, setTagManagerError] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagEnabled, setEditingTagEnabled] = useState(true);

  // Preview Prompt Modal & Fields
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewStylePrompt, setPreviewStylePrompt] = useState('');
  const [previewSampleImage, setPreviewSampleImage] = useState('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState('');
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // 'current' hits the existing generator (sample photo required); 'stability'
  // hits the Stability AI admin test endpoint (text-to-image, no photo used).
  const [previewProvider, setPreviewProvider] = useState<'current' | 'stability'>('current');

  // Fullscreen Image Preview Modal State
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePreviewImage(null);
      }
    };
    if (activePreviewImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePreviewImage]);

  // Fetch initial data
  const fetchCategories = async () => {
    setIsCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await apiService.getCategories();
      // Sort by sortOrder initially
      const sorted = [...data].sort((a, b) => a.sortOrder - b.sortOrder);
      setCategories(sorted);
      if (sorted.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(sorted[0].id);
      }
    } catch (err: any) {
      setCategoriesError(err.message || 'Failed to load categories.');
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const fetchStyles = async () => {
    setIsStylesLoading(true);
    setStylesError(null);
    try {
      const data = await apiService.getStyles();
      setStyles(data);
    } catch (err: any) {
      setStylesError(err.message || 'Failed to load styles.');
    } finally {
      setIsStylesLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await apiService.getTags();
      setTags(data);
    } catch (err: any) {
      // Non-fatal: tags only affect the (optional) tagging UI, not the
      // core style catalog, so a failure here shouldn't block the page.
      console.error('Failed to load tags.', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchStyles();
    fetchTags();
  }, []);

  // HTML5 Drag & Drop Category Reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetId: string, targetIndex: number) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId === targetId) return;

    const draggedIdx = categories.findIndex((c) => c.id === draggedId);
    if (draggedIdx === -1) return;

    // Optimistic UI update
    const previousCategories = [...categories];
    const updatedCategories = [...categories];
    const [removed] = updatedCategories.splice(draggedIdx, 1);
    updatedCategories.splice(targetIndex, 0, removed);

    // Update state order
    const finalCategories = updatedCategories.map((c, i) => ({
      ...c,
      sortOrder: i + 1,
    }));
    setCategories(finalCategories);

    // Save order changes in background for each affected category
    try {
      await apiService.reorderCategories(
        finalCategories.map((category) => ({
          id: category.id,
          sortOrder: category.sortOrder,
        }))
      );
    } catch (err) {
      setCategories(previousCategories);
      setActionError("Failed to persist category order. Reverting to previous order.");
    }
  };

  // HTML5 Drag & Drop Style Reordering
  const handleStyleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/style-id', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStyleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStyleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/style-id');
    if (!draggedId || draggedId === targetId) return;

    const draggedIdx = styles.findIndex((s) => s.id === draggedId);
    const targetIdx = styles.findIndex((s) => s.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    // Optimistic UI updates
    const previousStyles = [...styles];
    const updatedStyles = [...styles];
    const [removed] = updatedStyles.splice(draggedIdx, 1);
    updatedStyles.splice(targetIdx, 0, removed);

    // Update sortOrder values optimistically
    const finalStyles = updatedStyles.map((s, idx) => ({
      ...s,
      sortOrder: idx + 1
    }));
    setStyles(finalStyles);

    try {
      const currentCategoryId = styles[draggedIdx].categoryId;
      const reorderedStyles = finalStyles.filter(s => s.categoryId === currentCategoryId);

      await apiService.reorderStyles(
        reorderedStyles.map((style, index) => ({
          id: style.id,
          sortOrder: index + 1,
        }))
      );
    } catch (err: any) {
      setStyles(previousStyles);
      setActionError(err.message || 'Failed to reorder styles. Reverting to previous order.');
    }
  };

  // --- Category Actions ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryEnabled(true);
    setActionError(null);
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: CategoryModel) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryEnabled(cat.isEnabled);
    setActionError(null);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    setActionError(null);
    if (!categoryName.trim()) {
      setActionError('Category name is required.');
      return;
    }

    try {
      if (editingCategory) {
        // Update
        const updated = await apiService.updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          isEnabled: categoryEnabled,
          sortOrder: typeof editingCategory.sortOrder === 'number' ? editingCategory.sortOrder : 0,
        });
        setCategories(categories.map((c) => (c.id === editingCategory.id ? updated : c)));
      } else {
        // Add
        const newCat = await apiService.addCategory(
  categoryName.trim(),
  categoryEnabled
);
        setCategories([...categories, newCat]);
      }
      setShowCategoryModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Error occurred saving category.');
    }
  };

  const handleDeleteCategory = (id: string) => {
    setConfirmDialog({
      message: 'Are you sure you want to archive/delete this category? Styles under this category will remain, but you should re-assign them.',
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionError(null);
        try {
          await apiService.deleteCategory(id);
          setCategories(categories.filter((c) => c.id !== id));
          if (selectedCategoryId === id) {
            setSelectedCategoryId(categories.find((c) => c.id !== id)?.id || '');
          }
        } catch (err: any) {
          setActionError(err.message || 'Error deleting category.');
        }
      },
    });
  };

  // --- Style Actions ---
  const handleOpenAddStyle = () => {
    setEditingStyle(null);
    setStyleName('');
    setStyleCategory(selectedCategoryId || categories[0]?.id || '');
    setStylePrompt('');
    setStyleNegativePrompt('');
    setStyleCreditCost(1);
    setStyleMinImages(1);
    setStyleMaxImages(1);
    setStyleCoverImage('');
    setStyleTrending(false);
    setStylePremium(false);
    setStyleEnabled(true);
    setStyleTagIds([]);
    setStyleFields([]);
    setActionError(null);
    setShowStyleModal(true);
  };

  const handleOpenEditStyle = (style: StyleModel) => {
    setEditingStyle(style);
    setStyleName(style.name);
    setStyleCategory(style.categoryId);
    setStylePrompt(style.prompt);
    setStyleNegativePrompt(style.negativePrompt || '');
    setStyleCreditCost(style.creditCost || 1);
    setStyleMinImages(style.minImages || 1);
    setStyleMaxImages(style.maxImages || 1);
    setStyleCoverImage(style.coverImage || '');
    setStyleTrending(style.isTrending);
    setStylePremium(style.isPremium);
    setStyleEnabled(style.isEnabled);
    setStyleTagIds(style.tagIds || []);
    setStyleFields(((style as StyleModel & { fields?: StyleField[] }).fields) || []);
    setActionError(null);
    setShowStyleModal(true);
  };

  const handleSaveStyle = async () => {
    setActionError(null);
    if (!styleName.trim()) {
      setActionError('Style name is required.');
      return;
    }
    if (!stylePrompt.trim()) {
      setActionError('AI Prompt is required.');
      return;
    }

    // Validate dynamic fields before hitting the API (the backend also
    // enforces this, but a local check gives instant feedback).
    const seenKeys = new Set<string>();
    for (const f of styleFields) {
      if (!/^[a-z][a-z0-9_]*$/.test(f.key)) {
        setActionError(`Field key "${f.key || '(empty)'}" must be lower_snake_case.`);
        return;
      }
      if (!f.label.trim()) {
        setActionError(`Field "${f.key}" needs a label.`);
        return;
      }
      if (seenKeys.has(f.key)) {
        setActionError(`Duplicate field key "${f.key}".`);
        return;
      }
      seenKeys.add(f.key);
      if (f.type === 'dropdown' && (!f.options || f.options.length === 0)) {
        setActionError(`Dropdown field "${f.key}" needs at least one option.`);
        return;
      }
    }

    // Block saving if the prompt references a placeholder with no matching
    // field (the backend enforces this too; this is for instant feedback).
    const placeholderRe = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const referenced = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = placeholderRe.exec(stylePrompt)) !== null) referenced.add(match[1]);
    const missing = [...referenced].filter((k) => !seenKeys.has(k));
    if (missing.length > 0) {
      setActionError(`Prompt uses ${missing.map((k) => `{{${k}}}`).join(', ')} with no matching field. Add a field for each.`);
      return;
    }

    if (!Number.isInteger(styleMinImages) || styleMinImages < 1) {
      setActionError('Minimum Images must be at least 1.');
      return;
    }
    if (!Number.isInteger(styleMaxImages) || styleMaxImages < styleMinImages) {
      setActionError('Maximum Images must be greater than or equal to Minimum Images.');
      return;
    }
    if (styleMaxImages > 5) {
      setActionError('Maximum Images cannot exceed 5.');
      return;
    }

    const payload = {
      name: styleName.trim(),
      categoryId: styleCategory,
      prompt: stylePrompt.trim(),
      negativePrompt: styleNegativePrompt.trim() || undefined,
      creditCost: styleCreditCost,
      minImages: styleMinImages,
      maxImages: styleMaxImages,
      coverImage: styleCoverImage,
      isTrending: styleTrending,
      isPremium: stylePremium,
      isEnabled: styleEnabled,
      tagIds: styleTagIds,
      fields: styleFields.map((f, i) => ({ ...f, sortOrder: i })),
    };

    try {
      if (editingStyle) {
        // Edit Style - preserve the existing sortOrder so saving an edit
        // doesn't reset the style's drag-and-drop position (it's otherwise
        // absent from payload, and the backend defaults it to 0).
        const updated = await apiService.updateStyle(editingStyle.id, {
          ...payload,
          sortOrder: typeof editingStyle.sortOrder === 'number' ? editingStyle.sortOrder : 0,
        });
        setStyles(styles.map((s) => (s.id === editingStyle.id ? updated : s)));
      } else {
        // Add / Duplicate
        const created = await apiService.addStyle(payload);
        setStyles([...styles, created]);
      }
      setShowStyleModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Error saving style preset.');
    }
  };

  const handleDeleteStyle = (id: string) => {
    setConfirmDialog({
      message: 'Are you sure you want to archive/delete this style?',
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionError(null);
        try {
          await apiService.deleteStyle(id);
          setStyles(styles.filter((s) => s.id !== id));
        } catch (err: any) {
          setActionError(err.message || 'Error deleting style preset.');
        }
      },
    });
  };

  const handleToggleStyleEnabled = async (style: StyleModel) => {
    const nextEnabled = !style.isEnabled;
    // Optimistic flip, reverted on failure (same pattern as drag & drop reorder).
    const previousStyles = styles;
    setStyles(styles.map((s) => (s.id === style.id ? { ...s, isEnabled: nextEnabled } : s)));
    try {
      const updated = await apiService.patchStyleFlags(style.id, { isEnabled: nextEnabled });
      setStyles((current) => current.map((s) => (s.id === style.id ? updated : s)));
      setToast({ type: 'success', message: `"${style.name}" ${nextEnabled ? 'enabled' : 'disabled'}.` });
    } catch (err: any) {
      setStyles(previousStyles);
      setToast({ type: 'error', message: err.message || 'Failed to update status.' });
    }
  };

  const handleToggleStyleTrending = async (style: StyleModel) => {
    const nextTrending = !style.isTrending;
    // Optimistic flip, reverted on failure (same pattern as drag & drop reorder).
    const previousStyles = styles;
    setStyles(styles.map((s) => (s.id === style.id ? { ...s, isTrending: nextTrending } : s)));
    try {
      const updated = await apiService.patchStyleFlags(style.id, { isTrending: nextTrending });
      setStyles((current) => current.map((s) => (s.id === style.id ? updated : s)));
      setToast({ type: 'success', message: `"${style.name}" ${nextTrending ? 'marked as trending' : 'removed from trending'}.` });
    } catch (err: any) {
      setStyles(previousStyles);
      setToast({ type: 'error', message: err.message || 'Failed to update status.' });
    }
  };

  // --- Tag Manager Actions ---
  const handleOpenTagManager = () => {
    setNewTagName('');
    setTagManagerError(null);
    setEditingTagId(null);
    setShowTagManagerModal(true);
  };

  const handleAddTag = async () => {
    setTagManagerError(null);
    if (!newTagName.trim()) {
      setTagManagerError('Tag name is required.');
      return;
    }
    try {
      const created = await apiService.addTag({ name: newTagName.trim(), isEnabled: true });
      setTags([...tags, created]);
      setNewTagName('');
    } catch (err: any) {
      setTagManagerError(err.message || 'Error creating tag.');
    }
  };

  const handleStartEditTag = (tag: TagModel) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagEnabled(tag.isEnabled);
    setTagManagerError(null);
  };

  const handleSaveEditTag = async () => {
    if (!editingTagId) return;
    setTagManagerError(null);
    if (!editingTagName.trim()) {
      setTagManagerError('Tag name is required.');
      return;
    }
    try {
      const updated = await apiService.updateTag(editingTagId, {
        name: editingTagName.trim(),
        isEnabled: editingTagEnabled,
      });
      setTags(tags.map((t) => (t.id === editingTagId ? updated : t)));
      setEditingTagId(null);
    } catch (err: any) {
      setTagManagerError(err.message || 'Error updating tag.');
    }
  };

  const handleDeleteTag = (id: string) => {
    setConfirmDialog({
      message: 'Delete this tag? It will be removed from every style it is currently assigned to.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiService.deleteTag(id);
          setTags(tags.filter((t) => t.id !== id));
        } catch (err: any) {
          setTagManagerError(err.message || 'Error deleting tag.');
        }
      },
    });
  };

  // --- Style Prompt Preview Trigger ---
  const handleOpenPreviewModal = (prompt: string) => {
    setPreviewStylePrompt(prompt);
    setPreviewSampleImage('');
    setPreviewFile(null);
    setGeneratedPreviewUrl('');
    setPreviewError(null);
    setIsPreviewGenerating(false);
    setPreviewProvider('current');
    setShowPreviewModal(true);
  };

  const handlePreviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFile(file);
      setPreviewSampleImage(URL.createObjectURL(file));
      setPreviewError(null);
    }
  };

  const handleGeneratePreview = async () => {
    if (previewProvider === 'current' && !previewFile) {
      setPreviewError('Please choose a sample photo to upload first.');
      return;
    }
    if (!previewStylePrompt.trim()) {
      setPreviewError('Prompt is required.');
      return;
    }

    setIsPreviewGenerating(true);
    setPreviewError(null);
    setGeneratedPreviewUrl('');

    try {
      if (previewProvider === 'stability') {
        const response = await apiService.previewStabilityStyle(previewStylePrompt);
        setGeneratedPreviewUrl(response.imageUrl);
      } else {
        const response = await apiService.previewStyle(previewStylePrompt, previewFile!);
        setGeneratedPreviewUrl(response.generatedImageUrl);
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Generation preview failed. Check if API is running.');
    } finally {
      setIsPreviewGenerating(false);
    }
  };

  // --- Filter and Sort computations ---
  const filteredAndSortedStyles = useMemo(() => {
    // 1. Search Query
    let result = styles.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // 2. Category Filter (Priority: Dropdown selector, then Sidebar fallback)
    if (filterCategory === 'all') {
      if (selectedCategoryId) {
        result = result.filter((s) => s.categoryId === selectedCategoryId);
      }
    } else {
      result = result.filter((s) => s.categoryId === filterCategory);
    }

    // 2b. Status Filter
    switch (filterStatus) {
      case 'enabled':
        result = result.filter((s) => s.isEnabled);
        break;
      case 'disabled':
        result = result.filter((s) => !s.isEnabled);
        break;
      case 'trending':
        result = result.filter((s) => s.isTrending);
        break;
      case 'premium':
        result = result.filter((s) => s.isPremium);
        break;
    }

    // 3. Sort Order
    result.sort((a, b) => {
      switch (sortBy) {
        case 'sort_order':
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'credits_asc':
          return a.creditCost - b.creditCost;
        case 'credits_desc':
          return b.creditCost - a.creditCost;
        default:
          return 0;
      }
    });

    return result;
  }, [styles, selectedCategoryId, searchQuery, filterCategory, filterStatus, sortBy]);

  const activeCategoryObject = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="preset-manager">
      {/* Category Panel */}
      <div className="category-panel">
        <div className="panel-header-with-action">
          <h3 className="panel-title">Categories</h3>
          <button className="icon-btn-text" onClick={handleOpenAddCategory} title="Add Category">
            <i className="fa-solid fa-folder-plus"></i> Add
          </button>
        </div>

        {categoriesError && (
          <div className="panel-error-alert">{categoriesError}</div>
        )}

        {isCategoriesLoading ? (
          <Loader type="skeleton-list" count={5} />
        ) : categories.length === 0 ? (
          <div className="empty-state-sidebar">No categories.</div>
        ) : (
          <div className="category-list">
            {categories.map((c, index) => (
              <div
                key={c.id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, c.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, c.id, index)}
                className={`category-item-draggable category-item ${
                  selectedCategoryId === c.id ? 'active' : ''
                } ${!c.isEnabled ? 'disabled-cat' : ''}`}
                onClick={() => {
                  setSelectedCategoryId(c.id);
                  setFilterCategory('all'); // reset general dropdown when clicking sidebar
                }}
              >
                <div className="category-drag-handle">
                  <i className="fa-solid fa-grip-vertical"></i>
                </div>
                <span className="category-label-text">{c.name}</span>
                <div className="category-action-buttons">
                  <button
                    className="category-inline-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditCategory(c);
                    }}
                    title="Edit Category"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button
                    className="category-inline-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(c.id);
                    }}
                    title="Delete Category"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Styles Panel */}
      <div className="styles-panel">
        <div className="panel-title-row">
          <div className="title-left">
            <h2>
              {activeCategoryObject ? activeCategoryObject.name : 'Choose Category'}
              {activeCategoryObject && !activeCategoryObject.isEnabled && (
                <span className="badge success" style={{ marginLeft: '12px', background: '#3f3f46', color: '#a1a1aa' }}>
                  Archived/Disabled
                </span>
              )}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn secondary" onClick={handleOpenTagManager}>
              <i className="fa-solid fa-tags"></i> Manage Tags
            </button>
            <button className="btn" onClick={handleOpenAddStyle}>
              <i className="fa-solid fa-plus"></i> Add Style Preset
            </button>
          </div>
        </div>

        {/* Search, Filtering, and Sorting Header */}
        <div className="filter-controls-bar">
          <div className="search-box-container">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              placeholder="Search style names or prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="select-filters-group">
            <div className="filter-dropdown">
              <label>Category Filter</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Active Category Only ({activeCategoryObject?.name || 'None'})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-dropdown">
              <label>Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All Styles</option>
                <option value="enabled">Enabled Only</option>
                <option value="disabled">Disabled Only</option>
                <option value="trending">Trending Only</option>
                <option value="premium">Premium Only</option>
              </select>
            </div>

            <div className="filter-dropdown">
              <label>Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="sort_order">Custom Order (Drag & Drop)</option>
                <option value="name_asc">Name (A - Z)</option>
                <option value="name_desc">Name (Z - A)</option>
                <option value="credits_asc">Credits: Low to High</option>
                <option value="credits_desc">Credits: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {actionError && <div className="action-error-bar">{actionError}</div>}

        {stylesError && <div className="panel-error-alert">{stylesError}</div>}

        {isStylesLoading ? (
          <div className="presets-grid">
            <Loader type="skeleton-card" count={3} />
          </div>
        ) : filteredAndSortedStyles.length === 0 ? (
          <div className="empty-panel-styles">
            <i className="fa-regular fa-image empty-icon"></i>
            <h3>No Styles Found</h3>
            <p>Modify filters or click "Add Style Preset" to create one.</p>
          </div>
        ) : (
          <div className="presets-grid">
            {filteredAndSortedStyles.map((style) => (
              <div
                key={style.id}
                draggable="true"
                onDragStart={(e) => handleStyleDragStart(e, style.id)}
                onDragOver={handleStyleDragOver}
                onDrop={(e) => handleStyleDrop(e, style.id)}
                className={`preset-card ${!style.isEnabled ? 'disabled-preset' : ''}`}
              >
                <div className="preset-img-container">
                  {style.coverImage ? (
                    <img
                      src={style.coverImage}
                      alt={style.name}
                      className="preset-img preset-img-clickable"
                      loading="lazy"
                      onClick={() => setActivePreviewImage(style.coverImage)}
                    />
                  ) : (
                    <div className="preset-no-img">No Cover Image</div>
                  )}

                  <div className="preset-badge-row-top">
                    {style.isTrending && <span className="preset-badge-trending">Trending</span>}
                    {style.isPremium && <span className="preset-badge-pro">Premium</span>}
                    {!style.isEnabled && (
                      <span className="preset-badge-disabled">Disabled</span>
                    )}
                  </div>

                  {/* Actions overlay */}
                  <div className="preset-actions-overlay">
                    <button
                      className="icon-btn"
                      title={style.isTrending ? 'Remove Trending Star' : 'Mark as Trending'}
                      onClick={() => handleToggleStyleTrending(style)}
                    >
                      <i className="fa-solid fa-star" style={{ color: style.isTrending ? '#fbbf24' : 'white' }}></i>
                    </button>
                    <button
                      className="icon-btn"
                      title={style.isEnabled ? 'Disable Style' : 'Enable Style'}
                      onClick={() => handleToggleStyleEnabled(style)}
                    >
                      {style.isEnabled ? (
                        <i className="fa-solid fa-eye" style={{ color: 'var(--success)' }}></i>
                      ) : (
                        <i className="fa-solid fa-eye-slash" style={{ color: 'var(--text-muted)' }}></i>
                      )}
                    </button>
                    <button
                      className="icon-btn"
                      title="Edit Preset Settings"
                      onClick={() => handleOpenEditStyle(style)}
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      className="icon-btn delete"
                      title="Archive/Delete Preset"
                      onClick={() => handleDeleteStyle(style.id)}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>

                <div className="preset-info">
                  <div className="preset-header-row">
                    <h4 className="preset-name">{style.name}</h4>
                    <span className="credits-badge">
                      <i className="fa-solid fa-coins"></i> {style.creditCost} credits
                    </span>
                  </div>

                  <div className="preset-prompt-box">
                    <strong>Prompt:</strong>
                    <div className="prompt-content-scroll">{style.prompt}</div>
                  </div>

                  {style.negativePrompt && (
                    <div className="preset-prompt-box negative">
                      <strong>Negative Prompt:</strong>
                      <div className="prompt-content-scroll">{style.negativePrompt}</div>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                    <button
                      className="btn secondary btn-small w-100"
                      onClick={() => handleOpenPreviewModal(style.prompt)}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles"></i> Preview Style Prompt
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Category Modal --- */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        size="small"
      >
        <div className="form-layout">
          <div className="form-group">
            <label>Category Name</label>
            <input
              type="text"
              placeholder="e.g. Cinematic Film, Anime Magic"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </div>



          <div className="form-group form-row">
            <input
              type="checkbox"
              id="category-enabled-chk"
              checked={categoryEnabled}
              onChange={(e) => setCategoryEnabled(e.target.checked)}
              className="custom-checkbox"
            />
            <label htmlFor="category-enabled-chk">Enable Category (Visible in Mobile App)</label>
          </div>

          {actionError && <div className="modal-error">{actionError}</div>}

          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </button>
            <button className="btn" onClick={handleSaveCategory}>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Tag Manager Modal --- */}
      <Modal
        title="Manage Tags"
        isOpen={showTagManagerModal}
        onClose={() => setShowTagManagerModal(false)}
        size="small"
      >
        <div className="form-layout">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Tags are internal metadata used to rank "Recommended For You" and
            "You may also like" - they are never shown inside the mobile app.
          </p>

          <div className="form-group form-row">
            <input
              type="text"
              placeholder="e.g. Minimalist, Y2K, Cyberpunk"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
            <button className="btn btn-small" onClick={handleAddTag}>
              Add
            </button>
          </div>

          <div className="tag-manager-list">
            {tags.length === 0 ? (
              <div className="empty-state-sidebar">No tags yet.</div>
            ) : (
              tags.map((tag) =>
                editingTagId === tag.id ? (
                  <div key={tag.id} className="tag-manager-row">
                    <input
                      type="text"
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                    />
                    <div className="checkbox-item">
                      <input
                        type="checkbox"
                        id={`tag-enabled-${tag.id}`}
                        checked={editingTagEnabled}
                        onChange={(e) => setEditingTagEnabled(e.target.checked)}
                      />
                      <label htmlFor={`tag-enabled-${tag.id}`}>Enabled</label>
                    </div>
                    <button className="icon-btn-text" onClick={handleSaveEditTag} title="Save">
                      <i className="fa-solid fa-check"></i>
                    </button>
                    <button className="icon-btn-text" onClick={() => setEditingTagId(null)} title="Cancel">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <div key={tag.id} className="tag-manager-row">
                    <span style={{ flex: 1, opacity: tag.isEnabled ? 1 : 0.5 }}>
                      {tag.name}
                      {!tag.isEnabled && ' (disabled)'}
                    </span>
                    <button className="icon-btn-text" onClick={() => handleStartEditTag(tag)} title="Edit">
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button className="icon-btn-text" onClick={() => handleDeleteTag(tag.id)} title="Delete">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                )
              )
            )}
          </div>

          {tagManagerError && <div className="modal-error">{tagManagerError}</div>}

          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowTagManagerModal(false)}>
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Style Modal (Add/Edit) --- */}
      <Modal
        title={editingStyle ? 'Edit Style Preset' : 'New Style Preset'}
        isOpen={showStyleModal}
        onClose={() => setShowStyleModal(false)}
        size="medium"
      >
        <div className="form-layout scroll-form">
          <div className="form-grid-2">
            <div className="form-group">
              <label>Preset Name</label>
              <input
                type="text"
                placeholder="e.g. Claymation 3D"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={styleCategory}
                onChange={(e) => setStyleCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Credit Cost</label>
            <input
              type="number"
              min="0"
              max="50"
              value={styleCreditCost}
              onChange={(e) => setStyleCreditCost(Number(e.target.value))}
            />
          </div>

          <div className="form-group form-row">
            <div className="form-group">
              <label>Minimum Images</label>
              <input
                type="number"
                min="1"
                max="5"
                value={styleMinImages}
                onChange={(e) => setStyleMinImages(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Maximum Images</label>
              <input
                type="number"
                min="1"
                max="5"
                value={styleMaxImages}
                onChange={(e) => setStyleMaxImages(Number(e.target.value))}
              />
            </div>
          </div>

          <ImageUploader
            value={styleCoverImage}
            onChange={setStyleCoverImage}
            label="Style Cover Image"
          />

          <div className="form-group">
            <label>AI Prompt Modifier (Large multiline editor)</label>
            <textarea
              rows={4}
              placeholder="e.g. dramatic lighting, 35mm photoshot, highly detailed, film grain..."
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              className="multiline-textarea"
            />
          </div>

          <div className="form-group">
            <label>Negative Prompt (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. ugly, deformed, blurry, low resolution, bad hands..."
              value={styleNegativePrompt}
              onChange={(e) => setStyleNegativePrompt(e.target.value)}
              className="multiline-textarea"
            />
          </div>

          <div className="form-group">
            <label>
              Tags (internal - powers "Recommended For You" / "You may also
              like", never shown in the app)
            </label>
            <TagInput
              allTags={tags}
              selectedTagIds={styleTagIds}
              onChange={setStyleTagIds}
            />
          </div>

          <div className="form-group">
            <FieldsEditor fields={styleFields} onChange={setStyleFields} prompt={stylePrompt} />
          </div>

          <div className="form-group">
            <PromptPreview prompt={stylePrompt} fields={styleFields} />
          </div>

          <div className="form-group form-row-wrap">
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="style-enabled-chk"
                checked={styleEnabled}
                onChange={(e) => setStyleEnabled(e.target.checked)}
              />
              <label htmlFor="style-enabled-chk">Enabled</label>
            </div>

            <div className="checkbox-item">
              <input
                type="checkbox"
                id="style-trending-chk"
                checked={styleTrending}
                onChange={(e) => setStyleTrending(e.target.checked)}
              />
              <label htmlFor="style-trending-chk">Mark as Trending</label>
            </div>

            <div className="checkbox-item">
              <input
                type="checkbox"
                id="style-premium-chk"
                checked={stylePremium}
                onChange={(e) => setStylePremium(e.target.checked)}
              />
              <label htmlFor="style-premium-chk">Mark as Premium (Pro)</label>
            </div>
          </div>

          {actionError && <div className="modal-error">{actionError}</div>}

          <div className="modal-actions">
            {editingStyle && (
              <button
                className="btn secondary"
                style={{ marginRight: 'auto' }}
                onClick={() => {
                  setShowStyleModal(false);
                  handleOpenPreviewModal(stylePrompt);
                }}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i> Test Prompt
              </button>
            )}
            <button className="btn secondary" onClick={() => setShowStyleModal(false)}>
              Cancel
            </button>
            <button className="btn" onClick={handleSaveStyle}>
              {editingStyle ? 'Update Preset' : 'Create Preset'}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Style Prompt Preview Modal --- */}
      <Modal
        title="Style Prompt Preview Testing"
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        size="medium"
      >
        <div className="form-layout">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Upload a sample portrait/photo to test the prompt modifier tag. This request will hit the generator API backend and show you the result without saving.
          </p>

          <div className="filter-dropdown">
            <label>Generation Provider</label>
            <select
              value={previewProvider}
              onChange={(e) => setPreviewProvider(e.target.value as 'current' | 'stability')}
            >
              <option value="current">Current Provider</option>
              <option value="stability">Stability AI</option>
            </select>
          </div>

          <div className="preview-uploader-layout">
            <div className="uploader-file-select">
              <label>
                Select Sample Photo
                {previewProvider === 'stability' && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (not used by Stability AI)</span>
                )}
              </label>
              {previewSampleImage ? (
                <div className="preview-sample-box">
                  <img src={previewSampleImage} alt="Sample Source" />
                  <button className="remove-sample-btn" onClick={() => { setPreviewSampleImage(''); setPreviewFile(null); }}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ) : (
                <div className="sample-photo-dropzone">
                  <label>
                    <i className="fa-solid fa-image"></i>
                    <span>Choose Photo</span>
                    <input type="file" accept="image/*" onChange={handlePreviewFileChange} style={{ display: 'none' }} />
                  </label>
                </div>
              )}
            </div>

            <div className="preview-result-view">
              <label>Generated Result Preview</label>
              <div className="preview-result-box">
                {isPreviewGenerating ? (
                  <div className="preview-status-centered">
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
                    <span style={{ marginTop: '10px' }}>Generating AI Print...</span>
                  </div>
                ) : generatedPreviewUrl ? (
                  <img src={generatedPreviewUrl} alt="AI Output" className="preview-output-img" />
                ) : (
                  <div className="preview-status-centered muted">
                    <i className="fa-solid fa-wand-magic-sparkles fa-2x"></i>
                    <span style={{ marginTop: '10px' }}>Waiting to generate...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Prompt Tags Being Tested</label>
            <textarea
              rows={2}
              value={previewStylePrompt}
              onChange={(e) => setPreviewStylePrompt(e.target.value)}
              className="multiline-textarea"
            />
          </div>

          {previewError && <div className="modal-error">{previewError}</div>}

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button className="btn secondary" onClick={() => setShowPreviewModal(false)}>
              Close
            </button>
            <button
              className="btn"
              disabled={isPreviewGenerating || (previewProvider === 'current' && !previewFile)}
              onClick={handleGeneratePreview}
            >
              {isPreviewGenerating ? 'Generating...' : 'Run Generation Test'}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Shared Confirmation Modal (replaces native confirm()) --- */}
      <Modal
        title="Please Confirm"
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        size="small"
      >
        <div className="form-layout">
          <p>{confirmDialog?.message}</p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setConfirmDialog(null)}>
              Cancel
            </button>
            <button className="btn" onClick={() => confirmDialog?.onConfirm()}>
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className={`toast-notification ${toast.type}`} role="status">
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {activePreviewImage && (
        <div className="image-preview-overlay" onClick={() => setActivePreviewImage(null)}>
          <div className="image-preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-preview-close-btn" onClick={() => setActivePreviewImage(null)} aria-label="Close preview">
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img src={activePreviewImage} alt="Full Preview" className="image-preview-large-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleManagerPage;
