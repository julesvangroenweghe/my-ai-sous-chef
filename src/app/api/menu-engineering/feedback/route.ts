import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { menu_id, action, modifications } = body
    // action: 'accepted' | 'modified' | 'rejected' | 'regenerated'

    if (!menu_id || !action) {
      return NextResponse.json({ error: 'menu_id en action zijn verplicht' }, { status: 400 })
    }

    const { data: memberData } = await supabase
      .from('kitchen_members')
      .select('kitchen_id')
      .eq('chef_id', user.id)
      .single()

    const kitchenId = memberData?.kitchen_id
    if (!kitchenId) return NextResponse.json({ error: 'Geen keuken gevonden' }, { status: 404 })

    // 1. Update audit feedback log
    const { data: existingLog } = await supabase
      .from('audit_feedback_log')
      .select('id')
      .eq('menu_id', menu_id)
      .eq('chef_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingLog) {
      await supabase.from('audit_feedback_log').update({
        chef_action: action,
        chef_modifications: modifications || {},
      }).eq('id', existingLog.id)
    } else {
      await supabase.from('audit_feedback_log').insert({
        kitchen_id: kitchenId,
        chef_id: user.id,
        menu_id,
        chef_action: action,
        chef_modifications: modifications || {},
      })
    }

    // 2. Update menu status based on action
    if (action === 'accepted') {
      await supabase.from('saved_menus').update({ status: 'active' }).eq('id', menu_id)
    } else if (action === 'rejected') {
      await supabase.from('saved_menus').update({ status: 'archived' }).eq('id', menu_id)
    }

    // 3. Update audit ruleset using learned patterns
    const { data: recentFeedback } = await supabase
      .from('audit_feedback_log')
      .select('*')
      .eq('kitchen_id', kitchenId)
      .eq('chef_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentFeedback && recentFeedback.length >= 3) {
      // Calculate patterns from feedback
      const accepted = recentFeedback.filter(f => f.chef_action === 'accepted').length
      const modified = recentFeedback.filter(f => f.chef_action === 'modified').length
      const rejected = recentFeedback.filter(f => f.chef_action === 'rejected').length
      const total = recentFeedback.length

      // Analyze modifications to find patterns
      const modificationPatterns: Record<string, number> = {}
      recentFeedback.forEach(f => {
        if (f.chef_modifications && typeof f.chef_modifications === 'object') {
          const mods = f.chef_modifications as Record<string, unknown>
          Object.keys(mods).forEach(key => {
            modificationPatterns[key] = (modificationPatterns[key] || 0) + 1
          })
        }
      })

      // Normalize patterns to 0-1 confidence
      Object.keys(modificationPatterns).forEach(key => {
        modificationPatterns[key] = Math.round((modificationPatterns[key] / total) * 100) / 100
      })

      const avgScore = recentFeedback
        .filter(f => f.audit_score)
        .reduce((sum, f) => sum + Number(f.audit_score), 0) / Math.max(recentFeedback.filter(f => f.audit_score).length, 1)

      // Upsert audit ruleset
      const { data: existingRuleset } = await supabase
        .from('audit_rulesets')
        .select('*')
        .eq('kitchen_id', kitchenId)
        .eq('chef_id', user.id)
        .single()

      const learnedRules = {
        ...(existingRuleset?.learned_rules as Record<string, unknown> || {}),
        acceptance_rate: Math.round((accepted / total) * 100) / 100,
        modification_rate: Math.round((modified / total) * 100) / 100,
        rejection_rate: Math.round((rejected / total) * 100) / 100,
        ...modificationPatterns,
      }

      if (existingRuleset) {
        await supabase.from('audit_rulesets').update({
          learned_rules: learnedRules,
          total_audits: total,
          avg_score: Math.round(avgScore * 10) / 10,
          updated_at: new Date().toISOString(),
        }).eq('id', existingRuleset.id)
      } else {
        await supabase.from('audit_rulesets').insert({
          kitchen_id: kitchenId,
          chef_id: user.id,
          learned_rules: learnedRules,
          total_audits: total,
          avg_score: Math.round(avgScore * 10) / 10,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Fout bij opslaan feedback' }, { status: 500 })
  }
}
