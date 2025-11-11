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
