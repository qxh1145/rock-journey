import { createClient } from 'npm:@supabase/supabase-js@2.117.2'

const email = 'honguyenvietanh1405@gmail.com'
const origin = 'https://rock-journey.vercel.app'
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store', 'Content-Type': 'application/json',
}
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers })

// This one fixed shared player is intentionally public, as requested by the owner.
Deno.serve(async (req: Request) => {
  if (req.headers.get('origin') && req.headers.get('origin') !== origin) return reply(403, { error: 'Origin không hợp lệ.' })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return reply(405, { error: 'Chỉ chấp nhận POST.' })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: config, error } = await admin.from('shortcut_login_accounts').select('user_id, enabled').eq('email', email).single()
    if (error || !config?.enabled || !config.user_id) return reply(403, { error: 'Đăng nhập phím tắt đang tắt.' })
    const id = config.user_id as string
    const [{ data: account, error: accountError }, { data: role, error: roleError }] = await Promise.all([
      admin.auth.admin.getUserById(id),
      admin.from('admin_roles').select('user_id').eq('user_id', id).eq('active', true).maybeSingle(),
    ])
    if (accountError || roleError || role || account.user?.email !== email || account.user?.app_metadata.shared_shortcut_player !== true) return reply(403, { error: 'Tài khoản không được phép dùng phím tắt.' })
    const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (link.error || !link.data.properties?.hashed_token) return reply(503, { error: 'Chưa tạo được phiên đăng nhập.' })
    const verified = await admin.auth.verifyOtp({ type: 'email', token_hash: link.data.properties.hashed_token })
    const session = verified.data.session
    if (verified.error || !session || session.user.id !== id) return reply(503, { error: 'Chưa tạo được phiên đăng nhập.' })
    return reply(200, { access_token: session.access_token, refresh_token: session.refresh_token })
  } catch { return reply(503, { error: 'Không thể đăng nhập phím tắt lúc này.' }) }
})
