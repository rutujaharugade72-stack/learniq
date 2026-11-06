import "../noteExtras.css";

// Reuses the colour classes (nl-c-0 ... nl-c-5) from notes.css
const TONES = [4, 3, 2, 1, 0, 5];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function withUnit(value, unit) {
  const text = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  if (!unit) return text;
  return unit === "%" ? `${text}%` : `${text} ${unit}`;
}

// "Difference between A and B" tables
export function NoteTables({ tables }) {
  const items = list(tables);
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="nl-block-title">⚖️ Compare and contrast</h4>
      <p className="nl-block-help">Quick tables to see the differences side by side.</p>
      <div className="nl-tables">
        {items.map((t, i) => (
          <div className={`nl-table-card nl-c-${TONES[i % TONES.length]}`} key={i}>
            <h5 className="nl-table-title">{t.title}</h5>
            <div className="nl-table-scroll">
              <table className="nl-table">
                <thead>
                  <tr>
                    {list(t.columns).map((c, j) => (
                      <th key={j}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list(t.rows).map((row, r) => (
                    <tr key={r}>
                      {list(row).map((cell, k) => (
                        <td key={k}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bar charts, only for numbers that really are in the material
export function NoteCharts({ charts }) {
  const items = list(charts);
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="nl-block-title">📊 Numbers at a glance</h4>
      <p className="nl-block-help">Taken straight from your material.</p>
      <div className="nl-charts">
        {items.map((c, i) => {
          const rows = list(c.items);
          const max = Math.max(...rows.map((r) => Number(r.value) || 0), 1);
          return (
            <div className={`nl-chart-card nl-c-${TONES[(i + 1) % TONES.length]}`} key={i}>
              <h5 className="nl-table-title">{c.title}</h5>
              <div className="nl-bars">
                {rows.map((r, j) => {
                  const v = Number(r.value) || 0;
                  return (
                    <div className="nl-bar-row" key={j}>
                      <span className="nl-bar-label" title={r.label}>
                        {r.label}
                      </span>
                      <div className="nl-bar-track">
                        <div
                          className="nl-bar-fill"
                          style={{
                            width: `${Math.max(4, (v / max) * 100)}%`,
                            animationDelay: `${j * 0.08}s`,
                          }}
                        />
                      </div>
                      <span className="nl-bar-value">{withUnit(v, c.unit)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}