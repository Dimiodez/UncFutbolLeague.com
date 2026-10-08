// Preview-only durable identities, league manager grants and approved rosters.
export const membershipSchema = [
 `CREATE TABLE IF NOT EXISTS preview_gaming_profiles(user_id TEXT PRIMARY KEY, platform TEXT NOT NULL CHECK(platform IN ('psn','ea','xbox')), account_name TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 `CREATE TABLE IF NOT EXISTS preview_league_managers(board_id TEXT NOT NULL,user_id TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,assigned_by TEXT NOT NULL,PRIMARY KEY(board_id,user_id))`,
 `CREATE TABLE IF NOT EXISTS preview_team_details(team_id TEXT PRIMARY KEY,in_game_name TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS preview_roster_members(board_id TEXT NOT NULL,team_id TEXT NOT NULL,user_id TEXT NOT NULL,approved_by TEXT NOT NULL,joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(board_id,user_id))`,
 // Preserve pre-upgrade approvals and permissions without reactivating revoked grants.
 `INSERT OR IGNORE INTO preview_league_managers(board_id,user_id,active,assigned_by) SELECT board_id,manager_id,1,'legacy-preview' FROM preview_team_requests`,
 `INSERT OR IGNORE INTO preview_roster_members(board_id,team_id,user_id,approved_by) SELECT board_id,team_id,user_id,'legacy-preview' FROM preview_player_requests WHERE status='approved'`
];
export function gamingProfile(input){
 const platform=input.platform,accountName=typeof input.accountName==='string'?input.accountName.trim():'';
 if(!['psn','ea','xbox'].includes(platform)||!accountName||accountName.length>80||/[\x00-\x1f\x7f]/.test(accountName))throw Error('Choose PSN, EA / Origin or Xbox and enter your public gaming ID (up to 80 characters). Never enter a password.');
 return {platform,accountName};
}
export const saveProfile=(db,user,profile)=>db.prepare(`INSERT INTO preview_gaming_profiles(user_id,platform,account_name) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET platform=excluded.platform,account_name=excluded.account_name,updated_at=CURRENT_TIMESTAMP`).bind(user,profile.platform,profile.accountName);
export async function canManage(db,user,boardId){return ['owner','admin'].includes(user?.role)||!!(user&&await db.prepare('SELECT user_id FROM preview_league_managers WHERE board_id=? AND user_id=? AND active=1').bind(boardId,user.discord_id).first());}
