import type { gmail_v1 } from "googleapis";

export type ParsedAttachment = {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type ParsedMessage = {
  subject: string | null;
  fromAddress: string | null;
  fromName: string | null;
  toAddresses: string[];
  date: Date | null;
  bodyText: string | null;
  bodyHtml: string | null;
  attachments: ParsedAttachment[];
};

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseAddressHeader(value: string | undefined): { name: string | null; address: string | null } {
  if (!value) return { name: null, address: null };
  const match = value.match(/^(.*?)\s*<(.+?)>\s*$/);
  if (match) {
    const name = match[1].replace(/^"|"$/g, "").trim();
    return { name: name || null, address: match[2].trim() };
  }
  return { name: null, address: value.trim() };
}

function walkParts(
  part: gmail_v1.Schema$MessagePart | undefined,
  onPart: (part: gmail_v1.Schema$MessagePart) => void
) {
  if (!part) return;
  onPart(part);
  for (const child of part.parts ?? []) {
    walkParts(child, onPart);
  }
}

export function parseGmailMessage(message: gmail_v1.Schema$Message): ParsedMessage {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;

  const { name: fromName, address: fromAddress } = parseAddressHeader(getHeader("From"));
  const toHeader = getHeader("To");
  const toAddresses = toHeader
    ? toHeader.split(",").map((s) => parseAddressHeader(s).address).filter((a): a is string => !!a)
    : [];

  const dateHeader = getHeader("Date");
  const date = dateHeader ? new Date(dateHeader) : null;

  let bodyText: string | null = null;
  let bodyHtml: string | null = null;
  const attachments: ParsedAttachment[] = [];

  walkParts(message.payload, (part) => {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType ?? "application/octet-stream",
        size: part.body.size ?? 0,
      });
      return;
    }
    if (part.mimeType === "text/plain" && part.body?.data && !bodyText) {
      bodyText = decodeBase64Url(part.body.data);
    }
    if (part.mimeType === "text/html" && part.body?.data && !bodyHtml) {
      bodyHtml = decodeBase64Url(part.body.data);
    }
  });

  if (!bodyText && bodyHtml) {
    bodyText = stripHtml(bodyHtml);
  }

  return {
    subject: getHeader("Subject") ?? null,
    fromAddress: fromAddress,
    fromName: fromName,
    toAddresses,
    date: date && !Number.isNaN(date.getTime()) ? date : null,
    bodyText,
    bodyHtml,
    attachments,
  };
}
