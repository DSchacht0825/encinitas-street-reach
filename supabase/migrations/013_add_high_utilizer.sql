-- Add high_utilizer field to persons table
ALTER TABLE public.persons
ADD COLUMN high_utilizer BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX idx_persons_high_utilizer ON public.persons(high_utilizer);

-- Add comment for documentation
COMMENT ON COLUMN public.persons.high_utilizer IS 'Indicates if this person is marked as a high utilizer of services';
