// Teil 1 // =========================================================================
// 1. GLOBALE VARIABLEN & HILFSFUNKTIONEN
// =========================================================================
let mappedSeriesCars = []; 
let classMapping = {}; 
let trackMapping = {}; // 🚀 Wird jetzt vollautomatisch aus der daten.json befüllt!

const carContainer = document.getElementById('car-container');
const serieSelect = document.getElementById('filter-serie');
const classSelect = document.getElementById('filter-class');
const brandSelect = document.getElementById('filter-brand');
const trackSelect = document.getElementById('filter-track'); 

function getClassName(classId) {
    const id = String(classId).trim();
    if (classMapping && classMapping[id]) {
        return classMapping[id].Name || classMapping[id].name || `Klasse ${id}`;
    }
    return `Klasse ${id}`; 
}

// 🚀 Holt den automatisch geladenen Klarnamen der Strecke heraus
function getTrackName(trackId) {
    const id = String(trackId).trim();
    if (trackMapping && trackMapping[id]) {
        return trackMapping[id];
    }
    return `Strecke ${id}`; // Fallback, falls die ID nicht in der JSON existiert
}

function formatDrivers(livery) {
    const rawDrivers = livery.drivers || livery.Drivers || [];
    if (!rawDrivers || rawDrivers.length === 0) return 'Keine Fahrer';
    if (typeof rawDrivers === 'string') return rawDrivers.trim();
    if (Array.isArray(rawDrivers)) {
        return rawDrivers.map(d => {
            if (!d) return '';
            if (typeof d === 'object') {
                const first = d.Forename || d.forename || d.firstname || '';
                const last = d.Surname || d.surname || d.lastname || '';
                return `${first} ${last}`.trim();
            }
            return String(d).trim();
        }).filter(Boolean).join(', ') || 'Keine Fahrer';
    }
    return 'Keine Fahrer';
}

// =========================================================================
// 2. DATEN LADEN & RIGOROS VERSCHMELZEN
// =========================================================================
function parseGenericCSV(csvText) {
    const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const delimiter = csvText.includes(';') ? ';' : ',';
    
    const headers = lines[0].split(delimiter).map(h => h.trim()); 
    
    const entries = [];
    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(delimiter);
        const obj = {};
        headers.forEach((header, index) => {
            if (currentLine[index] !== undefined) {
                obj[header] = currentLine[index].trim();
            }
        });
        entries.push(obj);
    }
    return entries;
}

async function loadData() {
    try {
        const [carsResponse, serienResponse, specsResponse] = await Promise.all([
            fetch('daten.json'),
            fetch('Serien.csv'),
            fetch('specs.csv').catch(() => null)
        ]);

        if (!carsResponse.ok || !serienResponse.ok) throw new Error("Dateien fehlen!");

        const dataset = await carsResponse.json();
        const serienText = await serienResponse.text();
        
        let specsEntries = [];
        if (specsResponse && specsResponse.ok) {
            const specsText = await specsResponse.text();
            specsEntries = parseGenericCSV(specsText);
        }
        
        // 🚀 AUTOMATISCHES STRECKEN-MAPPING AUS DER JSON 🚀
        // Sucht flexibel nach den üblichen RaceRoom JSON-Strukturen für Strecken
        const jsonTracks = dataset.tracks || dataset.trackNames || dataset.Tracks || {};
        trackMapping = {};
        
        if (Array.isArray(jsonTracks)) {
            // Falls es eine Liste/ein Array von Strecken-Objekten ist
            jsonTracks.forEach(t => {
                const tId = String(t.Id || t.ID || t.id || '').trim();
                const tName = t.Name || t.name || '';
                if (tId && tName) trackMapping[tId] = tName;
            });
        } else {
            // Falls es ein Key-Value Objekt ist (z.B. "4247": { "Name": "Nürburgring" } oder "4247": "Nürburgring")
            Object.keys(jsonTracks).forEach(key => {
                const trackData = jsonTracks[key];
                if (typeof trackData === 'object' && trackData !== null) {
                    trackMapping[key] = trackData.Name || trackData.name || `Strecke ${key}`;
                } else {
                    trackMapping[key] = String(trackData);
                }
            });
        }
        
        classMapping = dataset.classes || dataset.classNames || dataset.Classes || {};
        const csvSerien = parseGenericCSV(serienText);
        const jsonCars = dataset.cars || dataset.Cars || dataset;

        mappedSeriesCars = [];

        csvSerien.forEach(csvCar => {
            const csvId = String(csvCar.ID || csvCar.id || '').trim();
            if (!csvId) return;

            let jsonCar = jsonCars[csvId];
            if (!jsonCar && Array.isArray(jsonCars)) {
                jsonCar = jsonCars.find(c => String(c.Id || c.ID || c.id) === csvId);
            }

            if (jsonCar) {
                const specRow = specsEntries.find(s => String(s.ID || s.id || '').trim() === csvId) || {};

                const brand = jsonCar.BrandName || jsonCar.brand || 'Unbekannt';
                const nation = specRow.Nation || specRow.nation || jsonCar.Nation || 'Germany';
                const year = specRow.Year || specRow.year || specRow.Baujahr || jsonCar.Year || '2019';
                const power = specRow.Power || specRow.power || specRow.Leistung || jsonCar.Power || '570BHP';
                const weight = specRow.Weight || specRow.weight || specRow.Gewicht || jsonCar.Weight || '1390kg';
                const engine = specRow.Engine || specRow.engine || specRow.Motor || jsonCar.Engine || '5.2L V10';
                const drive = specRow.Drive || specRow.drive || specRow.Antrieb || jsonCar.Drive || 'RWD';
                
                const trackIds = [
                    csvCar.Strecke1, csvCar.Strecke2, csvCar.Strecke3, 
                    csvCar.Strecke4, csvCar.Strecke5, csvCar.Strecke6
                ].map(t => String(t || '').trim()).filter(t => t !== '');

                const liveries = jsonCar.liveries || jsonCar.Liveries || [];

                if (Array.isArray(liveries) && liveries.length > 0) {
                    liveries.forEach(livery => {
                        mappedSeriesCars.push({
                            Serie: csvCar.Serie || csvCar.serie,
                            AutoName: csvCar.Auto || csvCar.auto || jsonCar.Name,
                            ID: csvId,
                            Index: csvCar.Index || csvCar.index,
                            Class: csvCar.Class || csvCar.class,
                            Strecken: trackIds, 
                            BrandName: brand,
                            LiveryName: livery.Name || livery.name || 'Standard Design',
                            TeamName: livery.TeamName || livery.teamName || brand,
                            DriversRaw: livery,                           
                            Image: 'https://game.raceroom.com/store/image_redirect?id=' + (livery.Id || livery.id || csvId) + '&size=small',
                            Nation: nation, Year: year, Power: power, Weight: weight, Engine: engine, Drive: drive
                        });
                    });
                } else {
                    mappedSeriesCars.push({
                        Serie: csvCar.Serie || csvCar.serie,
                        AutoName: csvCar.Auto || csvCar.auto || jsonCar.Name,
                        ID: csvId,
                        Index: csvCar.Index || csvCar.index,
                        Class: csvCar.Class || csvCar.class,
                        Strecken: trackIds, 
                        BrandName: brand,
                        LiveryName: 'Standard Design',
                        TeamName: brand,
                        Drivers: [],
                        Image: 'https://game.raceroom.com/store/image_redirect?id=' + csvId + '&size=small',
                        Nation: nation, Year: year, Power: power, Weight: weight, Engine: engine, Drive: drive
                    });
                }
            }
        });

        initSerienFilter();
        initEventListeners();
        renderCars();

    } catch (error) {
        console.error("Fehler beim Laden:", error);
        if (carContainer) carContainer.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
    }
}

// Teil 2// =========================================================================
// 3. FILTER-STEUERUNG & KARTEN RENDERING (Sonderzeichen-sicher!)
// =========================================================================
function initSerienFilter() {
    if (!serieSelect) return;
    const serien = [...new Set(mappedSeriesCars.map(c => String(c.Serie || '').trim()).filter(Boolean))].sort();
    serieSelect.innerHTML = '<option value="all">Bitte Serie wählen</option>';
    serien.forEach(s => {
        const option = document.createElement('option');
        option.value = s;
        option.textContent = s;
        serieSelect.appendChild(option);
    });
}

function updateTrackFilter() {
    if (!trackSelect || !serieSelect) return;
    const selectedSerie = serieSelect.value.trim();

    if (selectedSerie === 'all') {
        trackSelect.innerHTML = '<option value="all">Alle Strecken</option>';
        trackSelect.disabled = true;
        return;
    }

    const filteredCars = mappedSeriesCars.filter(c => String(c.Serie || '').trim() === selectedSerie);
    
    let allTracks = [];
    filteredCars.forEach(c => {
        if (Array.isArray(c.Strecken)) {
            allTracks = allTracks.concat(c.Strecken);
        }
    });

    const uniqueTracks = [...new Set(allTracks)];
    uniqueTracks.sort((a, b) => getTrackName(a).localeCompare(getTrackName(b)));

    trackSelect.innerHTML = '<option value="all">Alle Strecken</option>';
    uniqueTracks.forEach(t => {
        const option = document.createElement('option');
        option.value = t;
        option.textContent = getTrackName(t); 
        trackSelect.appendChild(option);
    });
    trackSelect.disabled = false;
}

function updateClassFilter() {
    if (!classSelect || !serieSelect) return;
    const selectedSerie = serieSelect.value.trim();

    if (selectedSerie === 'all') {
        classSelect.innerHTML = '<option value="all">Alle Klassen</option>';
        classSelect.disabled = true;
        brandSelect.innerHTML = '<option value="all">Alle Hersteller</option>';
        brandSelect.disabled = true;
        return;
    }

    const filteredCars = mappedSeriesCars.filter(c => String(c.Serie || '').trim() === selectedSerie);
    const classes = [...new Set(filteredCars.map(c => String(c.Class || '').trim()).filter(Boolean))];
    classes.sort((a, b) => getClassName(a).localeCompare(getClassName(b)));

    classSelect.innerHTML = '<option value="all">Alle Klassen</option>';
    classes.forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = getClassName(c);
        classSelect.appendChild(option);
    });
    classSelect.disabled = false;
    brandSelect.innerHTML = '<option value="all">Alle Hersteller</option>';
    brandSelect.disabled = true;
}

function updateBrandFilter() {
    if (!brandSelect || !classSelect || !serieSelect) return;
    const selectedSerie = serieSelect.value.trim();
    const selectedClass = classSelect.value.trim();

    if (selectedClass === 'all') {
        brandSelect.innerHTML = '<option value="all">Alle Hersteller</option>';
        brandSelect.disabled = true;
        return;
    }

    const filteredCars = mappedSeriesCars.filter(c => String(c.Serie || '').trim() === selectedSerie && String(c.Class || '').trim() === selectedClass);
    const brandCounts = {};
    filteredCars.forEach(c => {
        const bName = String(c.BrandName || '').trim();
        if (!brandCounts[bName]) brandCounts[bName] = 0;
        brandCounts[bName]++;
    });

    const availableBrands = Object.keys(brandCounts).sort();
    brandSelect.innerHTML = '<option value="all">Alle Hersteller</option>';
    availableBrands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = `${brand} (${brandCounts[brand]})`;
        brandSelect.appendChild(option);
    });
    brandSelect.disabled = false;
}

function renderCars() {
    if (!carContainer) return;
    const selectedSerie = serieSelect ? serieSelect.value.trim() : 'all';
    const selectedClass = classSelect ? classSelect.value.trim() : 'all';
    const selectedBrand = brandSelect ? brandSelect.value.trim() : 'all';
    const selectedTrack = trackSelect ? trackSelect.value.trim() : 'all'; 

    if (selectedSerie === 'all') {
        carContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #64748b; font-size: 16px; margin-top: 40px;">🏁 Bitte Rennserie wählen.</p>`;
        return;
    }

    let filtered = mappedSeriesCars.filter(c => {
        const matchesSerie = (String(c.Serie || '').trim() === selectedSerie);
        const matchesClass = (selectedClass === 'all' || String(c.Class || '').trim() === selectedClass);
        const matchesBrand = (selectedBrand === 'all' || String(c.BrandName || '').trim() === selectedBrand);
        const matchesTrack = (selectedTrack === 'all' || (Array.isArray(c.Strecken) && c.Strecken.includes(selectedTrack)));
        return matchesSerie && matchesClass && matchesBrand && matchesTrack;
    });

    carContainer.innerHTML = "";
    if (filtered.length === 0) {
        carContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #64748b;">Keine Fahrzeuge gefunden.</p>`;
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "car-card";
        card.style.fontSize = "14px"; card.style.lineHeight = "1.6";

        const driverList = formatDrivers(item.DriversRaw);

        let trackBadgesHTML = "";
        if (Array.isArray(item.Strecken) && item.Strecken.length > 0) {
            item.Strecken.forEach(trackId => {
                trackBadgesHTML += `<span class="track-badge">${getTrackName(trackId)}</span>`;
            });
        } else {
            trackBadgesHTML = `<span style="color:#888; font-size:11px;">Keine Strecken zugewiesen</span>`;
        }

        let htmlContent = "";
        htmlContent += '<div style="background:#eee; margin:-15px -15px 15px -15px; text-align:center; height:160px; display:flex; align-items:center; justify-content:center; overflow:hidden;">';
        htmlContent += '  <img src="' + item.Image + '" style="max-width:100%; max-height:100%; object-fit:contain;">';
        htmlContent += '</div>';
        htmlContent += '<h3 style="margin:0 0 15px 0; font-size:18px;">' + item.AutoName + '</h3>';
        htmlContent += '<div style="margin-bottom:12px;">';
        htmlContent += '  <div>🎨 <strong>Design:</strong> ' + item.LiveryName + ' (' + item.TeamName + ')</div>';
        htmlContent += '  <div>👤 <strong>Fahrer:</strong> ' + driverList + '</div>';
        htmlContent += '</div>';
        htmlContent += '<hr style="border:0; border-top:1px solid #eee; margin:12px 0;">';
        
        htmlContent += '<div style="margin-bottom:15px;">';
        htmlContent += '  <div>🌏 <strong>Nation:</strong> ' + item.Nation + '</div>';
        htmlContent += '  <div>📅 <strong>Baujahr:</strong> ' + item.Year + '</div>';
        htmlContent += '  <div>⚡ <strong>Leistung:</strong> ' + item.Power + '</div>';
        htmlContent += '  <div>⚖️ <strong>Gewicht:</strong> ' + item.Weight + '</div>';
        htmlContent += '  <div>🔥 <strong>Motor:</strong> ' + item.Engine + '</div>';
        htmlContent += '  <div>🏃 <strong>Antrieb:</strong> ' + item.Drive + '</div>';
        htmlContent += '  <div>📊 <strong>Index:</strong> ' + (item.Index || '-') + '</div>';
        htmlContent += '  <div class="track-list">🗺️ <strong>Strecken:</strong><br>' + trackBadgesHTML + '</div>';
        htmlContent += '</div>';
        
        htmlContent += '<div style="margin-top:auto; display:flex; gap:8px; flex-wrap:wrap; padding-top:10px;">';
        htmlContent += '<span class="tag">Klasse: ' + getClassName(item.Class) + '</span>';
        htmlContent += '<span class="tag">Hersteller: ' + item.BrandName + '</span>';
        htmlContent += '</div>';

        card.innerHTML = htmlContent;
        carContainer.appendChild(card);
    });
}

function initEventListeners() {
    if (serieSelect) serieSelect.addEventListener('change', () => { updateClassFilter(); updateTrackFilter(); renderCars(); });
    if (classSelect) classSelect.addEventListener('change', () => { updateBrandFilter(); renderCars(); });
    if (brandSelect) brandSelect.addEventListener('change', renderCars);
    if (trackSelect) trackSelect.addEventListener('change', renderCars); 
}

document.addEventListener("DOMContentLoaded", loadData);