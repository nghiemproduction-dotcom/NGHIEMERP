/*
  # Set PIN hashes for existing users

  1. Changes
    - Update pin_hash for all master_users to '1234' (demo PIN)
  2. Notes
    - This is a simple demo implementation
    - In production, PINs should be properly hashed
*/

UPDATE master_users SET pin_hash = '1234' WHERE pin_hash IS NULL OR pin_hash = '';