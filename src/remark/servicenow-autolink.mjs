// Build-time autolinking of ServiceNow record references, à la GitHub autolinks.
//
// A bare reference in the text (INC123, CHG456, SCTASK789, PRJ1a23v, …) is turned
// into a link to the matching ServiceNow table. It runs on the markdown AST at
// build time, so the links land in the built HTML and therefore appear both on
// the site AND in the generated PDF (WeasyPrint renders that same HTML).
//
// Rules:
//   * Only bare text is linked. Text already inside a link (Markdown link,
//     autolink, …) or inside code (inline or block) is left untouched.
//   * Prefixes are matched case-sensitively and on word boundaries, so "incident"
//     or a lowercase "inc123" in prose is not touched.
//
// The base URL defaults to the EEAS ServiceNow host; override with the
// SERVICENOW_BASE_URL env var if needed.

import {visit} from 'unist-util-visit';

const BASE = (process.env.SERVICENOW_BASE_URL || 'https://services.eeas.europa.eu').replace(/\/+$/, '');

// prefix -> ServiceNow table (the `.do` view).
const TABLES = {
  INC: 'incident',
  CHG: 'change_request',
  RITM: 'sc_req_item',
  REQ: 'sc_request',
  STRY: 'rm_story',
  PRB: 'problem',
  CTASK: 'change_task',
  SCTASK: 'sc_task',
  EPIC: 'rm_epic',
  DEFECT: 'rm_defect',
  DMND: 'dmn_demand',
  PRJ: 'task',
};

// Numeric-suffix prefixes (everything except PRJ). Longest first so, e.g.,
// SCTASK is preferred over CTASK (word boundaries make this safe anyway).
const NUMERIC = ['SCTASK', 'DEFECT', 'CTASK', 'RITM', 'STRY', 'DMND', 'EPIC', 'INC', 'CHG', 'REQ', 'PRB'];

// One regex: either <NUMERIC><digits>, or PRJ<alphanumeric containing a digit>.
// The digit requirement on PRJ avoids matching plain words like "PRJECT".
const PATTERN = new RegExp(
  `\\b(?:(${NUMERIC.join('|')})(\\d+)|(PRJ)([0-9A-Za-z]*\\d[0-9A-Za-z]*))\\b`,
  'g',
);

function urlFor(prefix, token) {
  return `${BASE}/${TABLES[prefix]}.do?sysparm_query=number=${token}`;
}

export default function remarkServiceNowAutolink() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;
      // Never touch text that is already a link (or a reference link).
      if (parent.type === 'link' || parent.type === 'linkReference') return;

      const value = node.value;
      PATTERN.lastIndex = 0;
      if (!PATTERN.test(value)) return;

      PATTERN.lastIndex = 0;
      const children = [];
      let last = 0;
      let match;
      while ((match = PATTERN.exec(value)) !== null) {
        const token = match[0];
        const prefix = match[1] || match[3]; // numeric branch vs PRJ branch
        if (match.index > last) {
          children.push({type: 'text', value: value.slice(last, match.index)});
        }
        children.push({
          type: 'link',
          url: urlFor(prefix, token),
          // Open external ticket links in a new tab (ignored by the PDF, which
          // just makes the anchor clickable).
          data: {hProperties: {target: '_blank', rel: 'noopener noreferrer'}},
          children: [{type: 'text', value: token}],
        });
        last = match.index + token.length;
      }
      if (last < value.length) {
        children.push({type: 'text', value: value.slice(last)});
      }

      parent.children.splice(index, 1, ...children);
      // Continue after the nodes we just inserted (they contain no matches).
      return index + children.length;
    });
  };
}
