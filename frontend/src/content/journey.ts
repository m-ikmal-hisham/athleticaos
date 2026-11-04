export type SetPiece = 'kick' | 'phase' | 'scrum' | 'lineout' | 'ruck' | 'maul' | 'try' | 'conv';

export type MilestoneStatus = 'done' | 'current' | 'next';

export interface Milestone {
    id: string;
    date: string;
    setPiece: SetPiece;
    status: MilestoneStatus;
    title: {
        en: string;
        ms: string;
    };
    text: {
        en: string;
        ms: string;
    };
}

export interface Journey {
    id: string;
    title: {
        en: string;
        ms: string;
    };
    period: {
        en: string;
        ms: string;
    };
    goal: {
        en: string;
        ms: string;
    };
    milestones: Milestone[];
}

export interface RoadmapItem {
    title: {
        en: string;
        ms: string;
    };
    testing?: boolean;
}

export interface Roadmap {
    now: RoadmapItem[];
    next: RoadmapItem[];
    later: RoadmapItem[];
}

export const JOURNEY_1: Journey = {
    id: 'build-to-launch',
    title: {
        en: 'Build to launch',
        ms: 'Bina hingga pelancaran',
    },
    period: {
        en: 'Nov 2025 – Oct 2026',
        ms: 'Nov 2025 – Okt 2026',
    },
    goal: {
        en: "We're live",
        ms: 'Kini dilancarkan',
    },
    milestones: [
        {
            id: 'first-build',
            date: 'Nov 2025',
            setPiece: 'kick',
            status: 'done',
            title: {
                en: 'First build',
                ms: 'Binaan pertama',
            },
            text: {
                en: 'Work starts on AthleticaOS: tournaments, teams, players and the first bracket generator.',
                ms: 'Kerja bermula untuk AthleticaOS: kejohanan, pasukan, pemain dan penjana braket pertama.',
            },
        },
        {
            id: 'dashboard-and-roles',
            date: 'Dec 2025',
            setPiece: 'phase',
            status: 'done',
            title: {
                en: 'Dashboard and roles',
                ms: 'Papan pemuka dan peranan',
            },
            text: {
                en: 'Organiser dashboard, role-based access and the first AthleticaOS branding.',
                ms: 'Papan pemuka penganjur, akses berasaskan peranan dan penjenamaan pertama AthleticaOS.',
            },
        },
        {
            id: 'first-tournament-tested',
            date: 'Jan 2026',
            setPiece: 'lineout',
            status: 'done',
            title: {
                en: 'First tournament tested',
                ms: 'Ujian kejohanan pertama',
            },
            text: {
                en: 'Putrajaya Super Rugby 2026 run through AthleticaOS, with results entered after the event.',
                ms: 'Putrajaya Super Rugby 2026 dikendalikan melalui AthleticaOS, dengan keputusan dimasukkan selepas acara.',
            },
        },
        {
            id: 'scoring-engine',
            date: 'Jan–Feb 2026',
            setPiece: 'scrum',
            status: 'done',
            title: {
                en: 'Scoring engine',
                ms: 'Enjin pemarkahan',
            },
            text: {
                en: 'Match scoring moves to the server so every screen shows the same score; faster tournament statistics.',
                ms: 'Pemarkahan perlawanan beralih ke pelayan supaya setiap skrin memaparkan skor yang sama; statistik kejohanan lebih pantas.',
            },
        },
        {
            id: 'staging-opens-for-testing',
            date: 'Mar 2026',
            setPiece: 'lineout',
            status: 'done',
            title: {
                en: 'Staging opens for testing',
                ms: 'Laman ujian dibuka kepada penganjur',
            },
            text: {
                en: 'Officials, team staff and a people directory, tested with organisers on our staging site.',
                ms: 'Pegawai perlawanan, staf pasukan dan direktori individu, diuji bersama penganjur di laman ujian kami.',
            },
        },
        {
            id: 'knockouts',
            date: 'Jun 2026',
            setPiece: 'phase',
            status: 'done',
            title: {
                en: 'Knockouts',
                ms: 'Peringkat kalah mati',
            },
            text: {
                en: 'Cup, Plate, Bowl and Shield brackets with automatic progression of winners and losers.',
                ms: 'Braket Cup, Plate, Bowl dan Shield dengan kemaraan automatik pemenang dan yang tewas.',
            },
        },
        {
            id: 'ready-for-real-competitions',
            date: 'Jul–Aug 2026',
            setPiece: 'phase',
            status: 'done',
            title: {
                en: 'Ready for real competitions',
                ms: 'Sedia untuk pertandingan sebenar',
            },
            text: {
                en: 'Unique match codes, discipline summaries, 16- and 32-team brackets, match timelines.',
                ms: 'Kod perlawanan unik, ringkasan disiplin, braket 16 dan 32 pasukan, garis masa perlawanan.',
            },
        },
        {
            id: 'privacy-first',
            date: 'Sep 2026',
            setPiece: 'ruck',
            status: 'done',
            title: {
                en: 'Privacy first',
                ms: 'Privasi diutamakan',
            },
            text: {
                en: 'Players identified by organiser registration numbers — identity card numbers removed from the platform.',
                ms: 'Pemain dikenal pasti melalui nombor pendaftaran penganjur — nombor kad pengenalan dikeluarkan daripada platform.',
            },
        },
        {
            id: '2026-johor-rugby-carnival',
            date: 'Sep 2026',
            setPiece: 'maul',
            status: 'done',
            title: {
                en: '2026 Johor Rugby Carnival',
                ms: '2026 Johor Rugby Carnival',
            },
            text: {
                en: 'A full test: several categories for men and women, several venues, and scoring without line-ups.',
                ms: 'Ujian penuh: pelbagai kategori lelaki dan wanita, pelbagai venue, dan pemarkahan tanpa senarai pemain.',
            },
        },
        {
            id: 'faster-for-everyone',
            date: 'Oct 2026',
            setPiece: 'ruck',
            status: 'done',
            title: {
                en: 'Faster for everyone',
                ms: 'Lebih pantas untuk semua',
            },
            text: {
                en: 'Players and teams directories load page by page — thousands of players in under half a second.',
                ms: 'Direktori pemain dan pasukan dimuatkan halaman demi halaman — ribuan pemain dalam masa kurang setengah saat.',
            },
        },
        {
            id: 'krfc-tpm-10s',
            date: '10–11 Oct 2026',
            setPiece: 'maul',
            status: 'done',
            title: {
                en: 'KRFC TPM 10s',
                ms: 'KRFC TPM 10s',
            },
            text: {
                en: 'Two days of live 10s rugby scored on AthleticaOS.',
                ms: 'Dua hari ragbi 10 sebelah secara langsung diskor menggunakan AthleticaOS.',
            },
        },
        {
            id: 'were-live',
            date: '14 Oct 2026',
            setPiece: 'try',
            status: 'done',
            title: {
                en: "We're live",
                ms: 'Kini dilancarkan',
            },
            text: {
                en: "www.athleticaos.com and app.athleticaos.com go live, hosted in Malaysia.",
                ms: 'www.athleticaos.com dan app.athleticaos.com mula beroperasi secara langsung, dihoskan di Malaysia.',
            },
        },
        {
            id: 'corporate-super-rugby-2026',
            date: '17 Oct 2026',
            setPiece: 'conv',
            status: 'done',
            title: {
                en: 'Corporate Super Rugby 2026',
                ms: 'Corporate Super Rugby 2026',
            },
            text: {
                en: 'The first competition concluded on the live platform.',
                ms: 'Pertandingan pertama yang selesai sepenuhnya di atas platform langsung.',
            },
        },
    ],
};

export const JOURNEY_2: Journey = {
    id: 'grow-the-audience',
    title: {
        en: 'Grow the audience',
        ms: 'Luaskan peminat',
    },
    period: {
        en: 'from 15 Oct 2026',
        ms: 'dari 15 Okt 2026',
    },
    goal: {
        en: 'One home for rugby in Malaysia',
        ms: 'Satu pusat ragbi di Malaysia',
    },
    milestones: [
        {
            id: 'restart',
            date: '15 Oct 2026',
            setPiece: 'kick',
            status: 'done',
            title: {
                en: 'Restart',
                ms: 'Bermula semula',
            },
            text: {
                en: 'Continuous improvement, one release at a time.',
                ms: 'Peningkatan berterusan, satu keluaran pada satu masa.',
            },
        },
        {
            id: 'phone-first-navigation',
            date: 'Oct 2026',
            setPiece: 'scrum',
            status: 'done',
            title: {
                en: 'Phone-first navigation',
                ms: 'Navigasi mesra telefon',
            },
            text: {
                en: 'A bottom tab bar and a new admin layout for phones and tablets.',
                ms: 'Bar tab bawah dan susun atur pentadbir baharu untuk telefon dan tablet.',
            },
        },
        {
            id: 'public-site-in-bahasa-melayu',
            date: 'Oct 2026',
            setPiece: 'phase',
            status: 'done',
            title: {
                en: 'Public site in Bahasa Melayu',
                ms: 'Laman awam dalam Bahasa Melayu',
            },
            text: {
                en: 'Every public page available in Bahasa Melayu.',
                ms: 'Setiap halaman awam tersedia dalam Bahasa Melayu.',
            },
        },
        {
            id: 'tournament-setup-round-2',
            date: 'Oct 2026',
            setPiece: 'ruck',
            status: 'done',
            title: {
                en: 'Tournament setup round 2',
                ms: 'Persediaan kejohanan, fasa 2',
            },
            text: {
                en: 'Seed knockouts by league position, remove empty stages and edit brackets on phones.',
                ms: 'Susun pasukan kalah mati ikut kedudukan liga, padam peringkat kosong dan sunting braket di telefon.',
            },
        },
        {
            id: 'tournament-calendar',
            date: 'Oct 2026',
            setPiece: 'phase',
            status: 'done',
            title: {
                en: 'Tournament calendar',
                ms: 'Kalendar kejohanan',
            },
            text: {
                en: 'Every match day in one view.',
                ms: 'Setiap hari perlawanan dalam satu paparan.',
            },
        },
        {
            id: 'matchday-home',
            date: 'Oct 2026',
            setPiece: 'phase',
            status: 'done',
            title: {
                en: 'Matchday home',
                ms: 'Laman hari perlawanan',
            },
            text: {
                en: 'Live, today and results in one place.',
                ms: 'Langsung, hari ini dan keputusan di satu tempat.',
            },
        },
        {
            id: 'animated-stadium',
            date: 'Oct 2026',
            setPiece: 'phase',
            status: 'done',
            title: {
                en: 'Animated stadium',
                ms: 'Stadium beranimasi',
            },
            text: {
                en: 'The animated 3D pitch and stadium behind the public pages.',
                ms: 'Padang dan stadium 3D beranimasi di belakang halaman awam.',
            },
        },
        {
            id: 'johor-rugby-league-2026',
            date: '24 Oct 2026',
            setPiece: 'maul',
            status: 'current',
            title: {
                en: 'Johor Rugby League 2026',
                ms: 'Johor Rugby League 2026',
            },
            text: {
                en: 'The league season is under way on AthleticaOS.',
                ms: 'Musim liga sedang berlangsung di AthleticaOS.',
            },
        },
        {
            id: 'privacy-notice-and-terms',
            date: 'Oct 2026',
            setPiece: 'lineout',
            status: 'next',
            title: {
                en: 'Privacy notice and terms',
                ms: 'Notis privasi dan terma',
            },
            text: {
                en: 'Written in English and Bahasa Melayu, now in final review.',
                ms: 'Ditulis dalam Bahasa Inggeris dan Bahasa Melayu, kini dalam semakan akhir.',
            },
        },
        {
            id: 'guided-tours-for-organisers',
            date: 'Q1 2027',
            setPiece: 'phase',
            status: 'next',
            title: {
                en: 'Guided tours for organisers',
                ms: 'Panduan langkah demi langkah untuk penganjur',
            },
            text: {
                en: 'Step-by-step help for setting up and running a tournament.',
                ms: 'Bantuan langkah demi langkah untuk menyediakan dan mengendalikan kejohanan.',
            },
        },
        {
            id: 'open-to-every-organiser',
            date: 'Ongoing',
            setPiece: 'lineout',
            status: 'next',
            title: {
                en: 'Open to every organiser',
                ms: 'Terbuka kepada setiap penganjur',
            },
            text: {
                en: 'Organisations, associations, clubs and partners welcome to bring their competitions.',
                ms: 'Organisasi, persatuan, kelab dan rakan kerjasama dialu-alukan membawa pertandingan mereka.',
            },
        },
        {
            id: 'one-home-for-rugby',
            date: '2027',
            setPiece: 'try',
            status: 'next',
            title: {
                en: 'One home for rugby in Malaysia',
                ms: 'Satu pusat ragbi di Malaysia',
            },
            text: {
                en: 'Fans follow every competition, and organisers keep their tournament data in one place.',
                ms: 'Peminat mengikuti setiap pertandingan, dan penganjur mengurus data kejohanan mereka di satu tempat.',
            },
        },
    ],
};

export const JOURNEYS: Journey[] = [JOURNEY_2, JOURNEY_1];

export const ROADMAP: Roadmap = {
    now: [
        {
            title: {
                en: 'Account emails (invites, password reset)',
                ms: 'E-mel akaun (jemputan, tetapan semula kata laluan)',
            },
            testing: true,
        },
    ],
    next: [
        {
            title: {
                en: 'Privacy notice and terms',
                ms: 'Notis privasi dan terma',
            },
        },
        {
            title: {
                en: 'Guided tours for organisers',
                ms: 'Panduan langkah demi langkah untuk penganjur',
            },
        },
    ],
    later: [
        {
            title: {
                en: 'Player accounts: claim your profile',
                ms: 'Akaun pemain: tuntut profil anda',
            },
        },
        {
            title: {
                en: 'Broadcast overlays and a shared match clock',
                ms: 'Tindanan siaran langsung dan jam perlawanan bersama',
            },
        },
        {
            title: {
                en: 'Mobile app (late 2027)',
                ms: 'Aplikasi mudah alih (hujung 2027)',
            },
        },
    ],
};
