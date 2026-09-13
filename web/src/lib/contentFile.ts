const ALLOWED_FILE_EXTENSIONS = ['jpg', 'jpeg', 'pdf', 'doc', 'docx'];
const ALLOWED_FILE_MIME_TYPES = [
  'image/jpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const CONTENT_FILE_ACCEPT =
  '.jpg,.jpeg,.pdf,.doc,.docx,image/jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function validateContentFile(file: File): string | null {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const typeOk = ALLOWED_FILE_MIME_TYPES.includes(file.type) || ALLOWED_FILE_EXTENSIONS.includes(ext);
  if (!typeOk) return 'Formato não aceito. Envie um arquivo JPG, PDF, DOC ou DOCX.';
  if (file.size > MAX_FILE_SIZE_BYTES) return 'Arquivo muito grande (máximo 10MB).';
  return null;
}
