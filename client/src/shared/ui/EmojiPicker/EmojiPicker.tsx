import { useEffect, useId, useRef, useState } from 'react';
import { EmojiPicker as FrimousseEmojiPicker } from 'frimousse';
import styles from './EmojiPicker.module.scss';

type EmojiPickerProps = {
  disabled?: boolean;
  onSelect: (emoji: string) => void;
};

export const EmojiPicker = ({ disabled = false, onSelect }: EmojiPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={[styles.toggle, isOpen ? styles.toggleActive : ''].filter(Boolean).join(' ')}
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-label="Выбрать эмодзи"
        aria-expanded={isOpen}
        aria-controls={pickerId}
      >
        😊
      </button>

      {isOpen ? (
        <div id={pickerId} className={styles.popover} role="dialog" aria-label="Эмодзи">
          <FrimousseEmojiPicker.Root
            className={styles.picker}
            locale="ru"
            onEmojiSelect={({ emoji }) => {
              onSelect(emoji);
            }}
          >
            <FrimousseEmojiPicker.Search
              className={styles.search}
              placeholder="Поиск эмодзи…"
              autoFocus
            />
            <FrimousseEmojiPicker.Viewport className={styles.viewport}>
              <FrimousseEmojiPicker.Loading className={styles.status}>
                Загрузка…
              </FrimousseEmojiPicker.Loading>
              <FrimousseEmojiPicker.Empty className={styles.status}>
                Ничего не найдено
              </FrimousseEmojiPicker.Empty>
              <FrimousseEmojiPicker.List
                className={styles.list}
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div className={styles.category} {...props}>
                      {category.label}
                    </div>
                  ),
                  Row: ({ children, ...props }) => (
                    <div className={styles.row} {...props}>
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <button type="button" className={styles.emoji} {...props}>
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </FrimousseEmojiPicker.Viewport>
          </FrimousseEmojiPicker.Root>
        </div>
      ) : null}
    </div>
  );
};
