CREATE TABLE public.seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  research jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.seeds TO authenticated;
GRANT ALL ON public.seeds TO service_role;
ALTER TABLE public.seeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own seeds select" ON public.seeds FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own seeds insert" ON public.seeds FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own seeds delete" ON public.seeds FOR DELETE TO authenticated USING (auth.uid() = user_id);