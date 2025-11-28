import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export const supabase = createClient('https://rhzlyznshmkbcwhmbgur.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoemx5em5zaG1rYmN3aG1iZ3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTg3MTAsImV4cCI6MjA3OTU3NDcxMH0.enKl_oiA8s4u5jaXLlrqza2lhlyp8sf3ATr2ryrkuks');
window.supabase = supabase;
