-- Remarks limit changes from 1000 words to 1000 letters (characters).
-- The whitespace word-count check is replaced by a plain character-length
-- check on the stored (trimmed) value: char_length counts Postgres
-- characters, matching countLetters() in src/lib/validations/task-log.ts
-- (trimmed code-point length), so the zod validation, the form's live
-- counter, and this backstop all enforce the same 1000-letter cap.

alter table public.task_logs
  drop constraint task_logs_remarks_word_limit;

alter table public.task_logs
  add constraint task_logs_remarks_letter_limit
  check (
    remarks is null
    or char_length(remarks) <= 1000
  );
