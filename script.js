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
        // Get the page content with wikitext (not plain text)
        const response = await fetch(
            `${apiUrl}?action=query&format=json&titles=${encodeURIComponent(pokemonName)}&prop=revisions&rvprop=content&origin=*`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        // Check if page exists
        if (page.missing !== undefined) {
            return null;
        }

        // Get the wikitext content
        const wikitext = page.revisions[0]['*'] || '';
        
        // Parse the wikitext to extract required information
        const pokemonData = {
            name: pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1).toLowerCase(),
            type: extractWikiSection(wikitext, ['Type', 'Types']),
            species: extractWikiSection(wikitext, ['Species']),
            physiology: extractWikiSection(wikitext, ['Physiology', 'Appearance', 'Physical characteristics']),
            behaviour: extractWikiSection(wikitext, ['Behaviour', 'Behavior', 'Personality']),
            abilities: extractWikiSection(wikitext, ['Abilities', 'Special Abilities', 'Ability']),
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
    // Split by section headers (marked by == in wikitext)
    const sections = wikitext.split(/==\s*/);
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionTitle = section.split('\n')[0].toLowerCase().trim();
        
        // Check if this section matches one of our target names
        if (sectionNames.some(name => sectionTitle.includes(name.toLowerCase()))) {
            // Get the content of this section (skip the title)
            const lines = section.split('\n').slice(1);
            let content = [];
            
            // Collect lines until we hit another section or template
            for (let line of lines) {
                line = line.trim();
                
                // Stop if we hit a new section or certain templates
                if (line.startsWith('==') || line.startsWith('{|') || line.startsWith('|}')) {
                    break;
                }
                
                // Skip empty lines and wiki markup
                if (line && !line.startsWith('{') && !line.startsWith('|') && !line.startsWith('*')) {
                    content.push(line);
                }
            }
            
            if (content.length > 0) {
                // Remove wiki links and format
                let result = content
                    .join(' ')
                    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2$1') // Wiki links [[text|display]] -> display
                    .replace(/'''([^']+)'''/g, '$1') // Bold
                    .replace(/''([^']+)''/g, '$1') // Italic
                    .substring(0, 500); // Limit length
                
                if (result.length === 500) {
                    result += '...';
                }
                
                return result || `Information about ${sectionNames[0]} is not available.`;
            }
        }
    }
    
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
