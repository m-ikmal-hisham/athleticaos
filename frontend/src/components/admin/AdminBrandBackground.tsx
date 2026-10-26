import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

export function AdminBrandBackground() {
    const theme = useEffectiveTheme();
    const src =
        theme === 'dark'
            ? '/brand/admin-bg-ascent2-dark.svg'
            : '/brand/admin-bg-ascent2-light.svg';

    return (
        <img
            src={src}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="fixed inset-0 -z-10 w-full h-full object-cover pointer-events-none select-none print:hidden contrast-more:hidden"
        />
    );
}

export const BrandBackground = AdminBrandBackground;
export default AdminBrandBackground;

