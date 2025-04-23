import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Use Next.js convention for public environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Provide a more helpful error message for server vs. client
  if (typeof window === 'undefined') {
    console.error("Supabase URL and Anon Key are not defined. Ensure NEXT_PUBLIC_ variables are set and accessible during build or server-side execution.");
  } else {
    console.error("Supabase URL and Anon Key are not defined. Ensure NEXT_PUBLIC_ variables are set in your .env file and the Next.js server is restarted.");
  }
  // Throwing an error might be too harsh, especially on the client. 
  // Consider returning a null client or a mocked client instead, depending on requirements.
  // For now, we keep the error throwing behavior.
  throw new Error("Supabase client cannot be initialized. Missing environment variables.");
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Optional: Export a function to create a client if needed elsewhere,
// but usually exporting the singleton instance `supabase` is sufficient.
// export const createClient = () => createSupabaseClient(supabaseUrl, supabaseAnonKey);
