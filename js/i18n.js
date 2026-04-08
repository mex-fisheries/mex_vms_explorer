// i18n.js — Simple English/Spanish translation module

let currentLang = 'es';

const translations = {
  // Top bar
  brand:          { es: 'MEX VMS Explorer', en: 'MEX VMS Explorer' },
  vessels:        { es: 'embarcaciones', en: 'vessels' },

  // Sidebar headings
  searchVessel:   { es: 'Buscar embarcación', en: 'Search Vessel' },
  searchPlaceholder: { es: 'Nombre de embarcación...', en: 'Type a vessel name...' },
  noMatches:      { es: 'Sin resultados', en: 'No matches' },
  date:           { es: 'Fecha', en: 'Date' },
  speed:          { es: 'Velocidad', en: 'Speed' },
  filters:        { es: 'Filtros', en: 'Filters' },
  targetSpecies:  { es: 'Especie objetivo', en: 'Target Species' },
  gearType:       { es: 'Arte de pesca', en: 'Gear Type' },
  colorBy:        { es: 'Color por', en: 'Color By' },
  resetFilters:   { es: 'Restablecer filtros', en: 'Reset Filters' },
  spatialLayers:  { es: 'Otras capas espaciales', en: 'Other spatial layers' },
  showPorts:      { es: 'Mostrar puertos principales', en: 'Show Major Ports' },
  vesselsVisible: { es: 'embarcaciones visibles', en: 'vessels visible' },

  // Species labels
  finfish:  { es: 'Escama', en: 'Finfish' },
  sardine:  { es: 'Sardina', en: 'Sardine' },
  shark:    { es: 'Tiburón', en: 'Shark' },
  shrimp:   { es: 'Camarón', en: 'Shrimp' },
  tuna:     { es: 'Atún', en: 'Tuna' },
  other:    { es: 'Otro', en: 'Other' },

  // Gear labels
  trawler:    { es: 'Arrastrero', en: 'Trawler' },
  purseSeine: { es: 'Cerquero', en: 'Purse Seine' },
  longline:   { es: 'Palangrero', en: 'Longline' },

  // Vessel detail panel
  species:        { es: 'Especie', en: 'Species' },
  gear:           { es: 'Arte', en: 'Gear' },
  pingsChartTitle:{ es: 'Señales VMS por día', en: 'VMS pings by day' },
  downloadCsv:    { es: 'Descargar track (CSV)', en: 'Download track (CSV)' },
  noTrackData:    { es: 'Sin datos de rastreo este mes', en: 'No track data this month' },

  // Data note
  dataNoteHtml: {
    es: 'Todos los datos son públicos y están disponibles en BigQuery en <code>mex-fisheries.mex_vms</code>, y también en el <a href="https://mex-fisheries.github.io/mex-fisheries/es/" target="_blank">sitio web</a>. Una guía para acceder a los datos está disponible <a href="https://mex-fisheries.github.io/mex_vms/#accessing-the-data-via-r" target="_blank">aquí</a>. Para más información sobre el proyecto, contacte a <a href="https://human-ocean-systems.org/" target="_blank">Juan Carlos Villaseñor-Derbez</a>.',
    en: 'All data are publicly available in BigQuery at <code>mex-fisheries.mex_vms</code>, and also at the <a href="https://mex-fisheries.github.io/mex-fisheries/es/" target="_blank">website</a>. A guide on how to access them is available <a href="https://mex-fisheries.github.io/mex_vms/#accessing-the-data-via-r" target="_blank">here</a>. For further questions about the project you may contact <a href="https://human-ocean-systems.org/" target="_blank">Juan Carlos Villaseñor-Derbez</a>.'
  },

  // Color-by options
  colorGear:    { es: 'Arte de pesca', en: 'Gear Type' },
  colorSpecies: { es: 'Especie objetivo', en: 'Target Species' },

  // Playback
  playbackSpeed: { es: 'Velocidad', en: 'Speed' },

  // Loading
  loadingData: { es: 'Cargando datos...', en: 'Loading data...' },
  loadingMonth:{ es: 'Cargando', en: 'Loading' },
};

export function t(key) {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLang] || entry['es'] || key;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  applyTranslations();
}

// Sweep all elements with data-i18n attribute and update their text
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });
}

// Species/gear label arrays that update with language
export function speciesLabels() {
  return [t('finfish'), t('sardine'), t('shark'), t('shrimp'), t('tuna'), t('other')];
}

export function gearLabels() {
  return [t('trawler'), t('purseSeine'), t('longline'), t('other')];
}
