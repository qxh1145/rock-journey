import { createClient, type Session } from '@supabase/supabase-js'

export const STAGING_REF = 'awvaujmkbstkpsbaxpku'
const URL = `https://${STAGING_REF}.supabase.co`

function need(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var ${name} (staging e2e needs it; see web/README.md)`)
  return v
}

/** Create a confirmed throwaway user on staging and return its session plus a cleanup fn. */
export async function createThrowawayPlayer(): Promise<{
  session: Session; cleanup: () => Promise<void>; answerCount: () => Promise<number>
  setSession: (patch: Record<string, unknown>) => Promise<void>
}> {
  const serviceKey = need('SUPABASE_STAGING_SERVICE_ROLE_KEY')
  const anonKey = need('VITE_SUPABASE_KEY')
  const opts = { auth: { persistSession: false, autoRefreshToken: false } }
  const admin = createClient(URL, serviceKey, opts)
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (cErr || !created.user) throw new Error(`createUser failed: ${cErr?.message}`)
  const userId = created.user.id
  const cleanup = async () => {
    try {
      // No FK cascades: answers -> game_sessions -> players -> auth user.
      const { data: gs } = await admin.from('game_sessions').select('id').eq('player_id', userId)
      const ids = (gs ?? []).map((r) => r.id)
      if (ids.length) {
        await admin.from('answers').delete().in('session_id', ids)
        await admin.from('game_sessions').delete().in('id', ids)
      }
      await admin.from('players').delete().eq('id', userId)
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) console.error(`e2e cleanup: deleteUser(${userId}) failed: ${error.message}`)
    } catch (e) { console.error('e2e cleanup failed', e) }
  }

  try {
    const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (lErr || !link.properties) throw new Error(`generateLink failed: ${lErr?.message}`)
    const anon = createClient(URL, anonKey, opts)
    const { data, error: vErr } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
    if (vErr || !data.session) throw new Error(`verifyOtp failed: ${vErr?.message}`)
    const answerCount = async () => {
      const { data: gs } = await admin.from('game_sessions').select('id').eq('player_id', userId)
      const { count, error } = await admin.from('answers').select('id', { count: 'exact', head: true }).in('session_id', (gs ?? []).map((r) => r.id))
      if (error) throw error
      return count ?? 0
    }
    // fixtures COMPLETED/claimed: sửa thẳng game_sessions bằng admin client
    const setSession = async (patch: Record<string, unknown>) => {
      const { error } = await admin.from('game_sessions').update(patch).eq('player_id', userId)
      if (error) throw error
    }
    return { session: data.session, cleanup, answerCount, setSession }
  } catch (e) {
    await cleanup()
    throw e
  }
}
