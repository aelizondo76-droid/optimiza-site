/**
 * Fuente única de verdad de los cupos del Programa Fundador.
 * Hoy es un conteo manual (actualizar aquí conforme se llenen cupos) — se puede
 * migrar a un conteo real desde los leads/clientes en Redis (src/lib/store.ts)
 * cuando exista un campo de "cliente activo" en el Lead.
 */
export const FOUNDER_PROGRAM_TOTAL = 5;
export const FOUNDER_PROGRAM_TAKEN = 2;

export function founderProgramSlots() {
  const taken = Math.min(FOUNDER_PROGRAM_TAKEN, FOUNDER_PROGRAM_TOTAL);
  const total = FOUNDER_PROGRAM_TOTAL;
  return {
    taken,
    total,
    label: `${taken} de ${total} lugares ocupados`,
    dotsHtml: Array.from(
      { length: total },
      (_, i) => `<span class="slot${i < taken ? ' taken' : ''}"></span>`
    ).join(''),
  };
}
