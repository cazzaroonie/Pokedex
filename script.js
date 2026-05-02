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

        console.log('Pokemon Data:', pokemonData);
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
        console.log('API Response:', data);
        
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
        console.log('Wikitext content (first 2000 chars):', wikitext.substring(0, 2000));
        
        // Extract data from the PokémonBox template
        const pokemonData = await extractFromPokemonBox(wikitext, pokemonName);

        return pokemonData;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

/**
 * Extract Pokémon data from the {{PokémonBox}} template
 */
async function extractFromPokemonBox(wikitext, pokemonName) {
    // Find the PokémonBox template
    const boxMatch = wikitext.match(/\{\{PokémonBox\s*([\s\S]*?)\}\}/i);
    
    if (!boxMatch) {
        console.log('No PokémonBox template found');
        return null;
    }

    const boxContent = boxMatch[1];
    console.log('PokémonBox content found');

    // Parse key-value pairs from the template
    const templateData = parseTemplateData(boxContent);
    console.log('Parsed template data:', templateData);

    // Extract ability descriptions from their dedicated pages
    console.log('Fetching ability descriptions...');
    const abilityDescription = await fetchAbilityDescription(templateData.ability);
    console.log('Ability description result:', abilityDescription);
    const hiddenAbilityDescription = await fetchAbilityDescription(templateData.h_ability);
    console.log('Hidden ability description result:', hiddenAbilityDescription);

    // Extract the information we need
    const pokemonData = {
        name: pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1).toLowerCase(),
        type: templateData.type || 'Unknown',
        species: templateData.species || 'Unknown',
        physiology: buildPhysiologyInfo(templateData),
        behaviour: extractBehaviourFromWikitext(wikitext),
        abilities: buildAbilitiesInfoWithDescriptions(templateData, abilityDescription, hiddenAbilityDescription),
        evolution: buildEvolutionInfo(templateData)
    };

    return pokemonData;
}

/**
 * Fetch ability description from its dedicated wiki page
 */
async function fetchAbilityDescription(abilityName) {
    if (!abilityName) {
        console.log('No ability name provided');
        return null;
    }

    const apiUrl = 'https://pokemon.fandom.com/api.php';
    
    try {
        // Try multiple URL formats
        const urlFormats = [
            `${abilityName}_(Ability)`,
            `${abilityName}_Ability`,
            abilityName
        ];

        for (let urlFormat of urlFormats) {
            console.log(`Trying to fetch ability page: ${urlFormat}`);
            
            const response = await fetch(
                `${apiUrl}?action=query&format=json&titles=${encodeURIComponent(urlFormat)}&prop=revisions&rvprop=content&origin=*`
            );

            if (!response.ok) {
                console.log(`HTTP error for ${urlFormat}: ${response.status}`);
                continue;
            }

            const data = await response.json();
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            const page = pages[pageId];

            // Check if page exists
            if (page.missing === undefined && page.revisions) {
                const wikitext = page.revisions[0]['*'] || '';
                console.log(`Found ability page: ${urlFormat}`);
                
                // Extract the effect/description from the ability page
                const description = extractAbilityEffect(wikitext);
                console.log(`Extracted description for ${abilityName}:`, description);
                
                return description;
            }
        }

        console.log(`No ability page found for: ${abilityName}`);
        return null;
    } catch (error) {
        console.error(`Error fetching ability description for ${abilityName}:`, error);
        return null;
    }
}

/**
 * Extract the effect description from an ability page
 */
function extractAbilityEffect(wikitext) {
    console.log('Extracting ability effect from wikitext...');
    console.log('First 1500 chars:', wikitext.substring(0, 1500));
    
    // Look for the "In battle" or "Effect" section
    const effectPatterns = [
        /==\s*In\s+(?:the\s+core\s+series\s+)?[Gg]ames?\s*==\s*([\s\S]*?)(?===|$)/,
        /==\s*Effect\s*==\s*([\s\S]*?)(?===|$)/,
        /==\s*Description\s*==\s*([\s\S]*?)(?===|$)/,
        /==\s*In\s+battle\s*==\s*([\s\S]*?)(?===|$)/i
    ];

    for (let pattern of effectPatterns) {
        console.log(`Trying pattern: ${pattern}`);
        const match = wikitext.match(pattern);
        if (match && match[1]) {
            console.log('Pattern matched!');
            console.log('Section content (first 500 chars):', match[1].substring(0, 500));
            
            // Extract text lines and clean them
            const lines = match[1]
                .split('\n')
                .filter(line => {
                    const trimmed = line.trim();
                    // Filter out wiki markup, empty lines, and certain templates
                    return trimmed && 
                           !trimmed.startsWith('{') && 
                           !trimmed.startsWith('|') &&
                           !trimmed.startsWith('*') &&
                           !trimmed.startsWith('<');
                })
                .slice(0, 3); // Get first 1-3 sentences

            console.log('Filtered lines:', lines);

            if (lines.length > 0) {
                let text = lines.join(' ')
                    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2 $1') // Wiki links [[text|display]]
                    .replace(/'''([^']+)'''/g, '$1') // Bold
                    .replace(/''([^']+)''/g, '$1') // Italic
                    .replace(/{{Type\|([^}]+)}}/g, '$1') // Type tags {{Type|Electric}}
                    .replace(/\{\{[^}]*\}\}/g, '') // Remove remaining templates
                    .replace(/\|/g, ' ') // Replace pipes with spaces
                    .replace(/\d{1,2}\/\d{1,2}\/\d{1,2}\/\d{1,2}\/\d{1,2}\/\d{1,2}\/\d{1,2}\/\d{1,2}\/\d{1,2};?\s*/g, '') // Remove generation labels like III/IV/V/...
                    .replace(/\s+/g, ' ') // Remove extra spaces
                    .trim()
                    .substring(0, 500);

                console.log('Final text:', text);
                if (text) {
                    return text;
                }
            }
        }
    }

    console.log('No effect section found');
    return null;
}

/**
 * Parse template key-value pairs
 */
function parseTemplateData(content) {
    const data = {};
    
    // Split by pipe character (|) which separates parameters
    const params = content.split('|');
    
    for (let param of params) {
        // Split key and value by equals sign
        const [key, ...valueParts] = param.split('=');
        if (key && valueParts.length > 0) {
            const cleanKey = key.trim().toLowerCase();
            const value = valueParts.join('=').trim();
            data[cleanKey] = value;
        }
    }
    
    console.log('Parsed data keys:', Object.keys(data));
    return data;
}

/**
 * Build physiology information
 */
function buildPhysiologyInfo(data) {
    let info = [];
    
    if (data.height_im) {
        info.push(`Height: ${data.height_im}`);
    }
    if (data.weight_im) {
        info.push(`Weight: ${data.weight_im} lbs`);
    }
    if (data.color) {
        info.push(`Color: ${data.color}`);
    }
    if (data.body) {
        info.push(`Body Type: ${data.body}`);
    }
    
    return info.length > 0 ? info.join(' • ') : 'Physiology information not available.';
}

/**
 * Build abilities information with descriptions
 */
function buildAbilitiesInfoWithDescriptions(data, abilityDescription, hiddenAbilityDescription) {
    let abilities = [];
    
    if (data.ability) {
        if (abilityDescription) {
            abilities.push(`${data.ability}: ${abilityDescription}`);
        } else {
            abilities.push(data.ability);
        }
    }
    
    if (data.h_ability) {
        if (hiddenAbilityDescription) {
            abilities.push(`Hidden Ability - ${data.h_ability}: ${hiddenAbilityDescription}`);
        } else {
            abilities.push(`Hidden Ability: ${data.h_ability}`);
        }
    }
    
    return abilities.length > 0 ? abilities.join('\n\n') : 'Ability information not available.';
}

/**
 * Build evolution information
 */
function buildEvolutionInfo(data) {
    let evolution = [];
    
    if (data.evolves_from) {
        evolution.push(`Evolves from: ${data.evolves_from}`);
    }
    if (data.evolves_into) {
        evolution.push(`Evolves into: ${data.evolves_into}`);
    }
    
    return evolution.length > 0 ? evolution.join(' • ') : 'Evolution information not available.';
}

/**
 * Extract behaviour information from the main wikitext content
 */
function extractBehaviourFromWikitext(wikitext) {
    // Look for sections that might contain behaviour information
    const behaviourPatterns = [
        /==\s*(?:Personality|Behavior|Behaviour|Nature)\s*==\s*([\s\S]*?)(?===|$)/i,
        /==\s*Description\s*==\s*([\s\S]*?)(?===|$)/i
    ];
    
    for (let pattern of behaviourPatterns) {
        const match = wikitext.match(pattern);
        if (match && match[1]) {
            let text = match[1]
                .split('\n')
                .filter(line => line.trim() && !line.trim().startsWith('{') && !line.trim().startsWith('|'))
                .slice(0, 2)
                .join(' ')
                .substring(0, 500);
            
            if (text) {
                return text;
            }
        }
    }
    
    return 'Behaviour information not available.';
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
