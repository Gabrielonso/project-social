export interface IEmail {
  email: string;
  name?: string;
}

export interface IAttachment {
  file_url: string;
  file_name: string;
}

export interface IDownloadAsBase64Result {
  base_64_data: string;
  mime_type: string | boolean;
}

export interface IEmailOptions {
  recipient: string;
  subject: string;
  reply_to_email: string;
  allow_to_reply: boolean;
  send_attachment: boolean;
  template_id: string;
  template_variables: object;
  cc?: IEmail[];
  bcc?: IEmail[];
  attachments?: IAttachment[];
}
