// Service configurations
window.SERVICES_CONFIG = {
    netflix: {
        id: 'netflix',
        name: 'Netflix',
        logo: 'images/netflix-logo.png',
        description: 'Stream unlimited movies and TV shows on your phone, tablet, laptop, and TV.',
        color: '#E50914',
        plans: {
            'basic': { name: 'Basic Plan', price: 199 },
            'standard': { name: 'Standard Plan', price: 499 },
            'premium': { name: 'Premium Plan', price: 649 }
        }
    },
    disney: {
        id: 'disney',
        name: 'Disney+ Hotstar',
        logo: 'images/disney-logo.png',
        description: 'Your home for entertainment with premium content from Disney, Pixar, Marvel, Star Wars, and National Geographic.',
        color: '#0063E5',
        plans: {
            'mobile': { name: 'Mobile Plan', price: 149 },
            'super': { name: 'Super Plan', price: 899 },
            'premium': { name: 'Premium Plan', price: 1499 }
        }
    },
    amazon: {
        id: 'amazon',
        name: 'Amazon Prime Video',
        logo: 'images/amazon-logo.png',
        description: 'Watch exclusive Amazon Originals, popular movies, and TV shows.',
        color: '#00A8E1',
        plans: {
            'monthly': { name: 'Monthly Plan', price: 179 },
            'quarterly': { name: 'Quarterly Plan', price: 459 },
            'annual': { name: 'Annual Plan', price: 1499 }
        }
    },
    spotify: {
        id: 'spotify',
        name: 'Spotify',
        logo: 'images/spotify-logo.png',
        description: 'Listen to millions of songs, podcasts, and create your own playlists.',
        color: '#1DB954',
        plans: {
            'individual': { name: 'Individual Plan', price: 119 },
            'duo': { name: 'Duo Plan', price: 149 },
            'family': { name: 'Family Plan', price: 179 },
            'student': { name: 'Student Plan', price: 59 }
        }
    }
}; 