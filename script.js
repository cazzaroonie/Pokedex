// DOM Elements
const pokemonInput = document.getElementById('pokemonInput');
const searchBtn = document.getElementById('searchBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const infoCard = document.getElementById('infoCard');
const placeholder = document.getElementById('placeholder');

// Event Listeners
searchBtn.addEventListener('click', searchPokemon);
pokemonInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchPokemon();
    }
});

/**
 * Search for a Pokémon and display its information
 */
async function searchPokemon() {
    const pokemonName = pokemonInput.value.trim();

    if (!pokemonName) {
        showError('Please enter a Pokémon name');
        return;
    }

    showLoading();
    hideError();

    try {
        const pokemonData = await fetchPokemonData(pokemonName);
        
        if (!pokemonData) {
            showError(`Pokémon "${pokemonName}" not found. Please check the spelling and try again.`);
            hideLoading();
            return;
        }

        console.log('Pokemon Data:', pokemonData); // DEBUG: Log the data
        displayPokemonInfo(pokemonData);
        hideLoading();
    } catch (error) {
        console.error('Error fetching Pokémon data:', error);
        showError('An error occurred while fetching data. Please try again.');
        hideLoading();
    }
}

/**
 * Fetch Pokémon data from the Pokémon Fandom Wiki using MediaWiki API
 */
async function fetchPokemonData(pokemonName) {
    const apiUrl = 'https://pokemon.fandom.com/api.php';
    
    try {
        // Get the page content with wikitext
        const response = await fetch(
            `${apiUrl}?action=query&format=json&titles=${encodeURIComponent(pokemonName)}&prop=revisions&rvprop=content&origin=*`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // DEBUG: Log the raw API response
        
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        // Check if page exists
        if (page.missing !== undefined) {
            return null;
        }

        // Get the wikitext content
        if (!page.revisions || !page.revisions[0]) {
            console.error('No revisions found for page');
            return null;
        }

        const wikitext = page.revisions[0]['*'] || '';
        console.log('Wikitext content (first 1000 chars):', wikitext.substring(0, 1000)); // DEBUG
        
        // Parse the wikitext to extract required information
        const pokemonData = {
            name: pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1).toLowerCase(),
            type: extractWikiSection(wikitext, ['Type', 'Types']),
            species: extractWikiSection(wikitext, ['Species']),
            physiology: extractWikiSection(wikitext, ['Physiology', 'Appearance', 'Physical characteristics', 'Description']),
            behaviour: extractWikiSection(wikitext, ['Behaviour', 'Behavior', 'Personality', 'Nature']),
            abilities: extractWikiSection(wikitext, ['Abilities', 'Special Abilities', 'Ability', 'Powers']),
            evolution: extractWikiSection(wikitext, ['Evolution', 'Evolutions'])
        };

        return pokemonData;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

/**
 * Extract a specific section from wikitext content
 */
function extractWikiSection(wikitext, sectionNames) {
    console.log('Looking for sections:', sectionNames); // DEBUG
    
    // Split by section headers (marked by == in wikitext)
    const sections = wikitext.split(/==\s*([^=]+)\s*==/).filter(Boolean);
    
    // Process sections in pairs (title, content)
    for (let i = 0; i < sections.length; i += 2) {
        const sectionTitle = sections[i].toLowerCase().trim();
        const sectionContent = sections[i + 1] || '';
        
        console.log(`Checking section: "${sectionTitle}"`); // DEBUG
        
        // Check if this section matches one of our target names
        if (sectionNames.some(name => sectionTitle.includes(name.toLowerCase()))) {
            console.log(`Found matching section: ${sectionTitle}`); // DEBUG
            
            const lines = sectionContent.split('\n');
            let content = [];
            
            // Collect lines until we hit a template or pipe
            for (let line of lines) {
                line = line.trim();
                
                // Skip empty lines and wiki markup
                if (!line || line.startsWith('{') || line.startsWith('|') || line.startsWith('*')) {
                    continue;
                }
                
                // Stop if we hit an infobox or other template
                if (line.startsWith('{{') || line.startsWith('}}')) {
                    break;
                }
                
                content.push(line);
            }
            
            if (content.length > 0) {
                // Remove wiki links and format
                let result = content
                    .join(' ')
                    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2 $1') // Wiki links
                    .replace(/'''([^']+)'''/g, '$1') // Bold
                    .replace(/''([^']+)''/g, '$1') // Italic
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'")
                    .substring(0, 500); // Limit length
                
                if (result.length === 500) {
                    result += '...';
                }
                
                return result || `Information about ${sectionNames[0]} is not available.`;
            }
        }
    }
    
    console.log(`No matching section found for:`, sectionNames); // DEBUG
    return `Information about ${sectionNames[0]} is not available.`;
}

/**
 * Display Pokémon information on the page
 */
function displayPokemonInfo(pokemonData) {
    document.getElementById('pokemonName').textContent = pokemonData.name;
    document.getElementById('pokemonType').textContent = pokemonData.type || '-';
    document.getElementById('pokemonSpecies').textContent = pokemonData.species || '-';
    document.getElementById('pokemonPhysiology').textContent = pokemonData.physiology || '-';
    document.getElementById('pokemonBehaviour').textContent = pokemonData.behaviour || '-';
    document.getElementById('pokemonAbilities').textContent = pokemonData.abilities || '-';
    document.getElementById('pokemonEvolution').textContent = pokemonData.evolution || '-';

    placeholder.classList.add('hidden');
    infoCard.classList.remove('hidden');
}

/**
 * UI Helper Functions
 */
function showLoading() {
    loadingSpinner.classList.remove('hidden');
    infoCard.classList.add('hidden');
    placeholder.classList.add('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    infoCard.classList.add('hidden');
    placeholder.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}
