-- Create function to test auth.uid() context
CREATE OR REPLACE FUNCTION get_auth_uid()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;