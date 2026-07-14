export const AWARD_DEFINITIONS: Readonly<Record<string, string>> = {
  'A. Engineer':
    'Have the most cards in play that directly change your own production.',
  'A. Manufacturer': 'Have the most active, or blue, project cards in play.',
  'A. Zoologist':
    'Have the most animal and microbe resources stored on cards, combined.',
  Banker: 'Have the highest megacredit production.',
  Benefactor: 'Have the highest Terraform Rating.',
  Biologist: 'Have the most animal, plant, and microbe tags combined.',
  Blacksmith: 'Have the highest combined steel production and titanium production.',
  Botanist: 'Have the highest plant production.',
  Celebrity:
    'Have the most non-event project cards in play with a printed base cost of at least 20 megacredits.',
  Contractor: 'Have the most building tags in play.',
  'Cosmic Settler': 'Own the most city tiles located somewhere other than Mars.',
  Cultivator: 'Own the most greenery tiles.',
  Curator:
    'Have the greatest number of a single tag type in play. Event tags are excluded; only your largest individual tag total is scored.',
  'Desert Settler': 'Own the most tiles in the four southernmost rows of the map.',
  Edgedancer: 'Own the most tiles on spaces along the outer edge of the board.',
  Electrician: 'Have the most power tags in play.',
  'Estate Dealer': 'Own the most tiles adjacent to at least one ocean tile.',
  Excentric:
    'Have the most resources stored on cards in play, regardless of resource type.',
  Forecaster:
    'Have the most played cards containing requirements. Event cards normally do not count.',
  Founder:
    'Own the most tiles adjacent to special tiles. A tile adjacent to more than one special tile is still counted once.',
  Highlander: 'Own the most tiles that are not adjacent to any ocean tile.',
  Incorporator:
    'Have the most non-event project cards in play with a printed base cost of no more than 10 megacredits.',
  Industrialist: 'Have the most steel and energy resources combined.',
  Investor: 'Have the most Earth tags in play.',
  Landlord:
    'Own the most non-ocean tiles. The app also counts owned Moon tiles when the Moon expansion is active.',
  Landscaper:
    'Have the largest single connected group of your own tiles. When the Moon expansion is active, the app compares your largest Mars group with your largest Moon group and uses the larger one.',
  Magnate: 'Have the most automated, or green, project cards in play.',
  Metropolist: 'Own the most city tiles.',
  Miner: 'Have the most steel and titanium resources combined.',
  Mogul:
    'Have the highest combined production of steel, titanium, plants, energy, and heat. Megacredit production is excluded.',
  Naturalist: 'Have the highest combined plant production and heat production.',
  Promoter: 'Have the most played event cards in your event pile.',
  Scientist: 'Have the most science tags in play.',
  'Space Baron': 'Have the most space tags in play.',
  'T. Politician':
    'Place the most delegates during the game. This award is associated with the Turmoil expansion.',
  Thermalist: 'Have the most heat.',
  Tourist:
    'Have the most currently empty spaces adjacent to your tiles. Eligible Moon spaces also count when the Moon expansion is active.',
  Traveller: 'Have the most Earth and Jovian tags combined.',
  Urbanist:
    'Earn the most victory points from the adjacency scoring of your city tiles on Mars.',
  Visionary: 'Have the most cards remaining in your hand.',
  Voyager: 'Have the most Jovian tags in play.',
  Warmonger:
    "Play the most cards that reduce another player's resources or production, including event cards.",
  Zoologist: 'Have the most animal resources stored on cards.',
};

export const MILESTONE_DEFINITIONS: Readonly<Record<string, string>> = {
  Agronomist: 'Have 4 plant tags in play.',
  Architect: 'Have 3 city tags in play. This counts tags, not city tiles.',
  Builder: 'Have 8 building tags in play.',
  Capitalist:
    'Possess 64 megacredits in current money. Megacredit production does not count toward the total.',
  'C. Forester': 'Have 3 plant production.',
  Coastguard: 'Own 3 tiles adjacent to ocean tiles.',
  Colonizer: 'Have established 4 colonies.',
  Diversifier: 'Have 8 different types of tags in play.',
  Ecologist:
    'Have 4 biological tags in play. Plant, animal, and microbe tags all count.',
  Economizer: 'Have 5 heat production.',
  Energizer: 'Have 6 energy production.',
  Engineer: 'Have a combined total of 10 energy production and heat production.',
  Farmer:
    'Have a combined total of 5 animal and microbe resources stored on your cards.',
  Firestarter: 'Possess 20 heat resources. This is current heat, not heat production.',
  Forester: 'Have 4 plant production.',
  Fundraiser: 'Have 12 megacredit production.',
  Gambler: 'Personally fund 2 awards.',
  Gardener: 'Own 3 greenery tiles.',
  Generalist:
    'Increase all six production tracks by at least one step from their starting levels.',
  Geologist: 'Own 3 tiles located on or adjacent to volcanic areas.',
  Irrigator: 'Own 4 tiles adjacent to ocean tiles.',
  'Land Specialist': 'Own 3 special tiles, normally represented by brown tiles.',
  Legend: 'Have played 5 event cards, placing them in your event pile.',
  Martian: 'Have 4 Mars tags in play.',
  Mayor: 'Own 3 city tiles.',
  Minimalist: 'Have no more than 2 cards in your hand.',
  Pioneer: 'Have established 3 colonies.',
  Planner: 'Have 16 cards in your hand.',
  Planetologist:
    'Have 2 Earth tags, 2 Venus tags, and 2 Jovian tags. In the online implementation, wild tags can substitute for missing tags.',
  'Polar Explorer': 'Own 3 tiles within the two southernmost rows of the board.',
  Researcher: 'Have 4 science tags in play.',
  'Rim Settler': 'Have 3 Jovian tags in play.',
  Smith: 'Have a combined total of 6 steel production and titanium production.',
  Spacefarer: 'Have 6 space tags in play.',
  Specialist:
    'Reach 10 production in any one resource, including megacredit production.',
  Tactician:
    'Have 5 played cards with requirements. Prelude and event cards do not count.',
  'T. Collector':
    'Have 3 complete sets of project-card types: at least 3 green cards, 3 blue cards, and 3 played red event cards.',
  Terraformer:
    'Have a Terraform Rating of 35. When playing with Turmoil, the website uses a threshold of 26 TR.',
  'Terra Pioneer':
    'Own 5 tiles on Mars. Ocean tiles and off-Mars colony spaces do not count.',
  Terran: 'Have 6 Earth tags in play.',
  Tradesman:
    'Have resources of 3 different non-standard resource types. These are resources stored on cards rather than the six normal player resources.',
  Tropicalist: 'Own 3 tiles within the middle three equatorial rows of the board.',
  Tycoon: 'Have 15 non-event project cards in play. Green and blue cards count.',
  'V. Electrician': 'Have 4 power tags in play.',
  'V. Spacefarer': 'Have 4 space tags in play.',
};

export const MAP_AWARD_FALLBACKS: Readonly<Record<string, string>> = {
  hollandia: 'Randomized awards - no fixed map set.',
};

export const MAP_MILESTONE_FALLBACKS: Readonly<Record<string, string>> = {
  hollandia:
    'Uses a randomly generated selection of milestones rather than five permanent milestones.',
};
