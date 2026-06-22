const MAP = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function slugify(text) {
  const lower = String(text).toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (MAP[ch] !== undefined) out += MAP[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '-';
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'item';
}

module.exports = slugify;
