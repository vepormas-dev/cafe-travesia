/** Mini guías de preparación por método (recetas base de la barra Travesía). */
export type BrewGuide = { method: string; ratio: string; dose: string; grind: string; temp: string; time: string; steps: string[] };

const G: BrewGuide[] = [
  { method: 'V60', ratio: '1:16', dose: '15 g · 250 ml', grind: 'Media-fina', temp: '92 °C', time: '2:45–3:15', steps: ['Enjuaga el filtro con agua caliente.', 'Preinfusión con 40 ml por 35 s.', 'Vierte en espiral hasta 250 ml en 3 tandas.', 'Deja drenar y disfruta.'] },
  { method: 'Chemex', ratio: '1:15', dose: '30 g · 450 ml', grind: 'Media-gruesa', temp: '94 °C', time: '4:00–4:30', steps: ['Filtro triple hacia el pico, enjuagado.', 'Preinfusión de 60 ml por 45 s.', 'Vierte lento en círculos hasta 450 ml.', 'Retira el filtro y sirve.'] },
  { method: 'AeroPress', ratio: '1:14', dose: '15 g · 210 ml', grind: 'Fina-media', temp: '85 °C', time: '2:00', steps: ['Método invertido, café adentro.', 'Agrega 210 ml y revuelve 10 s.', 'Tapa con filtro húmedo, espera 1:30.', 'Voltea y presiona en 30 s.'] },
  { method: 'Prensa francesa', ratio: '1:15', dose: '30 g · 450 ml', grind: 'Gruesa', temp: '94 °C', time: '4:00', steps: ['Agrega el café y todo el agua.', 'Revuelve suave a los 30 s.', 'Tapa sin presionar y espera 4 min.', 'Baja el émbolo despacio y sirve de una.'] },
  { method: 'Espresso', ratio: '1:2', dose: '18 g → 36 g', grind: 'Fina', temp: '93 °C', time: '25–30 s', steps: ['Distribuye y compacta parejo.', 'Purga el grupo antes de insertar.', 'Extrae 36 g en 25–30 s.', 'Ajusta la molienda según el tiempo.'] },
  { method: 'Greca', ratio: '1:10', dose: '20 g · 200 ml', grind: 'Media-fina', temp: 'Agua caliente', time: '4–5 min', steps: ['Llena la base con agua caliente hasta la válvula.', 'Café en el embudo, sin compactar.', 'Fuego medio con la tapa abierta.', 'Retira apenas empiece a burbujear.'] },
];

export function guideFor(method: string): BrewGuide {
  const m = method.toLowerCase();
  return (
    G.find((g) => m.includes(g.method.toLowerCase()) || g.method.toLowerCase().includes(m)) ?? {
      method,
      ratio: '1:15',
      dose: '15 g · 225 ml',
      grind: 'Media',
      temp: '92 °C',
      time: '3–4 min',
      steps: ['Usa agua filtrada.', 'Muele justo antes de preparar.', 'Ajusta la proporción a tu gusto.'],
    }
  );
}
