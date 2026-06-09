import { SlashCommand } from '../bot.js';
import add from './slash/add.js';
import blacklist from './slash/blacklist.js';
import canned from './slash/canned.js';
import claim from './slash/claim.js';
import close from './slash/close.js';
import help from './slash/help.js';
import note from './slash/note.js';
import ping from './slash/ping.js';
import priority from './slash/priority.js';
import remove from './slash/remove.js';
import reopen from './slash/reopen.js';
import setup from './slash/setup.js';
import sla from './slash/sla.js';
import stats from './slash/stats.js';
import tag from './slash/tag.js';
import ticket from './slash/ticket.js';
import unclaim from './slash/unclaim.js';

export const allCommands: SlashCommand[] = [
  add,
  blacklist,
  canned,
  claim,
  close,
  help,
  note,
  ping,
  priority,
  remove,
  reopen,
  setup,
  sla,
  stats,
  tag,
  ticket,
  unclaim,
] as SlashCommand[];
