import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, EmojiPicker, Input } from '@shared/ui';
import styles from './MessageInput.module.scss';

const messageSchema = z.object({
  message: z.string().trim().min(1),
});

type MessageFormValues = z.infer<typeof messageSchema>;

type MessageInputProps = {
  disabled?: boolean;
  placeholder?: string;
  onSend?: (text: string) => void;
  onStartTyping?: () => void;
  onFinishTyping?: () => void;
};

const useTypingSignal = (onStartTyping?: () => void, onFinishTyping?: () => void) => {
  const timeoutRef = useRef<number | null>(null);

  return () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    } else {
      onStartTyping?.();
    }

    timeoutRef.current = window.setTimeout(() => {
      onFinishTyping?.();
      timeoutRef.current = null;
    }, 1000);
  };
};

export const MessageInput = ({
  disabled = false,
  placeholder = 'Написать сообщение…',
  onSend,
  onStartTyping,
  onFinishTyping,
}: MessageInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const signalTyping = useTypingSignal(onStartTyping, onFinishTyping);
  const { control, handleSubmit, setValue, getValues, watch } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: '' },
  });

  const message = watch('message');

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    const current = getValues('message');
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`;

    setValue('message', next, { shouldDirty: true, shouldValidate: true });
    signalTyping();

    requestAnimationFrame(() => {
      const caret = start + emoji.length;
      input?.focus();
      input?.setSelectionRange(caret, caret);
    });
  };

  const submit = (values: MessageFormValues) => {
    onSend?.(values.message);
    setValue('message', '');
    signalTyping();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
      <div className={styles.field}>
        <EmojiPicker disabled={disabled} onSelect={insertEmoji} />
        <Controller
          name="message"
          control={control}
          render={({ field }) => (
            <Input
              ref={(node) => {
                field.ref(node);
                inputRef.current = node;
              }}
              name={field.name}
              value={field.value}
              onBlur={field.onBlur}
              aria-label="Текст сообщения"
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              onChange={(event) => {
                field.onChange(event);
                signalTyping();
              }}
            />
          )}
        />
      </div>

      <Button type="submit" disabled={disabled || !message.trim()}>
        Отправить
      </Button>
    </form>
  );
};
