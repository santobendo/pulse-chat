/* ============================================================
   PULSE CHAT — Vercel Serverless Function
   This function serves environment variables to the frontend.
   ============================================================ */

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log for debugging (only presence, not the key itself)
  console.log('API Config hit. SUPABASE_URL present:', !!process.env.SUPABASE_URL);

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  // Return environment variables
  res.status(200).json({
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  });
}
