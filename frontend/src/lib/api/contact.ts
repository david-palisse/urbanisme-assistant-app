import { request } from './http';

export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  projectContext?: string;
}

export const contactApi = {
  async sendContactMessage(input: ContactMessageInput): Promise<void> {
    await request<{ success: boolean }>('/contact', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
