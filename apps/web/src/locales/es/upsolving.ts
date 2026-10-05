export const upsolving = {
  title: "Upsolving",
  subtitle: "Sigue los problemas pendientes de concursos que ya simulaste",
  loadError: "No se pudo cargar Upsolving.",
  searchLabel: "Buscar problemas",
  searchPlaceholder: "Buscar problemas, concursos o jueces",
  allStatuses: "Todos los estados",
  unsolvedStatuses: "Pendientes",
  noStatuses: "Sin estados",
  status: { new: "Nuevo", attempted: "Intentado", solved: "Completado", reviewLater: "En revisión", inProgress: "En progreso" },
  actionsFor: "Acciones de estado para {{problem}}",
  actions: {
    reviewLater: "Revisar {{problem}} después",
    inProgress: "Marcar {{problem}} como En progreso",
    standard: "Restaurar el estado estándar de {{problem}}"
  },
  saveStatusError: "No se pudo guardar el estado del problema.",
  filterByStatus: "Filtrar por estado",
  statusOptions: "Opciones de estado",
  columns: { problem: "Problema", judge: "Juez", status: "Estado", rating: "Rating", solve: "% resuelto", friends: "Amigos", actions: "Acciones" },
  empty: "Aún no hay concursos simulados. Selecciona Sincronizar para actualizar tus datos.",
  noMatch: "Ningún problema coincide con los filtros actuales.",
  noSyncedTitle: "Aún no hay datos sincronizados.",
  noSyncedDescription: "Selecciona Sincronizar para actualizar los datos de tus jueces conectados."
} as const;
