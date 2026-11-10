import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RoomListItem } from '@chat/shared';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input } from '@shared/ui';
import { http } from '@/shared/api/http';
import styles from './JoinRoomForm.module.scss';

const joinRoomSchema = z.object({
  roomId: z.string().trim().min(1, 'Укажите комнату'),
});

type JoinRoomFields = z.infer<typeof joinRoomSchema>;

export type JoinRoomFormValues = JoinRoomFields & {
  userName: string;
};

type JoinRoomFormProps = {
  userName: string;
  initialRoomId?: string;
  disabled?: boolean;
  onSubmit?: (values: JoinRoomFormValues) => void;
  onLogout?: () => void;
};

export const JoinRoomForm = ({
  userName,
  initialRoomId = '',
  disabled = false,
  onSubmit,
  onLogout,
}: JoinRoomFormProps) => {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JoinRoomFields>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: { roomId: initialRoomId },
  });

  const roomId = watch('roomId');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const {
          data: { rooms: nextRooms },
        } = await http.get<{ rooms: RoomListItem[] }>('/rooms');
        if (!cancelled) {
          setRooms(nextRooms);
        }
      } catch {
        if (!cancelled) {
          setRooms([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRooms(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = (values: JoinRoomFields) => {
    onSubmit?.({ userName, roomId: values.roomId });
  };

  const joinExistingRoom = (id: string) => {
    setValue('roomId', id);
    onSubmit?.({ userName, roomId: id });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
      <div className={styles.intro}>
        <div className={styles.introTop}>
          <h2 className={styles.title}>Вход в комнату</h2>
          {onLogout ? (
            <button type="button" className={styles.logout} onClick={onLogout}>
              Выйти
            </button>
          ) : null}
        </div>
        <p className={styles.hint}>
          Вы вошли как <strong>{userName}</strong>. Выберите или создайте комнату.
        </p>
      </div>

      <Input
        label="Комната"
        placeholder="например, general"
        disabled={disabled}
        error={errors.roomId?.message}
        autoComplete="off"
        {...register('roomId')}
      />

      <section className={styles.rooms} aria-label="Существующие комнаты">
        <div className={styles.roomsHeader}>
          <h3 className={styles.roomsTitle}>Активные комнаты</h3>
          {!loadingRooms ? <span className={styles.roomsCount}>{rooms.length}</span> : null}
        </div>

        {loadingRooms ? <p className={styles.roomsHint}>Загрузка…</p> : null}

        {!loadingRooms && rooms.length === 0 ? (
          <p className={styles.roomsHint}>Пока пусто — создайте первую комнату выше</p>
        ) : null}

        {!loadingRooms && rooms.length > 0 ? (
          <ul className={styles.roomList}>
            {rooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  className={[styles.roomCard, roomId === room.id ? styles.roomCardActive : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => joinExistingRoom(room.id)}
                  disabled={disabled}
                >
                  <span className={styles.roomName}>{room.id}</span>
                  <span className={styles.roomMeta}>
                    {room.participantsCount}{' '}
                    {room.participantsCount === 1 ? 'участник' : 'участников'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Button type="submit" disabled={disabled || !roomId.trim()}>
        Войти в комнату
      </Button>
    </form>
  );
};
