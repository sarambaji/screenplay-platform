export const GENRES = [
  'Drama',
  'Comedy',
  'Horror',
  'Thriller',
  'Action',
  'Sci-Fi',
  'Fantasy',
  'Romance',
  'Documentary',
  'Animation',
  'Experimental'
] as const

export type Genre = (typeof GENRES)[number]

export const SUBGENRES: Record<Genre, string[]> = {
  Drama: ['Character Study', 'Family', 'Legal', 'Crime Drama'],
  Comedy: ['Rom-Com', 'Dark Comedy', 'Sitcom', 'Parody'],
  Horror: ['Psychological', 'Supernatural', 'Folk', 'Slasher', 'Found Footage'],
  Thriller: ['Psychological', 'Crime', 'Conspiracy', 'Survival'],
  Action: ['Heist', 'Spy', 'Superhero', 'Martial Arts'],
  'Sci-Fi': ['Near-Future', 'Space', 'AI', 'Cyberpunk', 'Dystopian'],
  Fantasy: ['Epic', 'Urban', 'Mythic', 'Dark Fantasy'],
  Romance: ['Slow Burn', 'Enemies to Lovers', 'Friends to Lovers', 'Second Chance'],
  Documentary: ['True Crime', 'Political', 'Nature', 'Music', 'Biographical'],
  Animation: ['Family', 'Adult', 'Fantasy', 'Experimental'],
  Experimental: ['Nonlinear', 'Meta', 'Abstract']
}

export const RECOMMENDED_TAGS = [
  'feature',
  'short film',
  'pilot',
  'mini-series',
  'anthology',
  'dark',
  'wholesome',
  'slow burn',
  'morally grey',
  'LGBTQ+',
  'diaspora',
  'immigration',
  'mental health',
  'female lead',
  'ensemble cast',
  'near-future',
  'post-apocalyptic',
  'small town',
  'big city',
  'boarding school',
  'space station',
  'heist',
  'unreliable narrator'
]

export const SCRIPT_TYPES = [
  {
    label: "Screenplay",
    value: "screenplay",
    description: "Film or TV-style script using industry-standard formatting.",
  },
  {
    label: "TV Pilot",
    value: "tv_pilot",
    description: "First episode of a television series, usually 25–60 minutes.",
  },
  {
    label: "Short Film",
    value: "short_film",
    description: "Script for films typically under 40 pages.",
  },
  {
    label: "Stage Play",
    value: "stage_play",
    description: "Theatrical play, one-act or full-length.",
  },
  {
    label: "Web Series",
    value: "web_series",
    description: "Online episodic content, scripted for digital platforms.",
  },
  {
    label: "Animation Script",
    value: "animation_script",
    description: "Scripts intended for animated films or series.",
  },
  {
    label: "Video Game Script",
    value: "video_game_script",
    description: "Story, cutscenes, and branching dialogue for games.",
  },
  {
    label: "Audio Drama",
    value: "audio_drama",
    description: "Radio drama or scripted audio fiction with no visuals.",
  },
  {
    label: "Interactive Fiction",
    value: "interactive_fiction",
    description: "Nonlinear stories with choices, branching paths, or interactivity.",
  },
  {
    label: "Other",
    value: "other",
    description: "Anything that doesn't fit into the categories above.",
  },
] as const

export type ScriptType = (typeof SCRIPT_TYPES)[number]["value"]
