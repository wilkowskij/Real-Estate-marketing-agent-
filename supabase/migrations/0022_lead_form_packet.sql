-- Add packet configuration to open-house lead forms.
-- packet_mode: how the emailed packet is built ('mls'=from linked listing,
--              'manual'=agent-entered details, 'pdf'=uploaded PDF attachment)
-- packet_pdf_path: storage path when mode is 'pdf'
-- packet_details: freeform agent-entered details when mode is 'manual'

alter table lead_forms
  add column if not exists packet_mode text not null default 'mls'
    check (packet_mode in ('mls', 'manual', 'pdf')),
  add column if not exists packet_pdf_path text,
  add column if not exists packet_details jsonb not null default '{}'::jsonb;
