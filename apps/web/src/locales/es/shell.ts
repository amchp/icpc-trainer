export const shell = {
  nav: {
    findProblems: "Buscar problemas",
    upsolving: "Upsolving",
    contests: "Concursos",
    contestFinder: "Buscar concursos",
    resources: "Recursos",
    team: "Equipo",
    friends: "Amigos",
    judges: "Jueces"
  },
  sections: {
    contestsLabel: "Herramientas de concursos",
    peopleLabel: "Personas",
    contestFinder: "Buscar concursos",
    contests: "Concursos",
    team: "Equipo",
    friends: "Amigos"
  },
  sync: "Sincronizar",
  openNavigation: "Abrir navegación",
  closeNavigation: "Cerrar navegación",
  preparingSession: "Preparando tu sesión...",
  loadingAccount: "Cargando tu cuenta...",
  judgeNotConnectedTitle: "La autenticación de {{judge}} no está conectada",
  judgeNotConnectedDescription: "{{judge}} tiene concursos simulados guardados. Vuelve a conectarlo desde Jueces para sincronizar datos nuevos.",
  syncProgress: {
    regularCatalog: "Sincronización del catálogo regular",
    contests: "Sincronización de concursos",
    submissions: "Sincronización de envíos de usuarios",
    step_one: "paso",
    step_other: "pasos",
    contest_one: "concurso",
    contest_other: "concursos",
    user_one: "usuario",
    user_other: "usuarios",
    sync_one: "sincronización",
    sync_other: "sincronizaciones",
    left: "Quedan {{count}} {{unit}}",
    error: "No se pudo sincronizar {{judge}}",
    complete: "Sincronización de {{judge}} completada",
    completion: {
      contest_one: "{{value}} concurso nuevo/actualizado",
      contest_other: "{{value}} concursos nuevos/actualizados",
      problem_one: "{{value}} problema importado",
      problem_other: "{{value}} problemas importados",
      inserted_one: "{{value}} envío nuevo",
      inserted_other: "{{value}} envíos nuevos",
      updated_one: "{{value}} envío actualizado",
      updated_other: "{{value}} envíos actualizados",
      contests: "Concursos: {{value}}",
      problems: "Problemas: {{value}}",
      submissions: "Envíos: {{inserted}}, {{updated}}",
      description: "{{contests}}. {{problems}}. {{submissions}}."
    }
  }
} as const;
