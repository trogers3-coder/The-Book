-- Private bucket for the original call sheet attachments (PDFs/images), so
-- the UI can link back to source documents. No public policies are added;
-- only the service role (used server-side) can read/write objects in it.
insert into storage.buckets (id, name, public)
values ('call-sheet-attachments', 'call-sheet-attachments', false)
on conflict (id) do nothing;
