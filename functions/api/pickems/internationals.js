import { json } from '../../_lib/auth.js';
import { loadInternationalPickemSeason } from '../../_lib/international-pickems.js';

export async function onRequestGet({ env }) {
  try {
    return json(await loadInternationalPickemSeason(env));
  } catch {
    return json({ error: 'The international fixture list is temporarily unavailable. Please try again.' }, 503);
  }
}
