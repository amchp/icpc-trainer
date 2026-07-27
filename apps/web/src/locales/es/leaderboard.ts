export const leaderboard = {
  title: "Clasificación",
  subtitle: "Basada en envíos sincronizados almacenados.",
  populationLabel: "Población",
  judgeLabel: "Juez",
  scopes: {
    all: "Todos",
    team: "Equipo",
    friends: "Amigos",
    class: "Clase"
  },
  judges: {
    all: "Todos los jueces"
  },
  dates: {
    label: "Fechas de solución",
    from: "Desde",
    through: "Hasta",
    clear: "Limpiar",
    incomplete: "Elige ambas fechas para aplicar un período.",
    reversed: "La fecha final no puede ser anterior a la inicial.",
    invalid: "Introduce fechas de calendario válidas."
  },
  columns: {
    rank: "Puesto",
    user: "Usuario del juez",
    judge: "Juez",
    solved: "Resueltos"
  },
  resultCount_one: "{{value}} usuario del juez clasificado",
  resultCount_other: "{{value}} usuarios del juez clasificados",
  updatedAt: "Actualizada {{value}}",
  infiniteScroll: {
    hint: "Desplázate para cargar más",
    loading: "Cargando más usuarios del juez",
    complete: "Se cargaron todos los usuarios del juez clasificados.",
    error: "No se pudieron cargar más usuarios del juez.",
    retry: "Reintentar cargar más"
  },
  updating: "Actualizando",
  loadError: "No se pudo cargar la clasificación.",
  retry: "Reintentar",
  empty: {
    all: "Todavía no hay soluciones sincronizadas.",
    period: "No se resolvieron problemas por primera vez en este período.",
    scope: "No hay usuarios del juez clasificados en este grupo."
  },
  class: {
    manage: "Administrar clase",
    title: "Administrar clase",
    count_one: "{{value}} / {{limit}} miembro",
    count_other: "{{value}} / {{limit}} miembros",
    members: "Miembros actuales",
    empty: "La clase está vacía.",
    find: "Buscar usuarios del juez",
    searchLabel: "Buscar",
    searchPlaceholder: "Buscar usuarios existentes con soluciones",
    searchHint: "Introduce un handle para buscar usuarios del juez elegibles.",
    searching: "Buscando",
    searchError: "No se pudieron buscar usuarios del juez.",
    noCandidates: "Ningún usuario elegible fuera de la clase coincide.",
    loadError: "No se pudieron cargar los miembros de la clase.",
    limit: "La clase alcanzó el límite de 100 miembros.",
    add: "Agregar",
    remove: "Quitar",
    addAccessible: "Agregar a {{username}} a la clase",
    removeAccessible: "Quitar a {{username}} de la clase",
    close: "Cerrar administración de la clase",
    added: "Usuario del juez agregado a la clase.",
    removed: "Usuario del juez quitado de la clase.",
    updateError: "No se pudo actualizar la clase.",
    solves_one: "{{value}} problema resuelto",
    solves_other: "{{value}} problemas resueltos"
  }
} as const;
