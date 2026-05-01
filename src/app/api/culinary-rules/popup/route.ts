// src/app/api/culinary-rules/popup/route.ts
// Verwerkt popup antwoorden en maakt automatisch regels aan

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Map van antwoorden naar auto-regels
const ANSWER_TO_RULE: Record<string, {
  rule_text: string
  rule_type: 'altijd' | 'nooit' | 'soms'
  context: string
  subject?: string
  nuance?: string
}> = {
  // Dessert-kruid vragen
  'dessert_herb_preference:verveine': {
    rule_text: 'Verveine is mijn signatuurkruid voor desserts en zoete bereidingen',
    rule_type: 'altijd', context: 'dessert', subject: 'verveine'
  },
  'dessert_herb_preference:dragon': {
    rule_text: 'Dragon is mijn dessert-signatuurkruid — subtiel anijsachtig accent',
    rule_type: 'altijd', context: 'dessert', subject: 'dragon'
  },
  'dessert_herb_preference:munt': {
    rule_text: 'Munt als dessert-kruid — fris, zuiver accent',
    rule_type: 'altijd', context: 'dessert', subject: 'munt'
  },
  
  // Umami in dessert
  'umami_in_dessert:ja_regelmatig': {
    rule_text: 'Umami-elementen in desserts zijn een bewuste keuze — miso, witte chocolade-miso, sake-caramel',
    rule_type: 'soms', context: 'dessert', subject: 'umami',
    nuance: 'Als statement, zorgvuldig gebalanceerd met zoetheid'
  },
  'umami_in_dessert:soms': {
    rule_text: 'Umami in dessert mag soms — als bewust statement, niet als standaard',
    rule_type: 'soms', context: 'dessert', subject: 'umami',
    nuance: 'Kleine hoeveelheid, als verrassing — niet dominant'
  },
  'umami_in_dessert:nooit': {
    rule_text: 'Umami-elementen zoals miso, dashi, gepekelde eidooier horen niet in zoete bereidingen',
    rule_type: 'nooit', context: 'dessert', subject: 'umami'
  },
  
  // Textuur
  'texture_rule:2': {
    rule_text: 'Elk bord heeft minimum 2 verschillende texturen',
    rule_type: 'altijd', context: 'algemeen', subject: 'textuur'
  },
  'texture_rule:3': {
    rule_text: 'Elk bord heeft minimum 3 texturen — knapperig, zacht en crémeux',
    rule_type: 'altijd', context: 'algemeen', subject: 'textuur'
  },
  'texture_rule:4': {
    rule_text: 'Elk bord streeft naar 4 texturen voor maximale beleving',
    rule_type: 'altijd', context: 'algemeen', subject: 'textuur'
  },
  
  // Zuur
  'acid_rule:altijd': {
    rule_text: 'Elk bord heeft altijd een zuur-accent — het is een wet in mijn keuken',
    rule_type: 'altijd', context: 'algemeen', subject: 'zuur-accent'
  },
  'acid_rule:bijna_altijd': {
    rule_text: 'Bijna altijd een zuur-element — citrus, azijn of fermentatie',
    rule_type: 'soms', context: 'algemeen', subject: 'zuur-accent',
    nuance: 'Niet rigide, maar als standaard aanwezig'
  },
  'acid_rule:enkel_hartig': {
    rule_text: 'Zuur-accent bij hartige gerechten — niet noodzakelijk bij desserts',
    rule_type: 'altijd', context: 'hartig', subject: 'zuur-accent'
  },
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { question_id, question, question_type, answer, trigger_context, should_create_rule } = body

  const { data: profile } = await supabase
    .from('chef_profiles')
    .select('id, kitchens:kitchen_members(kitchen_id)')
    .eq('auth_user_id', user.id)
    .single()

  const kitchen_id = profile?.kitchens?.[0]?.kitchen_id
  const chef_profile_id = profile?.id

  // Log de popup
  const { data: popupLog } = await supabase
    .from('chef_learning_popups')
    .insert({
      kitchen_id,
      chef_profile_id,
      question,
      question_type,
      options: null,
      answer,
      answered_at: new Date().toISOString(),
      trigger_context,
    })
    .select()
    .single()

  // Maak automatisch een regel aan als het antwoord dat triggert
  let created_rule = null
  if (should_create_rule) {
    const rule_key = `${question_id}:${answer}`
    const rule_template = ANSWER_TO_RULE[rule_key]

    if (rule_template) {
      const { data: new_rule } = await supabase
        .from('chef_culinary_rules')
        .insert({
          kitchen_id,
          chef_profile_id,
          ...rule_template,
          source: 'popup_antwoord',
          confidence: 90,
        })
        .select()
        .single()

      created_rule = new_rule

      // Koppel popup aan regel
      if (popupLog && new_rule) {
        await supabase
          .from('chef_learning_popups')
          .update({ rule_created_id: new_rule.id })
          .eq('id', popupLog.id)
      }
    }
  }

  return NextResponse.json({ success: true, created_rule })
}
