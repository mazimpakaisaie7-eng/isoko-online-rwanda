
/* ==========================================
   ISOKO ONLINE RWANDA
   Supabase connection and data functions
   ========================================== */

"use strict";

// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

let supabaseClient = null;

// 2. INITIALIZE SUPABASE
function initializeSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!window.supabase?.createClient) {
    console.error("Supabase library is not loaded.");
    return null;
  }

  if (
    !SUPABASE_URL.startsWith("https://") ||
    SUPABASE_URL.includes("YOUR_SUPABASE") ||
    !SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE")
  ) {
    console.error("Please configure your Supabase URL and key.");
    return null;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  return supabaseClient;
}

// 3. READ STORES
async function getStores() {
  const client = initializeSupabase();

  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("stores")
    .select("*");

  if (error) {
    console.error("Could not load stores:", error.message);
    throw error;
  }

  return data || [];
}

// 4. READ PRODUCTS
async function getProducts() {
  const client = initializeSupabase();

  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client
    .from("products")
    .select("*");

  if (error) {
    console.error("Could not load products:", error.message);
    throw error;
  }

  return data || [];
}

// 5. CHECK DATABASE CONNECTION
async function checkSupabaseConnection() {
  try {
    const client = initializeSupabase();

    if (!client) {
      return false;
    }

    const { error } = await client
      .from("stores")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Database check failed:", error.message);
      return false;
    }

    console.log("Supabase connection successful.");
    return true;
  } catch (error) {
    console.error("Connection error:", error.message);
    return false;
  }
}

// 6. MAKE FUNCTIONS AVAILABLE TO index.html
window.IsokoOnline = {
  initializeSupabase,
  getStores,
  getProducts,
  checkSupabaseConnection
};
