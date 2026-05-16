/*
  # Create task-photos storage bucket

  1. Changes
    - Insert storage bucket 'task-photos' for production task photo uploads
  2. Security
    - Bucket is public for reading
    - Only authenticated users can upload
*/

INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-photos', 'task-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload task photos" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'task-photos');

CREATE POLICY "Anyone can view task photos" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'task-photos');