import type { LegalDoc, LegalDocStatus, LegalDocumentModule } from './types';
import { countPlaceholdersInDoc, isDocumentPublishable } from './types';

export const version = '1.0';
export const lastUpdated = '2026-10-22';
export const status: LegalDocStatus = 'draft';

export const en: LegalDoc = {
    title: 'AthleticaOS Privacy Notice',
    sections: [
        {
            id: 'who-we-are',
            heading: '1. Who we are',
            body: [
                {
                    type: 'p',
                    text: 'AthleticaOS Rugby (www.athleticaos.com and app.athleticaos.com) is a rugby competition platform run in partnership with Ragbi Online. Until the AthleticaOS operating company completes its registration, **Ragbi Online** is responsible for the personal data on the platform (the data controller) ("we", "us"). For anything about your personal data, contact privacy@athleticaos.com.',
                },
            ],
        },
        {
            id: 'whose-data-we-handle',
            heading: '2. Whose data we handle',
            body: [
                {
                    type: 'ul',
                    items: [
                        '**Visitors** to www.athleticaos.com.',
                        '**People who contact us** through the contact form.',
                        '**Players, team officials, referees and staff** whose details are entered by their club, association or tournament organiser.',
                        '**Organisers and administrators** who have an account on app.athleticaos.com.',
                    ],
                },
            ],
        },
        {
            id: 'what-we-collect-and-why',
            heading: '3. What we collect and why',
            body: [
                {
                    type: 'table',
                    headers: ['Who', 'What', 'Why'],
                    rows: [
                        [
                            'Visitors',
                            'IP address, browser type, pages requested and time — in server logs',
                            'Keep the service secure and working, and investigate faults',
                        ],
                        [
                            'Contact form',
                            'Name, email, organisation (optional), subject, message',
                            'Reply to you. The message is stored in our system and emailed to our team',
                        ],
                        [
                            'Players, officials, staff',
                            'Name, photo, date of birth, gender, nationality, team and organisation, playing position, jersey number, state/city/country, and — not shown publicly — email, phone and address; registration number issued by the organiser; match records (appearances, scores, cards)',
                            'Run competitions: registration, team lists, line-ups, fixtures, results, statistics and discipline',
                        ],
                        [
                            'Account holders',
                            'Name, email, role, organisation, a protected (hashed) password, sign-in and activity records; one-time invitation and password reset links, which are stored only in protected form and expire',
                            'Give you access to the right tournaments, and keep an audit trail of changes to results and records',
                        ],
                    ],
                },
                {
                    type: 'p',
                    text: 'We do **not** collect identity card (MyKad) numbers, payment details, or health information.',
                },
            ],
        },
        {
            id: 'what-is-shown-publicly',
            heading: '4. What is shown publicly',
            body: [
                {
                    type: 'p',
                    text: "To make fixtures, results and statistics public, these appear on www.athleticaos.com: player name, photo, age, gender, state/city/country, team, organisation, position, jersey number, match events and statistics; team and tournament information; match officials' names where entered.",
                },
                {
                    type: 'p',
                    text: 'Email, phone, address, date of birth and registration numbers are **never** shown publicly.',
                },
                {
                    type: 'p',
                    text: 'For players under 18 we show an age group (for example "Under 16") instead of the exact age, and we do not show their city.',
                },
            ],
        },
        {
            id: 'where-the-data-comes-from',
            heading: '5. Where the data comes from',
            body: [
                {
                    type: 'p',
                    text: "Mostly from the club, association or tournament organiser that registers you. Organisers confirm they are allowed to provide the data, including consent from a parent or guardian for players under 18. Match events are recorded by authorised scorers on match day.",
                },
            ],
        },
        {
            id: 'who-we-share-it-with',
            heading: '6. Who we share it with',
            body: [
                {
                    type: 'ul',
                    items: [
                        '**The public**, as described in section 4.',
                        '**Tournament organisers and their authorised administrators**, for the tournaments and organisations they manage.',
                        '**Service providers** that host and run the platform for us: Amazon Web Services (servers, database and file storage in Malaysia; email sending in Singapore) and Microsoft 365 (our mailbox). They act on our instructions.',
                        '**Authorities**, when the law requires it.',
                    ],
                },
                {
                    type: 'p',
                    text: 'We do not sell personal data and we do not use it for advertising.',
                },
            ],
        },
        {
            id: 'transfers-outside-malaysia',
            heading: '7. Transfers outside Malaysia',
            body: [
                {
                    type: 'p',
                    text: "The platform and its data are hosted in Malaysia. Emails we send (for example, contact form notifications, account invitations and password reset links) pass through Amazon's service in Singapore, and our mailbox is hosted by Microsoft. These providers protect data to standards at least comparable to Malaysian law.",
                },
            ],
        },
        {
            id: 'how-long-we-keep-it',
            heading: '8. How long we keep it',
            body: [
                {
                    type: 'ul',
                    items: [
                        'Competition records (teams, line-ups, results, statistics) are kept as the historical record of the competition, as long as the platform runs, unless you ask us to remove or anonymise your public profile (section 10).',
                        'Contact form messages: 24 months.',
                        'Server logs: 90 days.',
                        'Account data: while the account is active, and 12 months after it is closed (the audit trail of result changes may be kept longer).',
                        'Automatic backups are kept for 7 days and then overwritten. Backups taken before an upgrade are deleted within 90 days.',
                    ],
                },
            ],
        },
        {
            id: 'security',
            heading: '9. Security',
            body: [
                {
                    type: 'p',
                    text: 'Data is encrypted in transit (HTTPS) and at rest (encrypted database and backups). Access is limited by role, passwords are stored only in hashed form, and changes to results are logged. If a breach affects your data, we will notify you and the Personal Data Protection Commissioner as the law requires.',
                },
            ],
        },
        {
            id: 'your-rights',
            heading: '10. Your rights',
            body: [
                {
                    type: 'p',
                    text: 'You can ask us to:',
                },
                {
                    type: 'ul',
                    items: [
                        'give you a copy of your personal data,',
                        'correct data that is wrong or out of date,',
                        'remove or anonymise your public profile, or stop showing particular details,',
                        'withdraw consent or limit how we use your data.',
                    ],
                },
                {
                    type: 'p',
                    text: 'Use the data request page (www.athleticaos.com/data-requests) or email privacy@athleticaos.com. We may ask you to confirm who you are, and we respond within 21 days. Where your organiser holds the original record, we may involve them. If you are not satisfied, you may complain to the Personal Data Protection Department (JPDP).',
                },
            ],
        },
        {
            id: 'cookies-and-browser-storage',
            heading: '11. Cookies and browser storage',
            body: [
                {
                    type: 'p',
                    text: 'We do not use advertising or analytics cookies, and we do not track you across websites. Your browser stores a few items locally only to make the site work:',
                },
                {
                    type: 'table',
                    headers: ['Item', 'Purpose'],
                    rows: [
                        [
                            'Sign-in token and signed-in user (`athos_token`, `auth-storage`)',
                            'Keep organisers and administrators signed in to app.athleticaos.com',
                        ],
                        [
                            'Display preferences (`athos-ui-storage`)',
                            'Light/dark theme and the last tournament you viewed',
                        ],
                        [
                            'Branding (`athleticaos-branding`)',
                            'Show your organisation\'s colours and logo',
                        ],
                        [
                            'Language (`athos-lang`)',
                            'Remember English or Bahasa Melayu',
                        ],
                    ],
                },
                {
                    type: 'p',
                    text: "Clearing your browser's site data removes them.",
                },
            ],
        },
        {
            id: 'children',
            heading: '12. Children',
            body: [
                {
                    type: 'p',
                    text: "Many players are under 18. Organisers must have a parent or guardian's consent before registering them. Parents and guardians can use section 10 on the child's behalf.",
                },
            ],
        },
        {
            id: 'changes',
            heading: '13. Changes',
            body: [
                {
                    type: 'p',
                    text: 'We will update this notice when the platform changes and show the date at the top. Significant changes will be announced on the site.',
                },
            ],
        },
        {
            id: 'language',
            heading: '14. Language',
            body: [
                {
                    type: 'p',
                    text: 'This notice is available in English and Bahasa Melayu. If the two versions differ, the English version applies.',
                },
            ],
        },
    ],
};

export const ms: LegalDoc = {
    title: 'Notis Privasi AthleticaOS',
    sections: [
        {
            id: 'who-we-are',
            heading: '1. Siapa kami',
            body: [
                {
                    type: 'p',
                    text: 'AthleticaOS Rugby (www.athleticaos.com dan app.athleticaos.com) ialah platform pengurusan pertandingan ragbi yang dikendalikan dengan kerjasama Ragbi Online. Sehingga syarikat pengendali AthleticaOS selesai didaftarkan, **Ragbi Online** bertanggungjawab ke atas data peribadi di platform ini (pengawal data) ("kami"). Untuk sebarang perkara berkaitan data peribadi anda, hubungi privacy@athleticaos.com.',
                },
            ],
        },
        {
            id: 'whose-data-we-handle',
            heading: '2. Data siapa yang kami kendalikan',
            body: [
                {
                    type: 'ul',
                    items: [
                        '**Pelawat** ke www.athleticaos.com.',
                        '**Individu yang menghubungi kami** melalui borang hubungi.',
                        '**Pemain, pegawai pasukan, pengadil dan kakitangan** yang butirannya dimasukkan oleh kelab, persatuan atau penganjur kejohanan mereka.',
                        '**Penganjur dan pentadbir** yang mempunyai akaun di app.athleticaos.com.',
                    ],
                },
            ],
        },
        {
            id: 'what-we-collect-and-why',
            heading: '3. Apa yang kami kumpul dan sebabnya',
            body: [
                {
                    type: 'table',
                    headers: ['Siapa', 'Apa', 'Sebab'],
                    rows: [
                        [
                            'Pelawat',
                            'Alamat IP, jenis pelayar, halaman yang diminta dan masa — dalam log pelayan',
                            'Memastikan perkhidmatan selamat dan berfungsi, serta menyiasat kerosakan',
                        ],
                        [
                            'Borang hubungi',
                            'Nama, e-mel, organisasi (pilihan), subjek, mesej',
                            'Membalas pertanyaan anda. Mesej disimpan dalam sistem kami dan dihantar melalui e-mel kepada pasukan kami',
                        ],
                        [
                            'Pemain, pegawai, kakitangan',
                            'Nama, gambar, tarikh lahir, jantina, kewarganegaraan, pasukan dan organisasi, posisi bermain, nombor jersi, negeri/bandar/negara, dan — tidak dipaparkan kepada umum — e-mel, telefon dan alamat; nombor pendaftaran yang dikeluarkan oleh penganjur; rekod perlawanan (penampilan, mata, kad)',
                            'Mengendalikan pertandingan: pendaftaran, senarai pasukan, barisan pemain, jadual perlawanan, keputusan, statistik dan disiplin',
                        ],
                        [
                            'Pemegang akaun',
                            'Nama, e-mel, peranan, organisasi, kata laluan yang dilindungi (dicincang), rekod log masuk dan aktiviti; pautan jemputan dan pautan set semula kata laluan sekali guna, yang disimpan dalam bentuk dilindungi sahaja dan akan tamat tempoh',
                            'Memberi anda akses kepada kejohanan yang betul, dan menyimpan jejak audit perubahan pada keputusan dan rekod',
                        ],
                    ],
                },
                {
                    type: 'p',
                    text: 'Kami **tidak** mengumpul nombor kad pengenalan (MyKad), butiran pembayaran atau maklumat kesihatan.',
                },
            ],
        },
        {
            id: 'what-is-shown-publicly',
            heading: '4. Apa yang dipaparkan kepada umum',
            body: [
                {
                    type: 'p',
                    text: 'Untuk memaparkan jadual, keputusan dan statistik kepada umum, perkara berikut dipaparkan di www.athleticaos.com: nama pemain, gambar, umur, jantina, negeri/bandar/negara, pasukan, organisasi, posisi, nombor jersi, peristiwa perlawanan dan statistik; maklumat pasukan dan kejohanan; nama pegawai perlawanan jika dimasukkan.',
                },
                {
                    type: 'p',
                    text: 'E-mel, telefon, alamat, tarikh lahir dan nombor pendaftaran **tidak pernah** dipaparkan kepada umum.',
                },
                {
                    type: 'p',
                    text: 'Bagi pemain bawah 18 tahun, kami memaparkan kumpulan umur (contohnya "Bawah 16") dan bukan umur sebenar, serta tidak memaparkan bandar mereka.',
                },
            ],
        },
        {
            id: 'where-the-data-comes-from',
            heading: '5. Dari mana data diperoleh',
            body: [
                {
                    type: 'p',
                    text: 'Kebanyakannya daripada kelab, persatuan atau penganjur kejohanan yang mendaftarkan anda. Penganjur mengesahkan bahawa mereka dibenarkan memberikan data tersebut, termasuk persetujuan ibu bapa atau penjaga bagi pemain bawah 18 tahun. Peristiwa perlawanan direkodkan oleh pencatat mata yang diberi kuasa pada hari perlawanan.',
                },
            ],
        },
        {
            id: 'who-we-share-it-with',
            heading: '6. Dengan siapa kami berkongsi',
            body: [
                {
                    type: 'ul',
                    items: [
                        '**Orang awam**, seperti yang diterangkan dalam seksyen 4.',
                        '**Penganjur kejohanan dan pentadbir mereka yang diberi kuasa**, bagi kejohanan dan organisasi yang mereka uruskan.',
                        '**Penyedia perkhidmatan** yang mengehos dan mengendalikan platform untuk kami: Amazon Web Services (pelayan, pangkalan data dan storan fail di Malaysia; penghantaran e-mel di Singapura) dan Microsoft 365 (peti mel kami). Mereka bertindak mengikut arahan kami.',
                        '**Pihak berkuasa**, apabila dikehendaki oleh undang-undang.',
                    ],
                },
                {
                    type: 'p',
                    text: 'Kami tidak menjual data peribadi dan tidak menggunakannya untuk pengiklanan.',
                },
            ],
        },
        {
            id: 'transfers-outside-malaysia',
            heading: '7. Pemindahan ke luar Malaysia',
            body: [
                {
                    type: 'p',
                    text: 'Platform dan datanya dihoskan di Malaysia. E-mel yang kami hantar (contohnya pemberitahuan borang hubungi, jemputan akaun dan pautan set semula kata laluan) melalui perkhidmatan Amazon di Singapura, dan peti mel kami dihoskan oleh Microsoft. Penyedia ini melindungi data pada tahap sekurang-kurangnya setara dengan undang-undang Malaysia.',
                },
            ],
        },
        {
            id: 'how-long-we-keep-it',
            heading: '8. Berapa lama kami menyimpan data',
            body: [
                {
                    type: 'ul',
                    items: [
                        'Rekod pertandingan (pasukan, barisan pemain, keputusan, statistik) disimpan sebagai rekod sejarah pertandingan selagi platform beroperasi, melainkan anda meminta kami membuang atau menganonimkan profil awam anda (seksyen 10).',
                        'Mesej borang hubungi: 24 bulan.',
                        'Log pelayan: 90 hari.',
                        'Data akaun: semasa akaun aktif, dan 12 bulan selepas akaun ditutup (jejak audit perubahan keputusan mungkin disimpan lebih lama).',
                        'Sandaran automatik disimpan selama 7 hari dan kemudian ditimpa. Sandaran yang diambil sebelum naik taraf dipadam dalam tempoh 90 hari.',
                    ],
                },
            ],
        },
        {
            id: 'security',
            heading: '9. Keselamatan',
            body: [
                {
                    type: 'p',
                    text: 'Data disulitkan semasa dihantar (HTTPS) dan semasa disimpan (pangkalan data dan sandaran disulitkan). Akses dihadkan mengikut peranan, kata laluan hanya disimpan dalam bentuk cincangan, dan perubahan pada keputusan direkodkan. Jika berlaku pelanggaran yang menjejaskan data anda, kami akan memaklumkan anda dan Pesuruhjaya Perlindungan Data Peribadi seperti yang dikehendaki oleh undang-undang.',
                },
            ],
        },
        {
            id: 'your-rights',
            heading: '10. Hak anda',
            body: [
                {
                    type: 'p',
                    text: 'Anda boleh meminta kami untuk:',
                },
                {
                    type: 'ul',
                    items: [
                        'memberikan salinan data peribadi anda,',
                        'membetulkan data yang salah atau tidak terkini,',
                        'membuang atau menganonimkan profil awam anda, atau berhenti memaparkan butiran tertentu,',
                        'menarik balik persetujuan atau mengehadkan cara kami menggunakan data anda.',
                    ],
                },
                {
                    type: 'p',
                    text: 'Gunakan halaman permintaan data (www.athleticaos.com/data-requests) atau e-mel privacy@athleticaos.com. Kami mungkin meminta anda mengesahkan identiti anda, dan kami akan membalas dalam tempoh 21 hari. Jika rekod asal dipegang oleh penganjur anda, kami mungkin melibatkan mereka. Jika anda tidak berpuas hati, anda boleh membuat aduan kepada Jabatan Perlindungan Data Peribadi (JPDP).',
                },
            ],
        },
        {
            id: 'cookies-and-browser-storage',
            heading: '11. Kuki dan storan pelayar',
            body: [
                {
                    type: 'p',
                    text: 'Kami tidak menggunakan kuki pengiklanan atau analitik, dan kami tidak menjejaki anda merentasi laman web lain. Pelayar anda menyimpan beberapa item secara setempat hanya supaya laman ini berfungsi:',
                },
                {
                    type: 'table',
                    headers: ['Item', 'Tujuan'],
                    rows: [
                        [
                            'Token log masuk dan pengguna log masuk (`athos_token`, `auth-storage`)',
                            'Mengekalkan log masuk penganjur dan pentadbir di app.athleticaos.com',
                        ],
                        [
                            'Pilihan paparan (`athos-ui-storage`)',
                            'Tema cerah/gelap dan kejohanan terakhir yang anda lihat',
                        ],
                        [
                            'Penjenamaan (`athleticaos-branding`)',
                            'Memaparkan warna dan logo organisasi anda',
                        ],
                        [
                            'Bahasa (`athos-lang`)',
                            'Mengingati pilihan Bahasa Inggeris atau Bahasa Melayu',
                        ],
                    ],
                },
                {
                    type: 'p',
                    text: 'Mengosongkan data laman dalam pelayar anda akan membuang item ini.',
                },
            ],
        },
        {
            id: 'children',
            heading: '12. Kanak-kanak',
            body: [
                {
                    type: 'p',
                    text: 'Ramai pemain berumur bawah 18 tahun. Penganjur mesti mendapatkan persetujuan ibu bapa atau penjaga sebelum mendaftarkan mereka. Ibu bapa dan penjaga boleh menggunakan seksyen 10 bagi pihak anak mereka.',
                },
            ],
        },
        {
            id: 'changes',
            heading: '13. Perubahan',
            body: [
                {
                    type: 'p',
                    text: 'Kami akan mengemas kini notis ini apabila platform berubah dan memaparkan tarikh di bahagian atas. Perubahan penting akan diumumkan di laman ini.',
                },
            ],
        },
        {
            id: 'language',
            heading: '14. Bahasa',
            body: [
                {
                    type: 'p',
                    text: 'Notis ini tersedia dalam Bahasa Inggeris dan Bahasa Melayu. Jika terdapat perbezaan antara kedua-dua versi, versi Bahasa Inggeris akan terpakai.',
                },
            ],
        },
    ],
};

export const placeholdersPresent = countPlaceholdersInDoc(en) || countPlaceholdersInDoc(ms);
export const LEGAL_PLACEHOLDERS_PRESENT = placeholdersPresent;

export const privacyDocModule: LegalDocumentModule = {
    version,
    lastUpdated,
    status,
    en,
    ms,
    placeholdersPresent,
};

export const isPublishable = () => isDocumentPublishable(privacyDocModule);
