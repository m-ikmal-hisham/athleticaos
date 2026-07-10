
import fs from 'fs';
import path from 'path';
import * as PhosphorIcons from '@phosphor-icons/react';

// Get all keys from the library
const availableIcons = new Set(Object.keys(PhosphorIcons));
const filesToCheck = [
    'src/components/MatchControls.tsx',
    'src/components/Navbar.tsx',
    'src/components/TournamentPill.tsx',
    'src/components/roster/RosterManagement.tsx',
    'src/components/roster/PlayerSelectionModal.tsx',
    'src/components/roster/SuspensionWidget.tsx',
    'src/components/RecentActivityWidget.tsx',
    'src/components/content/GroupingEditor.tsx',
    'src/components/modals/OrganisationModal.tsx',
    'src/components/modals/ConfirmDeleteModal.tsx',
    'src/components/modals/TournamentModal.tsx',
    'src/components/common/ShareButton.tsx',
    'src/components/MatchLineupEditor.tsx',
    'src/components/ThemeToggle.tsx',
    'src/components/Sidebar.tsx',
    'src/components/Modal.tsx',
    'src/components/Toast.tsx',
    'src/components/EmptyState.tsx',
    'src/components/ProfilePopup.tsx',
    'src/layouts/PublicLayout.tsx',
    'src/layouts/AppLayout.tsx',
    'src/pages/dashboard/tournament-tabs/TournamentMatches.tsx',
    'src/pages/dashboard/tournament-tabs/TournamentFormat.tsx',
    'src/pages/dashboard/tournament-tabs/TournamentTeams.tsx',
    'src/pages/dashboard/Organisations.tsx',
    'src/pages/dashboard/players/PlayerDetailDrawer.tsx',
    'src/pages/dashboard/TournamentDetail.tsx',
    'src/pages/dashboard/DashboardHome.tsx',
    'src/pages/dashboard/Players.tsx',
    'src/pages/dashboard/competitions/Seasons.tsx',
    'src/pages/dashboard/competitions/SeasonDetail.tsx',
    'src/pages/dashboard/Activity.tsx',
    'src/pages/dashboard/organisations/BrandingSettings.tsx',
    'src/pages/dashboard/MatchDetail.tsx',
    'src/pages/dashboard/Profile.tsx',
    'src/pages/dashboard/Stats.tsx',
    'src/pages/dashboard/Users.tsx',
    'src/pages/dashboard/Tournaments.tsx',
    'src/pages/dashboard/teams/TeamDetail.tsx',
    'src/pages/dashboard/Matches.tsx',
    'src/pages/dashboard/TournamentRosters.tsx',
    'src/pages/dashboard/Teams.tsx',
    'src/pages/public/TournamentsList.tsx',
    'src/pages/public/Home.tsx',
    'src/pages/public/TournamentDetail.tsx',
    'src/pages/public/components/PublicTournamentBracket.tsx',
    'src/pages/public/MatchCenter.tsx',
    'src/pages/UnauthorizedPage.tsx',
    'src/pages/users/UsersListPage.tsx',
    'src/pages/NotFoundPage.tsx'
];

const failures = [];

filesToCheck.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const importRegex = /import \{([^}]+)\} from ['"]@phosphor-icons\/react['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const imports = match[1].split(',').map(s => s.trim());
            imports.forEach(imp => {
                // Handle alias: Activity as ActivityIcon
                const parts = imp.split(' as ');
                const iconName = parts[0];
                if (!availableIcons.has(iconName)) {
                    failures.push({ file, icon: iconName });
                }
            });
        }
    } catch (e) {
        // console.error(`Error reading ${file}`, e);
    }
});

console.log(JSON.stringify(failures, null, 2));
