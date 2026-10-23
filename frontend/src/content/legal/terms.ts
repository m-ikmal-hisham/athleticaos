import type { LegalDoc, LegalDocStatus, LegalDocumentModule } from './types';
import { countPlaceholdersInDoc, isDocumentPublishable } from './types';

export const version = '1.0';
export const lastUpdated = '2026-10-15';
export const status: LegalDocStatus = 'draft';

export const en: LegalDoc = {
    title: 'AthleticaOS Terms of Use',
    sections: [
        {
            id: 'about-these-terms',
            heading: '1. About these terms',
            body: [
                {
                    type: 'p',
                    text: 'These terms apply to www.athleticaos.com (public site) and app.athleticaos.com (organiser and administrator app), run by AthleticaOS in partnership with Ragbi Online, which operates the platform until the AthleticaOS operating company completes its registration. By using the site you agree to them. The Privacy Notice explains how we handle personal data.',
                },
            ],
        },
        {
            id: 'the-public-site',
            heading: '2. The public site',
            body: [
                {
                    type: 'ul',
                    items: [
                        "Fixtures, results, standings, statistics and profiles are provided for information. We work to keep them accurate, but results are entered by organisers and scorers and can be corrected after a match. **The organiser's official decision prevails** over anything shown on the site.",
                        'Live scores may be delayed or interrupted.',
                        "You may view and share links to pages. Do not copy the site's data in bulk, scrape it automatically, or use it commercially without our written permission.",
                    ],
                },
            ],
        },
        {
            id: 'accounts',
            heading: '3. Accounts (organisers and administrators)',
            body: [
                {
                    type: 'ul',
                    items: [
                        'Accounts are created for authorised people of an organisation or tournament. Keep your password private; you are responsible for what is done with your account. Tell us at once if you think it has been misused.',
                        "Only enter data you are allowed to enter. Before adding players, officials or staff, the organiser must have their consent — and a parent's or guardian's consent for anyone under 18 — for the uses in the Privacy Notice, including publication of results and profiles.",
                        "Data must be accurate. Do not upload anything unlawful, offensive, or that infringes someone else's rights (including photos and logos you do not have permission to use).",
                        'We may suspend an account that breaks these terms or puts the platform or other users at risk.',
                    ],
                },
            ],
        },
        {
            id: 'content-you-provide',
            heading: '4. Content you provide',
            body: [
                {
                    type: 'p',
                    text: 'Organisers keep ownership of their logos, photos and data. You give us permission to host, display and process it to run the platform and publish the competition (including after the competition ends, as its historical record).',
                },
            ],
        },
        {
            id: 'our-content',
            heading: '5. Our content',
            body: [
                {
                    type: 'p',
                    text: 'The AthleticaOS name, logo, design and software are held by Ragbi Online on behalf of AthleticaOS until the AthleticaOS operating company completes its registration. Partner and organiser names and logos belong to their owners.',
                },
            ],
        },
        {
            id: 'availability-and-changes',
            heading: '6. Availability and changes',
            body: [
                {
                    type: 'p',
                    text: 'We may change, pause or stop features (for example during maintenance). We will try to give notice of planned maintenance, and avoid match days.',
                },
            ],
        },
        {
            id: 'liability',
            heading: '7. Liability',
            body: [
                {
                    type: 'p',
                    text: 'The site is provided "as is". To the extent the law allows, we are not liable for indirect losses or for losses caused by inaccurate data entered by others, delays in live scores, or service interruptions. Nothing in these terms limits rights you have under Malaysian law that cannot be limited.',
                },
            ],
        },
        {
            id: 'changes-to-these-terms',
            heading: '8. Changes to these terms',
            body: [
                {
                    type: 'p',
                    text: 'We may update these terms; the date at the top shows the latest version. Continuing to use the site after a change means you accept it.',
                },
            ],
        },
        {
            id: 'law',
            heading: '9. Law',
            body: [
                {
                    type: 'p',
                    text: 'These terms are governed by the laws of Malaysia.',
                },
            ],
        },
        {
            id: 'language',
            heading: '10. Language',
            body: [
                {
                    type: 'p',
                    text: 'These terms are available in English and Bahasa Melayu. If the two versions differ, the English version applies.',
                },
            ],
        },
        {
            id: 'contact',
            heading: '11. Contact',
            body: [
                {
                    type: 'p',
                    text: 'contact@athleticaos.com or the contact form on www.athleticaos.com.',
                },
            ],
        },
    ],
};

export const ms: LegalDoc = {
    title: 'Terma Penggunaan AthleticaOS',
    sections: [
        {
            id: 'about-these-terms',
            heading: '1. Tentang terma ini',
            body: [
                {
                    type: 'p',
                    text: 'Terma ini terpakai kepada www.athleticaos.com (laman awam) dan app.athleticaos.com (aplikasi penganjur dan pentadbir), yang dikendalikan oleh AthleticaOS dengan kerjasama Ragbi Online, yang mengendalikan platform ini sehingga syarikat pengendali AthleticaOS selesai didaftarkan. Dengan menggunakan laman ini, anda bersetuju dengan terma ini. Notis Privasi menerangkan cara kami mengendalikan data peribadi.',
                },
            ],
        },
        {
            id: 'the-public-site',
            heading: '2. Laman awam',
            body: [
                {
                    type: 'ul',
                    items: [
                        'Jadual perlawanan, keputusan, kedudukan, statistik dan profil disediakan sebagai maklumat. Kami berusaha memastikannya tepat, tetapi keputusan dimasukkan oleh penganjur dan pencatat mata dan boleh dibetulkan selepas perlawanan. **Keputusan rasmi penganjur adalah muktamad** berbanding apa-apa yang dipaparkan di laman ini.',
                        'Mata secara langsung mungkin tertangguh atau terganggu.',
                        'Anda boleh melihat dan berkongsi pautan ke halaman. Jangan menyalin data laman ini secara pukal, mengikisnya secara automatik, atau menggunakannya secara komersial tanpa kebenaran bertulis kami.',
                    ],
                },
            ],
        },
        {
            id: 'accounts',
            heading: '3. Akaun (penganjur dan pentadbir)',
            body: [
                {
                    type: 'ul',
                    items: [
                        'Akaun diwujudkan untuk individu yang diberi kuasa oleh organisasi atau kejohanan. Rahsiakan kata laluan anda; anda bertanggungjawab atas apa yang dilakukan menggunakan akaun anda. Maklumkan kami segera jika anda rasa akaun anda telah disalahgunakan.',
                        'Masukkan hanya data yang anda dibenarkan masukkan. Sebelum menambah pemain, pegawai atau kakitangan, penganjur mesti mendapatkan persetujuan mereka — dan persetujuan ibu bapa atau penjaga bagi sesiapa yang berumur bawah 18 tahun — untuk kegunaan yang dinyatakan dalam Notis Privasi, termasuk penerbitan keputusan dan profil.',
                        'Data mesti tepat. Jangan memuat naik apa-apa yang menyalahi undang-undang, menyinggung perasaan, atau melanggar hak orang lain (termasuk gambar dan logo yang anda tidak mempunyai kebenaran untuk digunakan).',
                        'Kami boleh menggantung akaun yang melanggar terma ini atau membahayakan platform atau pengguna lain.',
                    ],
                },
            ],
        },
        {
            id: 'content-you-provide',
            heading: '4. Kandungan yang anda berikan',
            body: [
                {
                    type: 'p',
                    text: 'Penganjur kekal sebagai pemilik logo, gambar dan data mereka. Anda memberi kami kebenaran untuk mengehos, memaparkan dan memproses kandungan tersebut bagi mengendalikan platform dan menerbitkan pertandingan (termasuk selepas pertandingan tamat, sebagai rekod sejarahnya).',
                },
            ],
        },
        {
            id: 'our-content',
            heading: '5. Kandungan kami',
            body: [
                {
                    type: 'p',
                    text: 'Nama, logo, reka bentuk dan perisian AthleticaOS dipegang oleh Ragbi Online bagi pihak AthleticaOS sehingga syarikat pengendali AthleticaOS selesai didaftarkan. Nama dan logo rakan kongsi serta penganjur adalah milik pemilik masing-masing.',
                },
            ],
        },
        {
            id: 'availability-and-changes',
            heading: '6. Ketersediaan dan perubahan',
            body: [
                {
                    type: 'p',
                    text: 'Kami boleh mengubah, menjeda atau menghentikan ciri (contohnya semasa penyelenggaraan). Kami akan cuba memberi notis tentang penyelenggaraan yang dirancang dan mengelakkan hari perlawanan.',
                },
            ],
        },
        {
            id: 'liability',
            heading: '7. Liabiliti',
            body: [
                {
                    type: 'p',
                    text: 'Laman ini disediakan "sebagaimana adanya". Setakat yang dibenarkan oleh undang-undang, kami tidak bertanggungjawab atas kerugian tidak langsung atau kerugian akibat data tidak tepat yang dimasukkan oleh pihak lain, kelewatan mata secara langsung, atau gangguan perkhidmatan. Tiada apa-apa dalam terma ini yang mengehadkan hak anda di bawah undang-undang Malaysia yang tidak boleh dihadkan.',
                },
            ],
        },
        {
            id: 'changes-to-these-terms',
            heading: '8. Perubahan pada terma ini',
            body: [
                {
                    type: 'p',
                    text: 'Kami boleh mengemas kini terma ini; tarikh di bahagian atas menunjukkan versi terkini. Penggunaan berterusan laman ini selepas sesuatu perubahan bermakna anda menerimanya.',
                },
            ],
        },
        {
            id: 'law',
            heading: '9. Undang-undang',
            body: [
                {
                    type: 'p',
                    text: 'Terma ini ditadbir oleh undang-undang Malaysia.',
                },
            ],
        },
        {
            id: 'language',
            heading: '10. Bahasa',
            body: [
                {
                    type: 'p',
                    text: 'Terma ini tersedia dalam Bahasa Inggeris dan Bahasa Melayu. Jika terdapat perbezaan, versi Bahasa Inggeris akan terpakai.',
                },
            ],
        },
        {
            id: 'contact',
            heading: '11. Hubungi kami',
            body: [
                {
                    type: 'p',
                    text: 'contact@athleticaos.com atau borang hubungi di www.athleticaos.com.',
                },
            ],
        },
    ],
};

export const placeholdersPresent = countPlaceholdersInDoc(en) || countPlaceholdersInDoc(ms);
export const LEGAL_PLACEHOLDERS_PRESENT = placeholdersPresent;

export const termsDocModule: LegalDocumentModule = {
    version,
    lastUpdated,
    status,
    en,
    ms,
    placeholdersPresent,
};

export const isPublishable = () => isDocumentPublishable(termsDocModule);
