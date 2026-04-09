import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { collectApplicantCredentialIds } from '../lib/jobMatchScore'

/**
 * Loads documents + credential IDs for the logged-in user's applicant row (for requirement match %).
 * @returns {{ loading: boolean, data: { documents: Array<{file_type: string}>, licenseIds: string[] } | false | null }}
 *   — data null when no user; false when user has no applicant record; object when ready
 */
export function useApplicantJobMatchInputs(userId) {
  const [state, setState] = useState({ loading: false, data: null })

  useEffect(() => {
    if (!userId) {
      setState({ loading: false, data: null })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, loading: true }))

    ;(async () => {
      try {
        const { data: applicant, error: aErr } = await supabase
          .from('applicants')
          .select('id, licenses')
          .eq('user_id', userId)
          .maybeSingle()

        if (aErr) throw aErr

        if (!applicant) {
          if (!cancelled) setState({ loading: false, data: false })
          return
        }

        const [{ data: docs }, { data: licRows }] = await Promise.all([
          supabase.from('documents').select('file_type').eq('applicant_id', applicant.id),
          supabase.from('applicant_licenses').select('category').eq('applicant_id', applicant.id),
        ])

        if (cancelled) return

        const licenseIds = collectApplicantCredentialIds(applicant.licenses, licRows || [])
        setState({
          loading: false,
          data: { documents: docs || [], licenseIds },
        })
      } catch (e) {
        console.error('[useApplicantJobMatchInputs]', e)
        if (!cancelled) setState({ loading: false, data: false })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  return state
}
