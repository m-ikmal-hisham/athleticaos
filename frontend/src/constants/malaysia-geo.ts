export interface StateGeo {
    code: string;
    name: string;
    type: 'STATE' | 'FEDERAL_TERRITORY';
    districts: string[]; // Can be Divisions (Sarawak), Districts (States), or Precincts (Putrajaya)
    hasDivisions?: boolean;
}

export const SARAWAK_GEO_DATA: Record<string, string[]> = {
    'Betong': ['Betong', 'Saratok', 'Kabong', 'Pusa'],
    'Bintulu': ['Bintulu', 'Tatau', 'Sebauh'],
    'Kapit': ['Kapit', 'Belaga', 'Song', 'Bukit Mabong'],
    'Kuching': ['Kuching', 'Bau', 'Lundu'],
    'Limbang': ['Limbang', 'Lawas'],
    'Miri': ['Miri', 'Marudi', 'Subis', 'Beluru', 'Telang Usan'],
    'Mukah': ['Mukah', 'Dalat', 'Daro', 'Matu', 'Tanjung Manis'],
    'Samarahan': ['Samarahan', 'Asajaya', 'Simunjan', 'Gedong', 'Sejiro'],
    'Sarikei': ['Sarikei', 'Meradong', 'Julau', 'Pakan'],
    'Serian': ['Serian', 'Tebedu', 'Siburan'],
    'Sibu': ['Sibu', 'Kanowit', 'Selangau'],
    'Sri Aman': ['Sri Aman', 'Lubok Antu']
};

export const MALAYSIA_STATES: StateGeo[] = [
    {
        code: 'MY-01',
        name: 'Johor',
        type: 'STATE',
        districts: ['Batu Pahat', 'Johor Bahru', 'Kluang', 'Kota Tinggi', 'Kulai', 'Mersing', 'Muar', 'Pontian', 'Segamat', 'Tangkak']
    },
    {
        code: 'MY-02',
        name: 'Kedah',
        type: 'STATE',
        districts: ['Baling', 'Bandar Baharu', 'Kota Setar', 'Kuala Muda', 'Kubang Pasu', 'Kulim', 'Langkawi', 'Padang Terap', 'Pendang', 'Pokok Sena', 'Sik', 'Yan']
    },
    {
        code: 'MY-03',
        name: 'Kelantan',
        type: 'STATE',
        districts: ['Bachok', 'Gua Musang', 'Jeli', 'Kota Bharu', 'Kuala Krai', 'Machang', 'Pasir Mas', 'Pasir Puteh', 'Tanah Merah', 'Tumpat', 'Lojing']
    },
    {
        code: 'MY-04',
        name: 'Melaka',
        type: 'STATE',
        districts: ['Alor Gajah', 'Jasin', 'Melaka Tengah']
    },
    {
        code: 'MY-05',
        name: 'Negeri Sembilan',
        type: 'STATE',
        districts: ['Jelebu', 'Jempol', 'Kuala Pilah', 'Port Dickson', 'Rembau', 'Seremban', 'Tampin']
    },
    {
        code: 'MY-06',
        name: 'Pahang',
        type: 'STATE',
        districts: ['Bentong', 'Bera', 'Cameron Highlands', 'Jerantut', 'Kuantan', 'Lipis', 'Maran', 'Pekan', 'Raub', 'Rompin', 'Temerloh']
    },
    {
        code: 'MY-07',
        name: 'Penang',
        type: 'STATE',
        districts: ['Timur Laut', 'Barat Daya', 'Seberang Perai Utara', 'Seberang Perai Tengah', 'Seberang Perai Selatan']
    },
    {
        code: 'MY-08',
        name: 'Perak',
        type: 'STATE',
        districts: ['Bagan Datuk', 'Batang Padang', 'Hilir Perak', 'Hulu Perak', 'Kampar', 'Kerian', 'Kinta', 'Kuala Kangsar', 'Larut Matang & Selama', 'Manjung', 'Perak Tengah', 'Muallim']
    },
    {
        code: 'MY-09',
        name: 'Perlis',
        type: 'STATE',
        districts: [] // Perlis has no districts, managed directly
    },
    {
        code: 'MY-10',
        name: 'Selangor',
        type: 'STATE',
        districts: ['Gombak', 'Hulu Langat', 'Hulu Selangor', 'Klang', 'Kuala Langat', 'Kuala Selangor', 'Petaling', 'Sabak Bernam', 'Sepang']
    },
    {
        code: 'MY-11',
        name: 'Terengganu',
        type: 'STATE',
        districts: ['Besut', 'Dungun', 'Hulu Terengganu', 'Kemaman', 'Kuala Nerus', 'Kuala Terengganu', 'Marang', 'Setiu']
    },
    {
        code: 'MY-12',
        name: 'Sabah',
        type: 'STATE',
        districts: [
            // Divisions are primary administrative units in East Malaysia context for Organisation Type,
            // but for address city/district dropdown we list them all or group them?
            // Requirement was: "Get real State, District, Division... so this can be mapped properly"
            // For Sabah, let's list Divisions first then Districts if needed, or just flattened list of Districts?
            // Code style implies flattened list is easier for dropdown.
            // Let's use the Districts as they are more "City" like.
            'Beaufort', 'Beluran', 'Kalabakan', 'Keningau', 'Kinabatangan', 'Kota Belud', 'Kota Kinabalu',
            'Kota Marudu', 'Kuala Penyu', 'Kudat', 'Kunak', 'Lahad Datu', 'Membakut', 'Nabawan', 'Paitan',
            'Papar', 'Penampang', 'Pitas', 'Putatan', 'Ranau', 'Sandakan', 'Semporna', 'Sipitang', 'Sook',
            'Tambunan', 'Tawau', 'Telupid', 'Tenom', 'Tongod', 'Tuaran'
        ]
    },
    {
        code: 'MY-13',
        name: 'Sarawak',
        type: 'STATE',
        hasDivisions: true,
        districts: Object.keys(SARAWAK_GEO_DATA) // Lists Divisions as primary unit for compatibility, logic will handle drill-down
    },
    {
        code: 'MY-14',
        name: 'Wilayah Persekutuan Kuala Lumpur',
        type: 'FEDERAL_TERRITORY',
        districts: ['Bukit Bintang', 'Titiwangsa', 'Setiawangsa', 'Wangsa Maju', 'Batu', 'Kepong', 'Segambut', 'Lembah Pantai', 'Seputeh', 'Bandar Tun Razak', 'Cheras'] // Constituencies often used as districts
    },
    {
        code: 'MY-15',
        name: 'Wilayah Persekutuan Labuan',
        type: 'FEDERAL_TERRITORY',
        districts: []
    },
    {
        code: 'MY-16',
        name: 'Wilayah Persekutuan Putrajaya',
        type: 'FEDERAL_TERRITORY',
        districts: [
            'Presint 1', 'Presint 2', 'Presint 3', 'Presint 4', 'Presint 5', 'Presint 6', 'Presint 7', 'Presint 8', 'Presint 9', 'Presint 10',
            'Presint 11', 'Presint 12', 'Presint 13', 'Presint 14', 'Presint 15', 'Presint 16', 'Presint 17', 'Presint 18', 'Presint 19', 'Presint 20'
        ]
    }
];

export const getDistrictsForState = (stateCode: string): string[] => {
    const state = MALAYSIA_STATES.find(s => s.code === stateCode);
    return state ? state.districts : [];
};

export const getSarawakDistricts = (division: string): string[] => {
    return SARAWAK_GEO_DATA[division] || [];
};
