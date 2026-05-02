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
        // First, get the page content
        const response = await fetch(
            `${apiUrl}?action=query&format=json&titles=${encodeURIComponent(pokemonName)}&prop=extracts&explaintext=true&origin=*`
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

        const content = page.extract || '';
        
        // Parse the content to extract required information
        const pokemonData = {
            name: pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1).toLowerCase(),
            type: extractSection(content, 'Type', 'Types'),
            species: extractSection(content, 'Species'),
            physiology: extractSection(content, 'Physiology', 'Appearance', 'Physical characteristics'),
            behaviour: extractSection(content, 'Behaviour', 'Behavior', 'Personality', 'Characteristics'),
            abilities: extractSection(content, 'Abilities', 'Special Abilities', 'Ability'),
            evolution: extractSection(content, 'Evolution', 'Evolutions')
        };

        return pokemonData;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

/**
 * Extract a specific section from the wiki content text
 */
function extractSection(content, ...sectionNames) {
    const lines = content.split('\n');
    let capturing = false;
    let sectionContent = [];
    let minIndentation = Infinity;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check if this line starts one of the target sections
        if (!capturing && sectionNames.some(name => 
            trimmedLine.toLowerCase().includes(name.toLowerCase()) && 
            (line.match(/^=+/) || i === 0)
        )) {
            capturing = true;
            minIndentation = line.search(/\S/);
            continue;
        }

        // If we're capturing and hit a new section header at the same or higher level, stop
        if (capturing && line.match(/^=+/) && line.search(/\S/) <= minIndentation && minIndentation !== Infinity) {
            break;
        }

        // Collect content while capturing
        if (capturing && trimmedLine && !line.match(/^=/)) {
            sectionContent.push(trimmedLine);
        }
    }

    // If no content found, return a default message
    if (sectionContent.length === 0) {
        return `Information about ${sectionNames[0]} is not available.`;
    }

    // Join and limit to a reasonable length (summarize)
    let result = sectionContent.join(' ').substring(0, 500);
    
    // If content was truncated, add ellipsis
    if (sectionContent.join(' ').length > 500) {
        result += '...';
    }

    return result || `Information about ${sectionNames[0]} is not available.`;
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
