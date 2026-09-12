// Teil1====================================================================
// 1. GLOBALE VARIABLEN & HTML-ELEMENTE
// =========================================================================
let mappedSeriesCars = []; 
let classMapping = {}; 
let trackMapping = {};
let layoutMapping = {}; 

const carContainer = document.getElementById('car-container');
const serieSelect = document.getElementById('filter-serie');
const classSelect = document.getElementById('filter-class');
const brandSelect = document.getElementById('filter-brand');
const trackSelect = document.getElementById('filter-track'); 

// Zugriff auf die rechte Kalender-Spalte
const roundsListContainer = document.querySelector('.rounds-list');

function getClassName(classId) {
    const id = String(classId).trim();
    if (classMapping && classMapping[id]) {
        return classMapping[id].Name || classMapping[id].name || `Klasse ${id}`;
    }
    return `Klasse ${id}`; 
}

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

function getLayoutName(trackId, layoutId) {
    const lId = String(layoutId).trim();
    
    if (layoutMapping && layoutMapping[lId]) {
        return layoutMapping[lId].Name || layoutMapping[lId].name || "";
    }
    return ""; 
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
// 🚀 HAUPT-REPARATUR: Zerlegt deine CSV-Dateien absolut fehlerfrei
// =========================================================================
function parseGenericCSV(csvText) {
    const lines = csvText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    
    // Ermittelt den Trenner anhand der allerersten Zeile
    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    // 🚀 REPARIERT: Holt die Spaltenköpfe sauber aus der ersten Zeile lines[0] heraus!
    const headers = lines[0].split(delimiter).map(h => h.trim()); 
    
    const entries = [];
    for (let i = 1; i < lines.length; i++) {
        // Trennt die aktuelle Datenzeile sauber auf
        const currentLine = lines[i].split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`));
        const obj = {};
        headers.forEach((header, index) => {
            if (currentLine[index] !== undefined) {
                // Entfernt eventuelle Anführungszeichen um den Wert
                obj[header] = currentLine[index].trim().replace(/^"|"$/g, '');
            }
        });
        entries.push(obj);
    }
    return entries;
}

// =========================================================================
// 🚀 DYNAMISCHE KALENDER-ANZEIGE
// 🚀 REPARIERT: Lädt das Streckenfoto aus RennenX als echten Kachel-Hintergrund
// =========================================================================
function updateCalendar(selectedSerie) {
    if (!roundsListContainer) return;
    roundsListContainer.innerHTML = '';

    if (selectedSerie === 'all') {
        roundsListContainer.innerHTML = '<div style="color: #bbbbbb; font-size: 13px; padding: 10px;">Bitte wählen Sie eine Rennserie.</div>';
        return;
    }

    const serieData = mappedSeriesCars.find(car => car.Serie === selectedSerie);
    if (!serieData || !serieData.StreckenObjects || serieData.StreckenObjects.length === 0) {
        roundsListContainer.innerHTML = '<div style="color: #64748b; font-size: 13px; padding: 10px;">Keine Strecken gefunden.</div>';
        return;
    }

    serieData.StreckenObjects.forEach((track, index) => {
        const roundNumber = index + 1;
        const trackName = getTrackName(track.id);
        const layoutVariantName = getLayoutName(track.id, track.layoutId);
        
        const layoutTextHTML = layoutVariantName 
            ? `<span class="layout-variant-name">${layoutVariantName}</span>` 
            : '';
            
        const isActive = roundNumber === 1 ? 'active' : '';
        const fallbackImg = 'https://r3eassets.com';
        
        // 1. Das weiße Strecken-Layout (Vordergrund) aus der Layout-Spalte
        const layoutImgUrl = track.layoutId 
            ? `http://game.raceroom.com/store/image_redirect?id=${track.layoutId}&size=full`
            : fallbackImg;

        // 🚀 2. Das atmosphärische Foto (Hintergrund) aus deiner RennenX-Spalte (track.id)
        // Nutzt einen edlen, abdunkelnden linearen Farbverlauf, damit die weiße Linie perfekt lesbar bleibt
        const backgroundStyle = track.id 
            ? `background-image: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url('http://game.raceroom.com/store/image_redirect?id=${track.id}&size=full'); background-size: cover; background-position: center;`
            : 'background: #111111;';

        // 💡 UPDATE: style="${backgroundStyle}" injiziert das Foto direkt in den .track-layout-mini Kasten
        const roundCardHTML = `
            <div class="round-card ${isActive}">
                <div class="track-layout-mini" style="${backgroundStyle}">
                    <img src="${layoutImgUrl}" alt="${trackName}" onerror="this.src='${fallbackImg}';">
                </div>
                <div class="round-info">
                    <span class="round-number">RENNEN ${roundNumber}</span>
                    <span class="track-name">${trackName}</span>
                    ${layoutTextHTML}
                </div>
            </div>
        `;
        roundsListContainer.insertAdjacentHTML('beforeend', roundCardHTML);
    });
}

// ==http://game.raceroom.com/store/image_redirect?id================
// 2. DATEN LADEN & VERSCHMELZEN (Auf deine deutschen Spalten angepasst!)
// =========================================================================
async function loadData() {
    try {
        const [carsResponse, serienResponse, specsResponse] = await Promise.all([
            fetch('daten.json'),
            fetch('Serien.csv'),
            fetch('specs.csv')
        ]);

        if (!carsResponse.ok || !serienResponse.ok || !specsResponse.ok) throw new Error("Fehler beim Laden!");

        const dataset = await carsResponse.json();
        const serienText = await serienResponse.text();
        const specsText = await specsResponse.text();
        
        classMapping = dataset.classes || dataset.classNames || dataset.Classes || {};
        trackMapping = dataset.tracks || dataset.trackNames || dataset.Tracks || {};
        layoutMapping = dataset.layouts || dataset.Layouts || {}; 

        const csvSerien = parseGenericCSV(serienText);
        const specsEntries = parseGenericCSV(specsText);
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
                // Sucht das passende Auto in der specs.csv heraus
                const specRow = specsEntries.find(s => String(s.ID || s.id || s.Id || '').trim() === csvId) || {};

                // Mappt die deutschen Spaltennamen aus deiner specs.csv
                const brand = jsonCar.BrandName || jsonCar.brand || 'Unbekannt';
                const nation = specRow.Nation || specRow.nation || 'Germany';
                const year = specRow.Baujahr || specRow.baujahr || '2020';
                const power = specRow.Leistung || specRow.leistung || '570BHP';
                const weight = specRow.Gewicht || specRow.gewicht || '1390kg';
                const engine = specRow.Motor || specRow.motor || 'V8';
                const drive = specRow.Antrieb || specRow.antrieb || 'RWD';

                const keys = Object.keys(csvCar);
                const laengeKey = keys.find(k => k.toLowerCase().trim().includes('länge') || k.toLowerCase().trim().includes('laenge'));
                const pitstopKey = keys.find(k => k.toLowerCase().trim().includes('pitstop') || k.toLowerCase().trim().includes('boxen'));

                const extraLaenge = laengeKey ? csvCar[laengeKey] : '';
                const extraPitstop = pitstopKey ? csvCar[pitstopKey] : '';

                const trackObjects = [];
                for (let r = 1; r <= 6; r++) {
                    const trackKey = keys.find(k => k.trim() === `Rennen${r}`);
                    const layoutKey = keys.find(k => k.trim() === `Layout${r}`);
                    
                    const trackId = trackKey ? String(csvCar[trackKey] || '').trim() : '';
                    const layoutId = layoutKey ? String(csvCar[layoutKey] || '').trim() : '';
                    
                    if (trackId !== '') {
                        trackObjects.push({ id: trackId, layoutId: layoutId });
                    }
                }

                const trackIdsOnly = trackObjects.map(t => t.id);
                const liveries = jsonCar.liveries || jsonCar.Liveries || [];

                if (Array.isArray(liveries) && liveries.length > 0) {
                    liveries.forEach(livery => {
                        mappedSeriesCars.push({
                            Serie: csvCar.Serie || csvCar.serie,
                            Logo: csvCar.LogoPfad || csvCar.logo || '', 
                            Laenge: extraLaenge,
                            Pitstop: extraPitstop,
                            AutoName: csvCar.Auto || csvCar.auto || jsonCar.Name,
                            ID: csvId,
                            Index: csvCar.Index || csvCar.index,
                            Class: csvCar.Class || csvCar.class,
                            StreckenObjects: trackObjects,
                            Strecken: trackIdsOnly,
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
                        Laenge: extraLaenge,
                        Pitstop: extraPitstop,
                        AutoName: csvCar.Auto || csvCar.auto || jsonCar.Name,
                        ID: csvId,
                        Index: csvCar.Index || csvCar.index,
                        Class: csvCar.Class || csvCar.class,
                        StreckenObjects: trackObjects,
                        Strecken: trackIdsOnly,
                        BrandName: brand,
                        LiveryName: 'Standard Design',
                        TeamName: brand,
                        DriversRaw: [],
                        Image: 'http://game.raceroom.com/store/image_redirect?id=' + csvId + '&size=small',
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
// 4. AUTOS FILTERN UND RENDERN (Mit Serien-Meta-Infos links)
// =========================================================================
function renderCars() {
    if (!carContainer) return;

    const selectedSerie = serieSelect ? serieSelect.value.trim() : 'all';
    const selectedClass = classSelect ? classSelect.value.trim() : 'all';
    const selectedBrand = brandSelect ? brandSelect.value.trim() : 'all';
    const selectedTrack = trackSelect ? trackSelect.value.trim() : 'all'; 

// 🖼️ SERIENLOGO- & META-BOX-STEUERUNG (Optimierte Erkennung)
const logoImg = document.getElementById('serien-logo');
const metaBox = document.getElementById('series-meta-box');
const infoLaenge = document.getElementById('info-laenge');
const infoPitstop = document.getElementById('info-pitstop');

if (selectedSerie === 'all') {
    if (logoImg) { logoImg.style.display = 'none'; logoImg.src = ''; }
    if (metaBox) { metaBox.style.display = 'none'; }
} else {
    // 🚀 REPARIERT: Sucht explizit nach dem ersten Eintrag dieser Serie, der befüllte Daten besitzt
    const serienMatch = mappedSeriesCars.find(c => 
        String(c.Serie || '').trim() === selectedSerie && 
        (c.Laenge || c.Pitstop)
    ) || mappedSeriesCars.find(c => String(c.Serie || '').trim() === selectedSerie); // Fallback, falls überall leer
    
    // Logo anzeigen
    if (serienMatch && serienMatch.Logo) {
        logoImg.src = serienMatch.Logo;
        logoImg.style.display = 'block';
    } else if (logoImg) {
        logoImg.style.display = 'none';
    }

    // Text in der Meta-Box befüllen und Box einblenden
    if (serienMatch && metaBox && infoLaenge && infoPitstop) {
        // Trimmen und prüfen, ob der Wert wirklich existiert und nicht nur aus Leerzeichen besteht
        const laengeWert = String(serienMatch.Laenge || '').trim();
        const pitstopWert = String(serienMatch.Pitstop || '').trim();

        infoLaenge.textContent = laengeWert !== '' ? laengeWert : 'Keine Angabe';
        infoPitstop.textContent = pitstopWert !== '' ? pitstopWert : 'Keine Angabe';
        metaBox.style.display = 'flex';
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

        // 🚀 BEREINIGT: Die Strecken-Auflistung und die dünne Trennlinie (hr) darunter wurden entfernt
        card.innerHTML = `
            <div style="background:#eee; margin:-15px -15px 15px -15px; text-align:center; height:150px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius: 4px 4px 0 0;">
                <img src="${item.Image}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='https://placehold.co';">
            </div>
            <h3>${item.AutoName}</h3>
            <div style="margin: 10px 0; font-size: 14px; line-height: 1.4;">
                <p style="margin: 4px 0;">🎨 <strong>Design:</strong> <strong>${item.LiveryName}</strong> (${item.TeamName})</p>
                <p style="margin: 4px 0;">👤 <strong>Fahrer:</strong> ${formatDrivers(item.DriversRaw)}</p>
                <hr>
                <div style="font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <div><span class="data-label">Nation:</span> ${item.Nation}</div>
                    <div><span class="data-label">Jahr:</span> ${item.Year}</div>
                    <div><span class="data-label">Leistung:</span> ${item.Power}</div>
                    <div><span class="data-label">Gewicht:</span> ${item.Weight}</div>
                    <div><span class="data-label">Motor:</span> ${item.Engine}</div>
                    <div><span class="data-label">Antrieb:</span> ${item.Drive}</div>
		    <div><span class="data-label">Index:</span> ${item.Index}</div>
                </div>
            </div>
            <div style="margin-top: 10px; padding-top: 5px;">
                <span class="tag">Klasse: ${getClassName(item.Class)}</span>
                <span class="tag">Hersteller: ${item.BrandName}</span>
            </div>
        `;
        carContainer.appendChild(card);
    });
}

// =========================================================================
// 5. EVENT-LISTENER & INITIALISIERUNG (Bereinigte, stabile Version)
// =========================================================================
function initApp() {
    // Startet die Kern-Filter und rendert die Fahrzeuge
    initSerienFilter();
    renderCars();

    // Event-Listener für das Haupt-Dropdown (Serie)
    if (serieSelect) {
        serieSelect.addEventListener('change', () => {
            const currentSerie = serieSelect.value.trim();
            
            // Aktualisiert den rechten Kalender synchron mit der gewählten Serie
            updateCalendar(currentSerie); 
            
            // Baut die Folgedropdowns neu auf
            updateClassFilter();
            updateTrackFilter();
            
            // Zeigt die passenden Autos in der Mitte an
            renderCars();
        });
    }

    // Event-Listener für das Klassen-Dropdown
    if (classSelect) {
        classSelect.addEventListener('change', () => {
            updateBrandFilter();
            renderCars();
        });
    }

    // Event-Listener für das Hersteller-Dropdown
    if (brandSelect) {
        brandSelect.addEventListener('change', renderCars);
    }

    // Event-Listener für das Strecken-Dropdown
    if (trackSelect) {
        trackSelect.addEventListener('change', renderCars);
    }
}

// Startet den gesamten Ladevorgang beim Aufruf der Seite
loadData();