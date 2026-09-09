// Teil1====================================================================
// 1. GLOBALE VARIABLEN & HTML-ELEMENTE
// =========================================================================
let mappedSeriesCars = []; 
let classMapping = {}; 
let trackMapping = {}; 

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

// 🚀 REPARIERT: Holt garantiert den echten Textnamen der Strecke heraus
function getTrackName(trackId) {
    const id = String(trackId).trim();
    if (trackMapping && trackMapping[id]) {
        const trackData = trackMapping[id];
        if (typeof trackData === 'object' && trackData !== null) {
            return trackData.Name || trackData.name || `Strecke ${id}`;
        }
        return String(trackData);
    }
    return `Strecke ${id}`; 
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

function parseGenericCSV(csvText) {
    const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const delimiter = csvText.includes(';') ? ';' : ',';
    
    // 🚀 REPARIERT: Holt die Spaltenköpfe korrekt aus der ersten Zeile
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

// =========================================================================
// 2. DATEN LADEN & VERSCHMELZEN (Mit Specs & Logos!)
// =========================================================================
async function loadData() {
    try {
        // 🚀 REPARIERT: Lädt specs.csv jetzt sauber mit ein!
        const [carsResponse, serienResponse, specsResponse] = await Promise.all([
            fetch('daten.json'),
            fetch('Serien.csv'),
            fetch('specs.csv').catch(() => null)
        ]);

        if (!carsResponse.ok || !serienResponse.ok) throw new Error("Wichtige Dateien fehlen!");

        const dataset = await carsResponse.json();
        const serienText = await serienResponse.text();
        
        let specsEntries = [];
        if (specsResponse && specsResponse.ok) {
            const specsText = await specsResponse.text();
            specsEntries = parseGenericCSV(specsText);
        }
        
        classMapping = dataset.classes || dataset.classNames || dataset.Classes || {};
        trackMapping = dataset.tracks || dataset.trackNames || dataset.Tracks || {};
        
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
                // 🚀 REPARIERT: Sucht die technischen Daten aus der specs.csv
                const specRow = specsEntries.find(s => String(s.ID || s.id || '').trim() === csvId) || {};

                const brand = jsonCar.BrandName || jsonCar.brand || 'Unbekannt';
                const nation = specRow.Nation || specRow.nation || jsonCar.Nation || 'Germany';
                const year = specRow.Year || specRow.year || jsonCar.Year || '2019';
                const power = specRow.Power || specRow.power || jsonCar.Power || '570BHP';
                const weight = specRow.Weight || specRow.weight || jsonCar.Weight || '1390kg';
                const engine = specRow.Engine || specRow.engine || jsonCar.Engine || '5.2L V10';
                const drive = specRow.Drive || specRow.drive || jsonCar.Drive || 'RWD';

                const trackIds = [
                    csvCar.Strecke1, csvCar.Strecke2, csvCar.Strecke3, 
                    csvCar.Strecke4, csvCar.Strecke5, csvCar.Strecke6
                ].map(t => String(t || '').trim()).filter(t => t !== '');

                const liveries = jsonCar.liveries || jsonCar.Liveries || [];

                if (Array.isArray(liveries) && liveries.length > 0) {
                    liveries.forEach(livery => {
                        mappedSeriesCars.push({
                            Serie: csvCar.Serie || csvCar.serie,
                            Logo: csvCar.LogoPfad || csvCar.logo || '', 
                            AutoName: csvCar.Auto || csvCar.auto || jsonCar.Name,
                            ID: csvId,
                            Index: csvCar.Index || csvCar.index,
                            Class: csvCar.Class || csvCar.class,
                            Strecken: trackIds, 
                            BrandName: brand,
                            LiveryName: livery.Name || livery.name || 'Standard Design',
                            TeamName: livery.TeamName || livery.teamName || brand,
                            DriversRaw: livery,                           
                            Image: 'http://game.raceroom.com/store/image_redirect?id=' + (livery.Id || livery.id || csvId) + '&size=small',
                            Nation: nation, Year: year, Power: power, Weight: weight, Engine: engine, Drive: drive
                        });
                    });
                } else {
                    mappedSeriesCars.push({
                        Serie: csvCar.Serie || csvCar.serie,
                        Logo: csvCar.LogoPfad || csvCar.logo || '', 
                        AutoName: csvCar.Auto || csvCar.auto || jsonCar.Name,
                        ID: csvId,
                        Index: csvCar.Index || csvCar.index,
                        Class: csvCar.Class || csvCar.class,
                        Strecken: trackIds, 
                        BrandName: brand,
                        LiveryName: 'Standard Design',
                        TeamName: brand,
                        DriversRaw: [],
                        Image: 'https://raceroom.com/store/image_redirect?id=' + csvId + '&size=small',
                        Nation: nation, Year: year, Power: power, Weight: weight, Engine: engine, Drive: drive
                    });
                }
            }
        });

        initApp();

    } catch (error) {
        console.error("Datenfehler beim Laden:", error);
    }
}

// Teil2====================================================================
// 3. FILTER OPTIONEN DYNAMISCH BEFÜLLEN
// =========================================================================

// Befüllt das Serien-Dropdown einmalig beim ersten Laden der Seite
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

// Aktualisiert das Strecken-Dropdown basierend auf der gewählten Serie
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
        if (Array.isArray(c.Strecken)) allTracks = allTracks.concat(c.Strecken);
    });

    const uniqueTracks = [...new Set(allTracks)];
    // Sortiert die Strecken alphabetisch nach ihren echten Namen statt nach IDs
    uniqueTracks.sort((a, b) => getTrackName(a).localeCompare(getTrackName(b)));

    trackSelect.innerHTML = '<option value="all">Alle Strecken</option>';
    uniqueTracks.forEach(t => {
        const option = document.createElement('option');
        option.value = t;
        option.textContent = getTrackName(t); // 🚀 REPARIERT: Zeigt echten Namen statt [object Object]
        trackSelect.appendChild(option);
    });
    trackSelect.disabled = false;
}

// Aktualisiert das Klassen-Dropdown basierend auf der gewählten Serie
function updateClassFilter() {
    if (!classSelect || !serieSelect) return;
    const selectedSerie = serieSelect.value.trim();

    if (selectedSerie === 'all') {
        classSelect.innerHTML = '<option value="all">Alle Klassen</option>';
        classSelect.disabled = true;
        if (brandSelect) {
            brandSelect.innerHTML = '<option value="all">Alle Hersteller</option>';
            brandSelect.disabled = true;
        }
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
}

// Aktualisiert das Marken-Dropdown basierend auf Serie & Klasse
function updateBrandFilter() {
    if (!brandSelect || !classSelect || !serieSelect) return;
    const selectedSerie = serieSelect.value.trim();
    const selectedClass = classSelect.value.trim();

    if (selectedClass === 'all') {
        brandSelect.innerHTML = '<option value="all">Alle Hersteller</option>';
        brandSelect.disabled = true;
        return;
    }

    const filteredCars = mappedSeriesCars.filter(c => 
        String(c.Serie || '').trim() === selectedSerie && 
        String(c.Class || '').trim() === selectedClass
    );
    
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

// =========================================================================
// 4. AUTOS FILTERN UND RENDERN (Mit technologischen Daten & Strecken-Klartext)
// =========================================================================
function renderCars() {
    if (!carContainer) return;

    const selectedSerie = serieSelect ? serieSelect.value.trim() : 'all';
    const selectedClass = classSelect ? classSelect.value.trim() : 'all';
    const selectedBrand = brandSelect ? brandSelect.value.trim() : 'all';
    const selectedTrack = trackSelect ? trackSelect.value.trim() : 'all'; 

    // 🖼️ SERIENLOGO-STEUERUNG
    const logoImg = document.getElementById('serien-logo');
    if (logoImg) {
        if (selectedSerie === 'all') {
            logoImg.style.display = 'none';
            logoImg.src = '';
        } else {
            const serienMatch = mappedSeriesCars.find(c => String(c.Serie || '').trim() === selectedSerie);
            if (serienMatch && serienMatch.Logo) {
                logoImg.src = serienMatch.Logo;
                logoImg.style.display = 'block';
            } else {
                logoImg.style.display = 'none';
            }
        }
    }

    // Wenn keine Serie gewählt ist, zeige den Start-Hinweistext
    if (selectedSerie === 'all') {
        carContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #64748b; font-size: 16px; margin-top: 40px;">🏁 Bitte Rennserie wählen.</p>`;
        return;
    }

    // Filtere das verschmolzene Daten-Array nach allen ausgewählten Kriterien
    let filtered = mappedSeriesCars.filter(c => {
        const matchesSerie = (String(c.Serie || '').trim() === selectedSerie);
        const matchesClass = (selectedClass === 'all' || String(c.Class || '').trim() === selectedClass);
        const matchesBrand = (selectedBrand === 'all' || String(c.BrandName || '').trim() === selectedBrand);
        const matchesTrack = (selectedTrack === 'all' || (Array.isArray(c.Strecken) && c.Strecken.includes(selectedTrack)));
        return matchesSerie && matchesClass && matchesBrand && matchesTrack;
    });

    carContainer.innerHTML = "";
    if (filtered.length === 0) {
        carContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #64748b;">Keine Fahrzeuge für diese Filterkombination gefunden.</p>`;
        return;
    }

    // Generiere das HTML für jede einzelne Fahrzeugkarte im Raster
    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "car-card";

        // Strecken-Badges vorbereiten
        let trackBadgesHTML = "";
        if (Array.isArray(item.Strecken) && item.Strecken.length > 0) {
            item.Strecken.forEach(trackId => {
                // 🚀 REPARIERT: Nutzt getTrackName() für die Badges im Klartext
                trackBadgesHTML += `<span class="track-badge">${getTrackName(trackId)}</span>`;
            });
        } else {
            trackBadgesHTML = `<span style="color:#888; font-size:11px;">Keine Strecken zugewiesen</span>`;
        }

        // 🚀 ERWEITERT: Daten-Layout enthält jetzt die Werte aus specs.csv (Leistung, Gewicht, etc.)
        card.innerHTML = `
            <div style="background:#eee; margin:-15px -15px 15px -15px; text-align:center; height:150px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius: 4px 4px 0 0;">
                <img src="${item.Image}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='https://placehold.co';">
            </div>
            <h3>${item.AutoName}</h3>
            <div style="margin: 10px 0; font-size: 14px; line-height: 1.4;">
                <p style="margin: 4px 0;">🎨 <strong>Design:</strong> <strong>${item.LiveryName}</strong> (${item.TeamName})</p>
                <p style="margin: 4px 0;">👤 <strong>Fahrer:</strong> ${formatDrivers(item.DriversRaw)}</p>
                <hr style="border:0; border-top:1px solid #444; margin:10px 0;">
                <p style="margin: 4px 0;">🌏 <strong>Nation:</strong> ${item.Nation || '-'} | 📅 <strong>Jahr:</strong> ${item.Year || '-'}</p>
                <p style="margin: 4px 0;">⚡ <strong>Leistung:</strong> ${item.Power || '-'} | ⚖️ <strong>Gewicht:</strong> ${item.Weight || '-'}</p>
                <p style="margin: 4px 0;">🔥 <strong>Motor:</strong> ${item.Engine || '-'} | 🏃 <strong>Antrieb:</strong> ${item.Drive || '-'}</p>
		<p style="margin: 4px 0;">🔥 <strong>Index:</strong> ${item.Index || '-'}  </p>
            </div>
            <div style="margin-top: auto; display: flex; gap: 8px; flex-wrap: wrap; padding-top: 10px;">
                <span class="tag">Klasse: ${getClassName(item.Class)}</span>
                <span class="tag">Hersteller: ${item.BrandName}</span>
            </div>
        `;
        carContainer.appendChild(card);
    });
}

// =========================================================================
// 5. EVENT LISTENERS & INITIALISIERUNG
// =========================================================================
function initEventListeners() {
    if (serieSelect) {
        serieSelect.addEventListener('change', () => { 
            updateClassFilter(); 
            updateTrackFilter(); 
            renderCars(); 
        });
    }
    if (classSelect) {
        classSelect.addEventListener('change', () => { 
            updateBrandFilter(); 
            renderCars(); 
        });
    }
    if (brandSelect) {
        brandSelect.addEventListener('change', renderCars);
    }
    if (trackSelect) {
        trackSelect.addEventListener('change', renderCars);
    }
}

// Das Bindeglied: Wird am Ende von loadData() aufgerufen
function initApp() {
    initSerienFilter();
    initEventListeners();
    renderCars();
}

document.addEventListener("DOMContentLoaded", loadData);