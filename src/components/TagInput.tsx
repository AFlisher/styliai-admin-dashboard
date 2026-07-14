import React, { useMemo, useState } from 'react';
import { TagModel } from '../types';

interface TagInputProps {
  allTags: TagModel[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

// First chip/multi-select control in this codebase - deliberately plain
// (no external dependency) to match the rest of the dashboard's form
// components. Tags power RecommendationService similarity scoring only;
// this is an admin-only control, never rendered for end users.
export const TagInput: React.FC<TagInputProps> = ({ allTags, selectedTagIds, onChange }) => {
  const [query, setQuery] = useState('');

  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean) as TagModel[],
    [allTags, selectedTagIds]
  );

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return allTags
      .filter((t) => t.isEnabled)
      .filter((t) => !selectedTagIds.includes(t.id))
      .filter((t) => t.name.toLowerCase().includes(lowerQuery))
      .slice(0, 8);
  }, [allTags, selectedTagIds, query]);

  const addTag = (tagId: string) => {
    onChange([...selectedTagIds, tagId]);
    setQuery('');
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className="tag-input">
      <div className="tag-input-chips">
        {selectedTags.map((tag) => (
          <span key={tag.id} className="tag-chip">
            {tag.name}
            <button
              type="button"
              className="tag-chip-remove"
              onClick={() => removeTag(tag.id)}
              aria-label={`Remove ${tag.name}`}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </span>
        ))}
      </div>

      <div className="tag-input-search">
        <input
          type="text"
          placeholder="Search tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="tag-input-suggestions">
            {suggestions.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className="tag-input-suggestion"
                onClick={() => addTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagInput;
