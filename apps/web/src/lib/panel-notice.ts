// Una pantalla del panel vuelve al listado con un aviso (el alta, con "Producto creado"):
// viaja en el `state` de la navegación.

export function panelNoticeState(notice: string): { panelNotice: string } {
  return { panelNotice: notice };
}

/** El aviso que guardó `panelNoticeState`, o null si no vino ninguno. */
export function panelNotice(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'panelNotice' in state) {
    const { panelNotice } = state;
    if (typeof panelNotice === 'string' && panelNotice !== '') return panelNotice;
  }

  return null;
}
