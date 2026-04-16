// i18n.js — Simple English/Spanish translation module

let currentLang = 'es';

const translations = {
  // Top bar
  brand:          { es: 'MEX VMS Explorer', en: 'MEX VMS Explorer' },
  vessels:        { es: 'embarcaciones', en: 'vessels' },

  // Sidebar headings
  controlPanel:   { es: 'Panel de control', en: 'Control Panel' },
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
  showMpas:       { es: 'Mostrar áreas marinas protegidas', en: 'Show Marine Protected Areas' },
  showRegions:    { es: 'Mostrar regiones pesqueras', en: 'Show Fishing Regions' },
  showVoronoi:    { es: 'Mostrar áreas de influencia de puertos', en: 'Show Port Service Areas' },
  region:         { es: 'Región', en: 'Region' },
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

  // Data caveats and attribution (sidebar)
  dataCaveatsHtml: {
    es: 'Los puntos representan la posición media diaria (centroide) de cada embarcación. Las trayectorias conectan los centroides diarios dentro de un mes.<br><br>Los datos crudos provienen de <a href="https://datos.gob.mx/" target="_blank">Datos Abiertos</a> y son recopilados por el <a href="https://www.gob.mx/conapesca" target="_blank">SISMEP de CONAPESCA</a> (CC BY 4.0). Los datos han sido modificados: nombres de columnas estandarizados, coordenadas y fechas procesadas, y puntos en tierra eliminados. Datos procesados disponibles en BigQuery en <code>mex-fisheries.mex_vms</code> y en el <a href="https://github.com/mex-fisheries/mex_vms" target="_blank">repositorio</a>. Contacto: <a href="https://human-ocean-systems.org/" target="_blank">Juan Carlos Villaseñor-Derbez</a>.<br><br><strong>Citar:</strong> Para citar capturas de pantalla o visualizaciones de esta plataforma, use: <a href="https://doi.org/10.5281/zenodo.19608870" target="_blank"><img src="https://zenodo.org/badge/1200819322.svg" alt="DOI" style="vertical-align:middle"></a><br>Para citar los datos mismos, use la fuente original: CONAPESCA-SISMEP vía <a href="https://datos.gob.mx/" target="_blank">Datos Abiertos</a> (CC BY 4.0).',
    en: 'Points represent the daily mean position (centroid) of each vessel. Tracks connect daily centroids within a month.<br><br>Raw data come from <a href="https://datos.gob.mx/" target="_blank">Datos Abiertos</a> and are collected by <a href="https://www.gob.mx/conapesca" target="_blank">CONAPESCA\'s SISMEP</a> (CC BY 4.0). Data have been modified: column names standardized, coordinates and dates parsed, and points on land removed. Processed data available in BigQuery at <code>mex-fisheries.mex_vms</code> and on <a href="https://github.com/mex-fisheries/mex_vms" target="_blank">GitHub</a>. Contact: <a href="https://human-ocean-systems.org/" target="_blank">Juan Carlos Villaseñor-Derbez</a>.<br><br><strong>Cite:</strong> To cite screenshots or visualizations from this platform, use: <a href="https://doi.org/10.5281/zenodo.19608870" target="_blank"><img src="https://zenodo.org/badge/1200819322.svg" alt="DOI" style="vertical-align:middle"></a><br>To cite the data themselves, use the original source: CONAPESCA-SISMEP via <a href="https://datos.gob.mx/" target="_blank">Datos Abiertos</a> (CC BY 4.0).'
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
