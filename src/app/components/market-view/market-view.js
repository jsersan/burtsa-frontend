#!/usr/bin/env node
/**
 * Añade la columna "Recomendación" a la tabla de market-view SIN que tengas que editar nada a mano.
 *
 * Uso (desde la carpeta del frontend, la que contiene "src"):
 *     node patch-market-view.js --dry      # solo muestra qué haría, no toca nada
 *     node patch-market-view.js            # aplica los cambios (crea copias .bak)
 *
 * Opcional: carpeta del componente como primer argumento
 *     node patch-market-view.js src/app/components/market-view
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const dir = args.find((a) => !a.startsWith('--')) || 'src/app/components/market-view';
const htmlPath = path.join(dir, 'market-view.component.html');
const tsPath = path.join(dir, 'market-view.component.ts');
const IMPORT_LINE = "import { RecommendationBadgeComponent } from '../recommendation-badge/recommendation-badge.component'";

const log = (ok, msg) => console.log(`${ok === true ? '✔' : ok === false ? '✘' : '•'} ${msg}`);
let problems = 0;

function save(file, content) {
  if (dry) return;
  if (!fs.existsSync(file + '.bak')) fs.copyFileSync(file, file + '.bak');
  fs.writeFileSync(file, content);
}

// ------------------------------------------------------------------ HTML ---
if (!fs.existsSync(htmlPath)) {
  log(false, `No encuentro ${htmlPath}. Pásame la carpeta correcta como argumento o envíame el archivo.`);
  problems++;
} else {
  let html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes('app-recommendation-badge')) {
    log(null, 'HTML: ya tenía la columna (no hago nada).');
  } else {
    // 1) Cabecera: añadir <th> "Recomendación" justo después de <th>Hora</th>
    let nHead = 0;
    html = html.replace(/<th\b[^>]*>\s*Hora\s*<\/th>/gi, (m) => {
      nHead++;
      const open = m.match(/<th\b[^>]*>/i)[0];
      return `${m}\n${open}Recomendación</th>`;
    });
    // 2) Filas de datos: celda con "{{ x.time }}" -> añadir celda con el badge
    let nRows = 0;
    html = html.replace(/<td\b[^>]*>[\s\S]*?<\/td>/g, (m) => {
      const v = m.match(/\{\{\s*(\w+)\s*\??\.\s*time\b/);
      if (!v) return m;
      nRows++;
      return `${m}\n<td class="col-rec"><app-recommendation-badge [name]="${v[1]}.name" /></td>`;
    });
    // 3) Fila del índice (IBEX-35) con "CIERRE" literal: celda vacía para no descuadrar la tabla
    let nIdx = 0;
    html = html.replace(/<td\b[^>]*>\s*CIERRE\s*<\/td>/g, (m) => { nIdx++; return `${m}\n<td class="col-rec"></td>`; });

    log(nHead > 0, `HTML: cabecera "Recomendación" añadida en ${nHead} sitio(s).`);
    log(nRows > 0, `HTML: celda con el badge añadida en ${nRows} fila(s) de datos.`);
    log(null, `HTML: celda vacía añadida en ${nIdx} fila(s) del índice.`);
    if (!nHead || !nRows) {
      problems++;
      log(false, 'No reconozco la estructura de la tabla; NO modifico el HTML. Envíame market-view.component.html y lo hago a medida.');
    } else {
      save(htmlPath, html);
      if (nIdx === 0) log(null, 'Revisa la fila IBEX-35: si queda más corta que las demás, añade <td></td> al final de su <tr>.');
    }
  }
}

// -------------------------------------------------------------------- TS ---
if (!fs.existsSync(tsPath)) {
  log(false, `No encuentro ${tsPath}.`);
  problems++;
} else {
  let ts = fs.readFileSync(tsPath, 'utf8');
  if (ts.includes('RecommendationBadgeComponent')) {
    log(null, 'TS: ya importaba el componente (no hago nada).');
  } else {
    let ok = true;
    // import: tras el último import (admite imports multilínea)
    const re = /^import[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm;
    let last = null, m;
    while ((m = re.exec(ts)) !== null) last = m;
    if (!last) { ok = false; log(false, 'TS: no encuentro ninguna línea import.'); }
    else {
      const end = last.index + last[0].length;
      ts = ts.slice(0, end) + '\n' + IMPORT_LINE + (last[0].trimEnd().endsWith(';') ? ';' : '') + ts.slice(end);
    }
    // imports: [ ... ] del @Component
    const arr = /(imports\s*:\s*\[)([^\]]*)(\])/;
    if (!arr.test(ts)) { ok = false; log(false, 'TS: no encuentro "imports: [...]" en el @Component (¿no es standalone?).'); }
    else {
      ts = ts.replace(arr, (all, a, body, c) => {
        const t = body.trimEnd();
        const sep = t === '' ? '' : (t.endsWith(',') ? ' ' : ', ');
        return `${a}${t}${sep}RecommendationBadgeComponent${body.endsWith('\n') ? '\n' : ''}${c}`;
      });
    }
    if (ok) { save(tsPath, ts); log(true, 'TS: RecommendationBadgeComponent importado y añadido a imports.'); }
    else { problems++; log(false, 'No modifico el TS. Envíame market-view.component.ts.'); }
  }
}

console.log(dry ? '\n(modo --dry: no se ha escrito nada)' : problems ? '\nTerminado con avisos.' : '\nListo. Copias de seguridad: *.bak');
process.exit(problems ? 1 : 0);
