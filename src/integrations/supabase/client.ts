import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

function readEnv(...aliases: string[]): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    for (const alias of aliases) {
      const value = import.meta.env[alias];
      if (value) return value;
    }
  }

  for (const alias of aliases) {
    const value = process.env?.[alias];
    if (value) return value;
  }

  return undefined;
}

function hasPlaceholderSupabaseValue(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('your-project') ||
    normalized.includes('your-supabase') ||
    normalized.includes('example.supabase.co') ||
    normalized.includes('your-anon-key') ||
    normalized.includes('placeholder') ||
    normalized === 'your-project.supabase.co' ||
    normalized === 'your-supabase-anon-key'
  );
}

export function getSupabaseClientConfig() {
  const url = readEnv('VITE_SUPABASE_URL', 'SUPABASE_URL');
  const publishableKey = readEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
  const placeholder = hasPlaceholderSupabaseValue(url) || hasPlaceholderSupabaseValue(publishableKey);
  return {
    url,
    publishableKey,
    configured: Boolean(url && publishableKey && !placeholder),
  };
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

// The public URL can be reachable only from the browser, so server requests go to the runtime URL of the same backend.
function serverSupabaseUrl(publicUrl: string, supabaseKey: string): string | undefined {
  if (typeof window !== 'undefined' || typeof process === 'undefined') return undefined;
  const serverUrl = readEnv('SUPABASE_URL')?.replace(/\/+$/, '');
  if (!serverUrl || serverUrl === publicUrl || readEnv('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY') !== supabaseKey) return undefined;
  return serverUrl;
}

function createSupabaseFetch(supabaseUrl: string, supabaseKey: string): typeof fetch {
  const publicUrl = supabaseUrl.replace(/\/+$/, '');
  const serverUrl = serverSupabaseUrl(publicUrl, supabaseKey);
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    if (serverUrl) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(`${publicUrl}/`)) {
        const target = serverUrl + url.slice(publicUrl.length);
        const request = typeof input === 'string' || input instanceof URL ? target : new Request(target, input);
        return fetch(request, { ...init, headers });
      }
    }
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  const { url, publishableKey, configured } = getSupabaseClientConfig();
  const SUPABASE_URL = url ?? 'https://example.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = publishableKey ?? 'public-anon-key';

  if (!configured) {
    console.warn(
      '[Supabase] Missing environment variables. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY) before launching auth.',
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

