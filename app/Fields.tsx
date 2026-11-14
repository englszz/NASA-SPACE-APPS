// Fondo de parcelas: hileras verticales de cultivo vistas desde arriba
// (basado en parcelas.png). Cintas onduladas en verde oscuro + surcos rectos,
// dejando ver el verde base #327a29 entre ellas.

const ROW = "#24581f";    // hilera de cultivo (onda)
const FURROW = "#1d4a19"; // surco recto

// Cinta ondulada de 20px de ancho que serpentea 7px a cada lado (periodo 40px)
const WAVE =
  "M16 0C23 4 23 16 16 20C9 24 9 36 16 40L36 40C29 36 29 24 36 20C43 16 43 4 36 0Z";

export default function Fields() {
  return (
    <div className="fields" aria-hidden="true">
      <svg width="100%" height="100%">
        <defs>
          <pattern
            id="hileras"
            width="96"
            height="40"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(1.5)"
          >
            {/* Dos hileras por bloque, la segunda desfasada para que no se vea calcada */}
            <rect x="2" width="7" height="40" fill={FURROW} opacity="0.6" />
            <path d={WAVE} fill={ROW} />
            <rect x="50" width="7" height="40" fill={FURROW} opacity="0.6" />
            <path d={WAVE} fill={ROW} transform="translate(48 12)" />
            <path d={WAVE} fill={ROW} transform="translate(48 -28)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hileras)" />
      </svg>
    </div>
  );
}
