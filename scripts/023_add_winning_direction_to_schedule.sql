-- Add winning_direction column to bet_processing_schedule table
ALTER TABLE public.bet_processing_schedule
ADD COLUMN IF NOT EXISTS winning_direction TEXT DEFAULT 'a_favor';

-- Add comment
COMMENT ON COLUMN public.bet_processing_schedule.winning_direction IS 'Direction that will win: a_favor or en_contra';
