export type MessageDeliveryStatus = 'pending' | 'sent' | 'failed';

export type MessageViewModel = {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  isOwn?: boolean;
  isSystem?: boolean;
  clientMessageId?: string;
  status?: MessageDeliveryStatus;
  error?: string;
};
