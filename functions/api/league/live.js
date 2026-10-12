// Public, read-only VA feed. No provider cookies, private props or arbitrary URLs.
const competitions = {'6v6': [1, 2], '10v10': [3, 5]};
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#039;', "'").replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const text = value => String(value ?? '').slice(0, 200);
const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
export async function loadLeagueData(division, kind, fetcher = (...args) => globalThis.fetch(...args)) {
  const [competition, season] = competitions[division];
  const source = `https://ufl.virtualarena.app/competitions/${competition}/seasons/${season}/${kind}`;
  // Workers supports manual redirect handling; never follow an upstream redirect.
  const response = await fetcher(source, {redirect:'manual', signal:AbortSignal.timeout(10000), headers:{'user-agent':'UncFutbolLeague.com public league sync'}});
  if (!response.ok) throw Object.assign(Error('VA unavailable'),{upstreamStatus:response.status});
  const html = await response.text();
  if (html.length > 3000000) throw Error('VA response too large');
  const match = html.match(/data-page="([^"]+)"/);
  if (!match) throw Error('VA data missing');
  const props = JSON.parse(decode(match[1])).props;
  if (props?.competition?.id !== competition || props?.season?.id !== season) throw Error('VA season mismatch');
  const result = {division, season:'2', kind, source, syncedAt:new Date().toISOString()};
  if (kind === 'standings') {
    if (!Array.isArray(props.standings) || !props.standings.length) throw Error('VA table missing');
    result.standings = props.standings.slice(0, 100).map(row => {
      const stats=['played','wins','draws','losses','goals_for','goals_against','goal_difference','points'].map(key => number(row.stats?.[key]));
      if(stats.some(value=>value===null)||!row.name||!Number.isInteger(row.team?.id))throw Error('Incomplete VA standings');
      return {teamId:row.team.id,name:text(row.name),stats};
    });
  } else {
    if (!props.leaderboards?.players) throw Error('VA stats missing');
    result.leaderboards = {players:Object.fromEntries(Object.entries(props.leaderboards.players).slice(0,50).map(([key, board]) => [key, {stat:text(board.stat), records:(board.records || []).slice(0,50).map(row => ({data:{name:text(row.data?.name)}, team:row.team ? {name:text(row.team.name)} : null, stat:number(row.stat), played:row.played == null ? null : number(row.played)}))}]))};
  }
  return result;
}
export async function onRequestGet(context) {
  const url = new URL(context.request.url), division = url.searchParams.get('division'), kind = url.searchParams.get('kind');
  if (!Object.hasOwn(competitions,division) || !['stats','standings'].includes(kind)) return Response.json({error:'Invalid league feed.'},{status:400});
  const key = new Request(`${url.origin}/api/league/live?division=${division}&kind=${kind}`);
  const cache = globalThis.caches?.default, cached = await cache?.match(key);
  if (cached) return cached;
  try {
    const response = Response.json(await loadLeagueData(division,kind), {headers:{'Cache-Control':'public, max-age=60, s-maxage=300'}});
    if (cache) {
      try {context.waitUntil(cache.put(key,response.clone()).catch(()=>{}));} catch { /* Cache failure must not hide a valid official response. */ }
    }
    return response;
  } catch(error) {
    const runtimeReason=/redirect/i.test(error.message)?'redirect_mode':/invocation|this reference/i.test(error.message)?'runtime_binding':/timeout|aborted/i.test(error.message)?'upstream_timeout':/JSON|Unexpected token/i.test(error.message)?'upstream_format':/fetch|network|DNS|TLS|SSL/i.test(error.message)?'upstream_network':'request_failed';
    const reason=['VA unavailable','VA response too large','VA data missing','VA season mismatch','VA table missing','VA stats missing','Incomplete VA standings'].includes(error.message)?error.message:runtimeReason;
    console.warn('Public league feed unavailable', {upstreamStatus:error.upstreamStatus||null,reason});
    return Response.json({error:'Official data is temporarily unavailable. Showing the last saved update.',upstreamStatus:error.upstreamStatus||null,reason},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
